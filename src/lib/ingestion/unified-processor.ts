/**
 * Unified Ingestion Engine with Zero-Configuration Auto-Mapping
 * High-Performance Bulk Architecture (Batch Multi-Row + In-Memory Caching)
 * 
 * Flow:
 * 1. Reads Header Row (Row 1)
 * 2. Auto-detects template type (DataAgent, MasterProduksi, MasterClaim)
 * 3. Preloads Branches & Agents into In-Memory Cache (0ms lookups)
 * 4. Streaming Batch Chunks (1000 rows/chunk) with Bulk Pre-fetch & Multi-Row Inserts
 * 5. Real-Time Live Progress updates to upload_batches table
 */

import ExcelJS from 'exceljs';
import { db } from '@/db';
import { uploadBatches, uploadRowLogs, agents, productionRecords, claims } from '@/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { autoDetectTemplate, disambiguateHeaders } from './auto-detector';
import { mapDataAgentRow, mapMasterProduksiRow, mapMasterClaimRow } from './template-mappers';
import { getOrCreateBranch, getOrCreateAgentPlaceholder, ProvisioningCache } from './auto-provision';
import { executeSelfHealingPass } from './self-healing';
import { extractCellValue } from './sanitizer';
import { parsePolicyNo } from './policy-parser';

const BATCH_SIZE = 1000;

export interface IngestionJobResult {
  batchId: string;
  detectedType: string;
  totalRows: number;
  successRows: number;
  warningRows: number;
  failedRows: number;
  skippedRows: number;
  updatedRows?: number;
  status: string;
  smartMapping?: {
    mappedCount: number;
    fallbackCount: number;
    unmappedCount: number;
    columnMapping: Record<string, string>;
    fallbackColumns: Record<string, string>;
    unmappedColumns: string[];
  };
  warningDetails: {
    pendingUplinesCount: number;
    unregisteredAgentsCount: number;
    sampleCodes: string[];
    explanation: string;
  };
}

export async function processUploadedExcelFile(
  filePath: string,
  fileName: string,
  fileSize: number,
  userId: string | null
): Promise<IngestionJobResult> {
  // 1. Initial Batch Record (Status: PROCESSING)
  const [batch] = await db
    .insert(uploadBatches)
    .values({
      batchType: 'DATA_AGENT', // Placeholder until auto-detected
      fileName,
      fileSize,
      uploadedBy: userId,
      status: 'PROCESSING',
      startedAt: new Date(),
    })
    .returning();

  let detectedType: string | null = null;
  let detectedColumnMapping: Record<string, string> = {};
  let detectedFallbacks: Record<string, string> = {};
  let detectedUnmapped: string[] = [];
  let headers: string[] = [];
  let totalRows = 0;
  let successRows = 0;
  let warningRows = 0;
  let failedRows = 0;
  let skippedRows = 0;
  let updatedRows = 0;
  const sampleWarningCodes = new Set<string>();

  try {
    // 2. Preload In-Memory Provisioning Cache (Eliminates 100k+ DB queries)
    const provisioningCache = new ProvisioningCache();
    await provisioningCache.init();

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      styles: 'ignore',
      worksheets: 'emit',
    });

    let currentChunk: Array<{ rowNumber: number; data: Record<string, unknown> }> = [];

    for await (const worksheetReader of workbookReader) {
      for await (const row of worksheetReader) {
        // Step 2: Read Header Row & Smart Auto-Detect
        if (row.number === 1) {
          const rawHeaders = (row.values as unknown[])
            .slice(1)
            .map((v) => String(extractCellValue(v) ?? '').trim());

          headers = disambiguateHeaders(rawHeaders);

          const detection = autoDetectTemplate(headers);

          if (!detection.isValid || !detection.detectedType) {
            throw new Error(detection.errorMessage || 'Gagal mendeteksi template file sumber.');
          }

          detectedType = detection.detectedType;
          detectedColumnMapping = detection.columnMapping;
          detectedFallbacks = detection.fallbackColumns;
          detectedUnmapped = detection.unmappedColumns;

          // Update batch with detected type
          await db
            .update(uploadBatches)
            .set({ batchType: detectedType as any })
            .where(eq(uploadBatches.id, batch.id));

          continue;
        }

        totalRows++;
        const rowVals = (row.values as unknown[]).slice(1);
        const rowObj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          rowObj[h] = extractCellValue(rowVals[i]);
        });

        currentChunk.push({ rowNumber: row.number, data: rowObj });

        // Flush chunk when batch size reached
        if (currentChunk.length >= BATCH_SIZE) {
          const stats = await processChunk(
            currentChunk,
            batch.id,
            detectedType!,
            userId,
            sampleWarningCodes,
            provisioningCache,
            detectedColumnMapping
          );
          successRows += stats.success;
          warningRows += stats.warning;
          failedRows += stats.failed;
          skippedRows += stats.skipped;
          updatedRows += stats.updated;
          currentChunk = [];

          // Live Progress Update to DB after each chunk
          await db
            .update(uploadBatches)
            .set({
              totalRows,
              processedRows: successRows + warningRows + failedRows + skippedRows,
              successRows,
              warningRows,
              failedRows,
              skippedRows,
              updatedAt: new Date(),
            })
            .where(eq(uploadBatches.id, batch.id));
        }
      }
      break; // Process only first sheet
    }

    // Process remainder chunk
    if (currentChunk.length > 0) {
      const stats = await processChunk(
        currentChunk,
        batch.id,
        detectedType!,
        userId,
        sampleWarningCodes,
        provisioningCache,
        detectedColumnMapping
      );
      successRows += stats.success;
      warningRows += stats.warning;
      failedRows += stats.failed;
      skippedRows += stats.skipped;
      updatedRows += stats.updated;
      currentChunk = [];
    }

    // Step 3: Run Self-Healing if DataAgent was uploaded
    if (detectedType === 'DATA_AGENT') {
      await executeSelfHealingPass();
    }

    const finalStatus = failedRows === 0 
      ? (warningRows > 0 ? 'PARTIAL_SUCCESS' : 'COMPLETED')
      : (successRows > 0 ? 'PARTIAL_SUCCESS' : 'FAILED');

    // Build specific warning explanation
    let warningExplanation = '';
    const sampleArray = Array.from(sampleWarningCodes).slice(0, 5);

    if (detectedType === 'DATA_AGENT' && warningRows > 0) {
      warningExplanation = `Terdapat ${warningRows} agen dengan Kode Upline yang belum terdaftar di database (${sampleArray.join(', ')}). Data agen tetap disimpan dengan status PENDING_UPLINE dan akan otomatis terhubung saat data upline diunggah.`;
    } else if (detectedType === 'MASTER_PRODUKSI' && warningRows > 0) {
      warningExplanation = `Terdapat ${warningRows} transaksi polis dengan Agent ID yang belum terdaftar di Master Agen (${sampleArray.join(', ')}). Sistem otomatis membuatkan agen placeholder (UNREGISTERED_IN_MASTER) agar seluruh data premi, komisi, dan nomor polis tetap tersimpan aman dan tidak hilang.`;
    } else if (detectedType === 'MASTER_CLAIM' && warningRows > 0) {
      warningExplanation = `Terdapat ${warningRows} transaksi klaim dengan Agent ID yang belum terdaftar di Master Agen (${sampleArray.join(', ')}). Sistem otomatis membuatkan agen placeholder (UNREGISTERED_IN_MASTER) agar nilai klaim dan loss ratio tetap tercatat lengkap.`;
    }

    await db
      .update(uploadBatches)
      .set({
        status: finalStatus,
        totalRows,
        processedRows: successRows + warningRows + failedRows + skippedRows,
        successRows,
        warningRows,
        failedRows,
        skippedRows,
        completedAt: new Date(),
        updatedAt: new Date(),
        summary: {
          pendingUplinesCount: detectedType === 'DATA_AGENT' ? warningRows : 0,
          autoProvisionedBranchesCount: 0,
          autoProvisionedAgentsCount: detectedType !== 'DATA_AGENT' ? warningRows : 0,
          skippedDuplicateRowsCount: skippedRows,
          updatedEndorsementRowsCount: updatedRows,
          mappedColumnsCount: Object.keys(detectedColumnMapping).length,
          fallbackColumns: detectedFallbacks,
          unmappedColumns: detectedUnmapped,
          warnings: sampleArray.map((code) => ({
            code: 'AUTO_PROVISION_OR_PENDING',
            message: warningExplanation,
            sampleRow: 0,
          })),
        },
      })
      .where(eq(uploadBatches.id, batch.id));

    return {
      batchId: batch.id,
      detectedType: detectedType || 'UNKNOWN',
      totalRows,
      successRows,
      warningRows,
      failedRows,
      skippedRows,
      updatedRows,
      status: finalStatus,
      smartMapping: {
        mappedCount: Object.keys(detectedColumnMapping).length,
        fallbackCount: Object.keys(detectedFallbacks).length,
        unmappedCount: detectedUnmapped.length,
        columnMapping: detectedColumnMapping,
        fallbackColumns: detectedFallbacks,
        unmappedColumns: detectedUnmapped,
      },
      warningDetails: {
        pendingUplinesCount: detectedType === 'DATA_AGENT' ? warningRows : 0,
        unregisteredAgentsCount: detectedType !== 'DATA_AGENT' ? warningRows : 0,
        sampleCodes: sampleArray,
        explanation: warningExplanation,
      },
    };
  } catch (error: any) {
    await db
      .update(uploadBatches)
      .set({
        status: 'FAILED',
        totalRows,
        failedRows: totalRows || 1,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(uploadBatches.id, batch.id));

    throw error;
  }
}

/**
 * Process a chunk of rows with High-Performance Bulk Multi-Row Execution
 */
async function processChunk(
  chunk: Array<{ rowNumber: number; data: Record<string, unknown> }>,
  batchId: string,
  type: string,
  userId: string | null,
  sampleWarningCodes: Set<string>,
  provisioningCache: ProvisioningCache,
  columnMapping?: Record<string, string>
): Promise<{ success: number; warning: number; failed: number; skipped: number; updated: number }> {
  let success = 0;
  let warning = 0;
  let failed = 0;
  let skipped = 0;
  let updated = 0;

  const logsToInsert: Array<typeof uploadRowLogs.$inferInsert> = [];

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // A. TEMPLATE 1: DATA_AGENT
    // ═════════════════════════════════════════════════════════════════════════
    if (type === 'DATA_AGENT') {
      for (const item of chunk) {
        try {
          const mapping = mapDataAgentRow(item.data, item.rowNumber, columnMapping);
          if (!mapping.success || !mapping.data) {
            failed++;
            logsToInsert.push({
              batchId,
              rowNumber: item.rowNumber,
              status: 'ERROR',
              rawData: item.data,
              errorMessage: mapping.error,
            });
            continue;
          }

          const d = mapping.data;
          const branchId = await provisioningCache.getOrCreateBranch(d.rawBranchName);

          let uplineStatus: 'LINKED' | 'PENDING_UPLINE' | 'ROOT' = 'ROOT';
          let parentId: string | null = null;
          let isWarning = false;
          let warnMsg: string | null = null;

          if (d.uplineAgentCode) {
            const upline = await db
              .select({ id: agents.id, materializedPath: agents.materializedPath, depth: agents.depth })
              .from(agents)
              .where(eq(agents.agentCode, d.uplineAgentCode))
              .limit(1);

            if (upline.length > 0) {
              uplineStatus = 'LINKED';
              parentId = upline[0].id;
            } else {
              uplineStatus = 'PENDING_UPLINE';
              isWarning = true;
              sampleWarningCodes.add(d.uplineAgentCode);
              warnMsg = `Kode Upline '${d.uplineAgentCode}' belum terdaftar di master. Data agen '${d.agentCode}' tetap disimpan dengan status PENDING_UPLINE.`;
            }
          }

          await db
            .insert(agents)
            .values({
              agentCode: d.agentCode,
              name: d.name,
              profId: d.profId,
              statusKeagenan: d.statusKeagenan,
              uplineAgentCode: d.uplineAgentCode,
              peringkat: d.peringkat,
              rawBranchName: d.rawBranchName,
              branchId,
              parentId,
              uplineStatus,
              materializedPath: `/${d.agentCode}`,
              depth: 0,
              isPlaceholder: false,
              createdBy: userId,
              updatedBy: userId,
            })
            .onConflictDoUpdate({
              target: agents.agentCode,
              set: {
                name: sql`EXCLUDED.name`,
                profId: sql`EXCLUDED.prof_id`,
                statusKeagenan: sql`EXCLUDED.status_keagenan`,
                uplineAgentCode: sql`EXCLUDED.upline_agent_code`,
                peringkat: sql`EXCLUDED.peringkat`,
                rawBranchName: sql`EXCLUDED.raw_branch_name`,
                branchId: sql`EXCLUDED.branch_id`,
                parentId: sql`EXCLUDED.parent_id`,
                uplineStatus: sql`EXCLUDED.upline_status`,
                isPlaceholder: false,
                updatedAt: sql`NOW()`,
              },
            });

          if (isWarning) {
            warning++;
            logsToInsert.push({
              batchId,
              rowNumber: item.rowNumber,
              status: 'WARNING',
              rawData: item.data,
              normalizedData: d as any,
              warningMessage: warnMsg,
            });
          } else {
            success++;
            logsToInsert.push({
              batchId,
              rowNumber: item.rowNumber,
              status: 'SUCCESS',
              rawData: item.data,
              normalizedData: d as any,
            });
          }
        } catch (err: any) {
          failed++;
          logsToInsert.push({
            batchId,
            rowNumber: item.rowNumber,
            status: 'ERROR',
            rawData: item.data,
            errorMessage: err.message || String(err),
          });
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // B. TEMPLATE 2: MASTER_PRODUKSI (HIGH-SPEED BULK ENGINE)
    // ═════════════════════════════════════════════════════════════════════════
    else if (type === 'MASTER_PRODUKSI') {
      const validRows: Array<{
        item: { rowNumber: number; data: Record<string, unknown> };
        d: NonNullable<ReturnType<typeof mapMasterProduksiRow>['data']>;
      }> = [];

      for (const item of chunk) {
        const mapping = mapMasterProduksiRow(item.data, item.rowNumber, columnMapping);
        if (!mapping.success || !mapping.data) {
          failed++;
          logsToInsert.push({
            batchId,
            rowNumber: item.rowNumber,
            status: 'ERROR',
            rawData: item.data,
            errorMessage: mapping.error,
          });
          continue;
        }
        validRows.push({ item, d: mapping.data });
      }

      if (validRows.length > 0) {
        // 1. Bulk Pre-fetch existing policies in 1 single query for the entire chunk
        const chunkPolicyNos = Array.from(new Set(validRows.map((r) => r.d.policyNo).filter(Boolean)));
        
        const existingList = chunkPolicyNos.length > 0
          ? await db
              .select({
                id: productionRecords.id,
                policyNo: productionRecords.policyNo,
                insuredName: productionRecords.insuredName,
                product: productionRecords.product,
                coverage: productionRecords.coverage,
                nilaiPremi: productionRecords.nilaiPremi,
                tsi: productionRecords.tsi,
                tsiInIdr: productionRecords.tsiInIdr,
                nilaiKomisi: productionRecords.nilaiKomisi,
                nilaiDiskon: productionRecords.nilaiDiskon,
                nilaiAkusisi: productionRecords.nilaiAkusisi,
                objectDetails: productionRecords.objectDetails,
                startPeriod: productionRecords.startPeriod,
                endPeriod: productionRecords.endPeriod,
              })
              .from(productionRecords)
              .where(
                and(
                  inArray(productionRecords.policyNo, chunkPolicyNos),
                  sql`${productionRecords.deletedAt} IS NULL`
                )
              )
          : [];

        // In-Memory Grouping by PolicyNo
        const existingPoliciesMap = new Map<string, Array<typeof existingList[0]>>();
        for (const p of existingList) {
          const list = existingPoliciesMap.get(p.policyNo) || [];
          list.push(p);
          existingPoliciesMap.set(p.policyNo, list);
        }

        const recordsToInsert: (typeof productionRecords.$inferInsert)[] = [];

        // 2. Process all mapped rows in-memory
        for (const { item, d } of validRows) {
          try {
            let branchId = await provisioningCache.getOrCreateBranch(d.rawBranch);
            if (!branchId) {
              const parsedPol = parsePolicyNo(d.policyNo);
              if (parsedPol?.branchCode) {
                branchId = await provisioningCache.getOrCreateBranch(parsedPol.branchCode);
              }
            }

            let finalAgentId: string | null = null;
            let finalBranchId: string | null = null;
            let isAutoProvAgent = false;

            if (d.isMm) {
              const agentHolder = await provisioningCache.getOrCreateAgentPlaceholder(d.sourceAgentId, d.rawBranch);
              finalAgentId = agentHolder.agentId;
              finalBranchId = branchId || agentHolder.branchId || null;
              isAutoProvAgent = agentHolder.wasAutoProvisioned;
            } else {
              finalAgentId = null;
              finalBranchId = branchId || null;
            }

            const existingPolicies = existingPoliciesMap.get(d.policyNo) || [];

            if (existingPolicies.length > 0) {
              // B. Endorsement & Deduplication Check:
              const totalExistingPremi = existingPolicies.reduce((sum, p) => sum + parseFloat(p.nilaiPremi || '0'), 0);
              const totalExistingTsi = existingPolicies.reduce((sum, p) => sum + parseFloat(p.tsi || '0'), 0);
              const totalExistingTsiInIdr = existingPolicies.reduce((sum, p) => sum + parseFloat(p.tsiInIdr || '0'), 0);
              const totalExistingKomisi = existingPolicies.reduce((sum, p) => sum + parseFloat(p.nilaiKomisi || '0'), 0);
              const totalExistingDiskon = existingPolicies.reduce((sum, p) => sum + parseFloat(p.nilaiDiskon || '0'), 0);
              const totalExistingAkusisi = existingPolicies.reduce((sum, p) => sum + parseFloat(p.nilaiAkusisi || '0'), 0);

              const newPremi = parseFloat(d.nilaiPremi || '0');
              const newTsi = parseFloat(d.tsi || '0');
              const newTsiInIdr = parseFloat(d.tsiInIdr || '0');
              const newKomisi = parseFloat(d.nilaiKomisi || '0');
              const newDiskon = parseFloat(d.nilaiDiskon || '0');
              const newAkusisi = parseFloat(d.nilaiAkusisi || '0');

              const deltaPremi = newPremi - totalExistingPremi;
              const deltaTsi = newTsi - totalExistingTsi;
              const deltaTsiInIdr = newTsiInIdr - totalExistingTsiInIdr;
              const deltaKomisi = newKomisi - totalExistingKomisi;
              const deltaDiskon = newDiskon - totalExistingDiskon;
              const deltaAkusisi = newAkusisi - totalExistingAkusisi;

              const isNominalChanged =
                Math.abs(deltaPremi) > 0.01 ||
                Math.abs(deltaTsi) > 0.01 ||
                Math.abs(deltaKomisi) > 0.01;

              const latestPolicy = existingPolicies[existingPolicies.length - 1];
              const isTextDifferent =
                (latestPolicy.insuredName || '').trim().toLowerCase() !== (d.insuredName || '').trim().toLowerCase() ||
                (latestPolicy.product || '').trim().toLowerCase() !== (d.product || '').trim().toLowerCase() ||
                (latestPolicy.coverage || '').trim().toLowerCase() !== (d.coverage || '').trim().toLowerCase();

              const isObjectDifferent = Object.keys(d.objectDetails || {}).some((k) => {
                const v1 = String((latestPolicy.objectDetails as any)?.[k] ?? '').trim().toLowerCase();
                const v2 = String((d.objectDetails as any)?.[k] ?? '').trim().toLowerCase();
                return v1 !== v2;
              });

              const isNonNominalChanged = isTextDifferent || isObjectDifferent;

              const isDateDifferent =
                Boolean(d.startPeriod && String(latestPolicy.startPeriod || '') !== String(d.startPeriod)) ||
                Boolean(d.endPeriod && String(latestPolicy.endPeriod || '') !== String(d.endPeriod));

              // Exact Duplicate -> SKIP!
              if (!isNominalChanged && !isNonNominalChanged && !isDateDifferent) {
                skipped++;
                logsToInsert.push({
                  batchId,
                  rowNumber: item.rowNumber,
                  status: 'SKIPPED',
                  rawData: item.data,
                  normalizedData: d as any,
                  warningMessage: `Data polis ${d.policyNo} sama persis dengan yang sudah tercatat di sistem. Baris dilewati untuk mencegah duplikasi.`,
                });
                continue;
              }

              // In-place correction for dates if nominal and text are identical
              if (!isNominalChanged && !isNonNominalChanged && isDateDifferent) {
                await db
                  .update(productionRecords)
                  .set({
                    startPeriod: d.startPeriod as any,
                    endPeriod: d.endPeriod as any,
                    updatedAt: new Date(),
                  })
                  .where(eq(productionRecords.id, latestPolicy.id));

                updated++;
                success++;
                logsToInsert.push({
                  batchId,
                  rowNumber: item.rowNumber,
                  status: 'SUCCESS',
                  rawData: item.data,
                  normalizedData: d as any,
                  warningMessage: `Pembaruan periode polis ${d.policyNo}: masa berlaku diperbarui menjadi ${d.startPeriod || '-'} s/d ${d.endPeriod || '-'}.`,
                });
                continue;
              }

              if (isNominalChanged) {
                // Endorsement Nominal (selisih/delta)
                const endorsementRecord: typeof productionRecords.$inferInsert = {
                  agentId: finalAgentId,
                  sourceAgentId: d.sourceAgentId,
                  sourceBatchId: batchId,
                  branchId: finalBranchId,
                  isMm: d.isMm,
                  bulan: d.bulan,
                  period: d.period as any,
                  policyStatus: 'Endorsement',
                  profileId: d.profileId,
                  agentName: d.agentName,
                  agentStatus: d.agentStatus,
                  rawBranch: d.rawBranch,
                  representative: d.representative,
                  product: d.product,
                  coverage: d.coverage,
                  renewed: d.renewed,
                  prevPolicy: d.policyNo,
                  spauType: d.spauType,
                  spauNo: d.spauNo,
                  policyNo: d.policyNo,
                  startPeriod: d.startPeriod as any,
                  endPeriod: d.endPeriod as any,
                  insuredName: d.insuredName,
                  currencyTsi: d.currencyTsi,
                  rateTsi: d.rateTsi as any,
                  tsi: deltaTsi.toFixed(2),
                  tsiInIdr: deltaTsiInIdr.toFixed(2),
                  nilaiPremi: deltaPremi.toFixed(2),
                  nilaiKomisi: deltaKomisi.toFixed(2),
                  nilaiDiskon: deltaDiskon.toFixed(2),
                  nilaiAkusisi: deltaAkusisi.toFixed(2),
                  objectDetails: d.objectDetails,
                  metadata: {
                    ...(d.metadata || {}),
                    endorsementType: 'NOMINAL_DELTA',
                    originalFullPremi: d.nilaiPremi,
                    originalFullTsi: d.tsi,
                    deltaPremi: deltaPremi.toFixed(2),
                  },
                  createdBy: userId,
                };

                recordsToInsert.push(endorsementRecord);
                updated++;
                success++;

                // Register in memory map for subsequent rows in same batch
                existingPolicies.push({
                  ...endorsementRecord,
                  id: 'temp-' + item.rowNumber,
                } as any);

                logsToInsert.push({
                  batchId,
                  rowNumber: item.rowNumber,
                  status: 'SUCCESS',
                  rawData: item.data,
                  normalizedData: d as any,
                  warningMessage: `Endorsement nominal untuk polis ${d.policyNo}: dicatat selisih/delta premi sebesar Rp ${deltaPremi.toLocaleString('id-ID')}`,
                });
                continue;
              } else {
                // Endorsement Non-Nominal (perubahan nama/objek kendaraan, nominal delta = 0)
                const endorsementRecord: typeof productionRecords.$inferInsert = {
                  agentId: finalAgentId,
                  sourceAgentId: d.sourceAgentId,
                  sourceBatchId: batchId,
                  branchId: finalBranchId,
                  isMm: d.isMm,
                  bulan: d.bulan,
                  period: d.period as any,
                  policyStatus: 'Endorsement',
                  profileId: d.profileId,
                  agentName: d.agentName,
                  agentStatus: d.agentStatus,
                  rawBranch: d.rawBranch,
                  representative: d.representative,
                  product: d.product,
                  coverage: d.coverage,
                  renewed: d.renewed,
                  prevPolicy: d.policyNo,
                  spauType: d.spauType,
                  spauNo: d.spauNo,
                  policyNo: d.policyNo,
                  startPeriod: d.startPeriod as any,
                  endPeriod: d.endPeriod as any,
                  insuredName: d.insuredName,
                  currencyTsi: d.currencyTsi,
                  rateTsi: d.rateTsi as any,
                  tsi: '0.00',
                  tsiInIdr: '0.00',
                  nilaiPremi: '0.00',
                  nilaiKomisi: '0.00',
                  nilaiDiskon: '0.00',
                  nilaiAkusisi: '0.00',
                  objectDetails: d.objectDetails,
                  metadata: {
                    ...(d.metadata || {}),
                    endorsementType: 'NON_NOMINAL_UPDATE',
                  },
                  createdBy: userId,
                };

                recordsToInsert.push(endorsementRecord);
                updated++;
                success++;

                existingPolicies.push({
                  ...endorsementRecord,
                  id: 'temp-' + item.rowNumber,
                } as any);

                logsToInsert.push({
                  batchId,
                  rowNumber: item.rowNumber,
                  status: 'SUCCESS',
                  rawData: item.data,
                  normalizedData: d as any,
                  warningMessage: `Endorsement non-nominal untuk polis ${d.policyNo}: pembaruan rincian objek/keterangan dengan nominal Rp 0.`,
                });
                continue;
              }
            }

            // C. Polis Baru (Belum pernah ada)
            const newRecord: typeof productionRecords.$inferInsert = {
              agentId: finalAgentId,
              sourceAgentId: d.sourceAgentId,
              sourceBatchId: batchId,
              branchId: finalBranchId,
              isMm: d.isMm,
              bulan: d.bulan,
              period: d.period as any,
              policyStatus: d.policyStatus || 'New',
              profileId: d.profileId,
              agentName: d.agentName,
              agentStatus: d.agentStatus,
              rawBranch: d.rawBranch,
              representative: d.representative,
              product: d.product,
              coverage: d.coverage,
              renewed: d.renewed,
              prevPolicy: d.prevPolicy,
              spauType: d.spauType,
              spauNo: d.spauNo,
              policyNo: d.policyNo,
              startPeriod: d.startPeriod as any,
              endPeriod: d.endPeriod as any,
              insuredName: d.insuredName,
              currencyTsi: d.currencyTsi,
              rateTsi: d.rateTsi as any,
              tsi: d.tsi as any,
              tsiInIdr: d.tsiInIdr as any,
              nilaiPremi: d.nilaiPremi as any,
              nilaiKomisi: d.nilaiKomisi as any,
              nilaiDiskon: d.nilaiDiskon as any,
              nilaiAkusisi: d.nilaiAkusisi as any,
              objectDetails: d.objectDetails,
              metadata: d.metadata || {},
              createdBy: userId,
            };

            recordsToInsert.push(newRecord);
            success++;

            // Register in memory map
            existingPolicies.push({
              ...newRecord,
              id: 'temp-' + item.rowNumber,
            } as any);
            existingPoliciesMap.set(d.policyNo, existingPolicies);

            if (d.isMm && isAutoProvAgent) {
              warning++;
              sampleWarningCodes.add(d.sourceAgentId);
              logsToInsert.push({
                batchId,
                rowNumber: item.rowNumber,
                status: 'WARNING',
                rawData: item.data,
                normalizedData: d as any,
                warningMessage: `Agent ID '${d.sourceAgentId}' belum terdaftar di Master Agen. Dibuatkan placeholder UNREGISTERED_IN_MASTER agar transaksi premi & polis ${d.policyNo} tidak hilang.`,
              });
            } else {
              logsToInsert.push({
                batchId,
                rowNumber: item.rowNumber,
                status: 'SUCCESS',
                rawData: item.data,
                normalizedData: d as any,
                warningMessage: !d.isMm ? 'Polis Produksi Non-MM (tidak terikat Agen MM).' : undefined,
              });
            }
          } catch (err: any) {
            failed++;
            logsToInsert.push({
              batchId,
              rowNumber: item.rowNumber,
              status: 'ERROR',
              rawData: item.data,
              errorMessage: err.message || String(err),
            });
          }
        }

        // 3. Multi-Row Bulk Insert into production_records (slices of 500)
        if (recordsToInsert.length > 0) {
          for (let i = 0; i < recordsToInsert.length; i += 500) {
            await db.insert(productionRecords).values(recordsToInsert.slice(i, i + 500));
          }
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // C. TEMPLATE 3: MASTER_CLAIM (HIGH-SPEED BULK ENGINE)
    // ═════════════════════════════════════════════════════════════════════════
    else if (type === 'MASTER_CLAIM') {
      const validRows: Array<{
        item: { rowNumber: number; data: Record<string, unknown> };
        d: NonNullable<ReturnType<typeof mapMasterClaimRow>['data']>;
      }> = [];

      for (const item of chunk) {
        const mapping = mapMasterClaimRow(item.data, item.rowNumber, columnMapping);
        if (!mapping.success || !mapping.data) {
          failed++;
          logsToInsert.push({
            batchId,
            rowNumber: item.rowNumber,
            status: 'ERROR',
            rawData: item.data,
            errorMessage: mapping.error,
          });
          continue;
        }
        validRows.push({ item, d: mapping.data });
      }

      if (validRows.length > 0) {
        const chunkClaimNos = Array.from(new Set(validRows.map((r) => r.d.claimNo).filter(Boolean)));

        const existingClaimsList = chunkClaimNos.length > 0
          ? await db
              .select()
              .from(claims)
              .where(
                and(
                  inArray(claims.claimNo, chunkClaimNos),
                  sql`${claims.deletedAt} IS NULL`
                )
              )
          : [];

        const existingClaimsMap = new Map<string, Array<typeof existingClaimsList[0]>>();
        for (const c of existingClaimsList) {
          const arr = existingClaimsMap.get(c.claimNo) || [];
          arr.push(c);
          existingClaimsMap.set(c.claimNo, arr);
        }

        const claimsToInsert: (typeof claims.$inferInsert)[] = [];

        for (const { item, d } of validRows) {
          try {
            const list = existingClaimsMap.get(d.claimNo) || [];

            // Cek apakah ada baris yang identik 100% (duplikat data yang persis)
            const isExactDuplicate = list.some((existingClaim) => {
              const matchGross = Math.abs(parseFloat(existingClaim.grossClaim || '0') - parseFloat(d.grossClaim || '0')) < 0.01;
              const matchIndemnity = Math.abs(parseFloat(existingClaim.indemnity || '0') - parseFloat(d.indemnity || '0')) < 0.01;
              const matchDeductible = Math.abs(parseFloat(existingClaim.deductible || '0') - parseFloat(d.deductible || '0')) < 0.01;
              const matchSettlement = String(existingClaim.dateOfSettlement || '') === String(d.dateOfSettlement || '');
              const matchCause = (existingClaim.causeOfLoss || '').trim().toLowerCase() === (d.causeOfLoss || '').trim().toLowerCase();
              return matchGross && matchIndemnity && matchDeductible && matchSettlement && matchCause;
            });

            if (isExactDuplicate) {
              skipped++;
              logsToInsert.push({
                batchId,
                rowNumber: item.rowNumber,
                status: 'SKIPPED',
                rawData: item.data,
                normalizedData: d as any,
                warningMessage: `Berkas klaim nomor ${d.claimNo} sama persis dengan yang sudah tercatat di sistem. Baris dilewati untuk mencegah duplikasi.`,
              });
              continue;
            }

            // Bukan duplikat 100%: Simpan sebagai transaksi klaim baru / termin settlement baru (kumulatif)
            let finalAgentId: string | null = null;
            let finalBranchId: string | null = null;
            let isAutoProvAgent = false;

            const branchId = await provisioningCache.getOrCreateBranch(d.rawBranch);

            if (d.isMm) {
              const agentHolder = await provisioningCache.getOrCreateAgentPlaceholder(d.sourceAgentId, d.rawBranch);
              finalAgentId = agentHolder.agentId;
              finalBranchId = branchId || agentHolder.branchId || null;
              isAutoProvAgent = agentHolder.wasAutoProvisioned;
            } else {
              // Klaim Non-MM: tidak terikat Master Agen MM
              finalBranchId = branchId || null;
              finalAgentId = null;
            }

            const newClaim: typeof claims.$inferInsert = {
              agentId: finalAgentId,
              sourceAgentId: d.sourceAgentId,
              sourceBatchId: batchId,
              branchId: finalBranchId,
              isMm: d.isMm,
              claimNo: d.claimNo,
              policyNo: d.policyNo,
              dateOfSettlement: d.dateOfSettlement as any,
              period: d.period as any,
              uwYear: d.uwYear,
              grossClaim: d.grossClaim as any,
              rawBranch: d.rawBranch,
              namaProduk: d.namaProduk,
              currency: d.currency,
              causeOfLoss: d.causeOfLoss,
              indemnity: d.indemnity as any,
              deductible: d.deductible as any,
              salvage: d.salvage as any,
              subrogation: d.subrogation as any,
              createdBy: userId,
            };

            claimsToInsert.push(newClaim);
            success++;

            // Daftarkan ke in-memory map agar repeat dalam batch ini juga terlindungi
            list.push({ ...newClaim, id: 'temp-' + item.rowNumber } as any);
            existingClaimsMap.set(d.claimNo, list);

            if (isAutoProvAgent) {
              warning++;
              sampleWarningCodes.add(d.sourceAgentId);
              logsToInsert.push({
                batchId,
                rowNumber: item.rowNumber,
                status: 'WARNING',
                rawData: item.data,
                normalizedData: d as any,
                warningMessage: `Agent ID '${d.sourceAgentId}' belum terdaftar di Master Agen. Dibuatkan placeholder UNREGISTERED_IN_MASTER agar berkas klaim ${d.claimNo} tidak hilang.`,
              });
            } else {
              logsToInsert.push({
                batchId,
                rowNumber: item.rowNumber,
                status: 'SUCCESS',
                rawData: item.data,
                normalizedData: d as any,
                warningMessage: list.length > 1
                  ? `Transaksi settlement ke-${list.length} untuk nomor klaim ${d.claimNo} (Polis: ${d.policyNo}). Nilai klaim dijumlahkan kumulatif.`
                  : (!d.isMm ? 'Klaim Non-MM (tidak terikat Agen MM).' : undefined),
              });
            }
          } catch (err: any) {
            failed++;
            logsToInsert.push({
              batchId,
              rowNumber: item.rowNumber,
              status: 'ERROR',
              rawData: item.data,
              errorMessage: err.message || String(err),
            });
          }
        }

        // Multi-Row Bulk Insert into claims
        if (claimsToInsert.length > 0) {
          for (let i = 0; i < claimsToInsert.length; i += 500) {
            await db.insert(claims).values(claimsToInsert.slice(i, i + 500));
          }
        }
      }
    }

    // 4. Multi-Row Bulk Insert for Row Logs (slices of 500)
    // For large files, record ALL errors, warnings, skipped duplicates, and up to 25 sample success logs per chunk
    if (logsToInsert.length > 0) {
      let successCountLogged = 0;
      const optimizedLogs = logsToInsert.filter((l) => {
        if (l.status !== 'SUCCESS') return true;
        if (successCountLogged < 25) {
          successCountLogged++;
          return true;
        }
        return false;
      });

      for (let i = 0; i < optimizedLogs.length; i += 500) {
        await db.insert(uploadRowLogs).values(optimizedLogs.slice(i, i + 500));
      }
    }
  } catch (err: any) {
    console.error('Error processing chunk:', err);
  }

  return { success, warning, failed, skipped, updated };
}
