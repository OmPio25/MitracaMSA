import { db } from '../db';
import { productionRecords, claims, uploadBatches } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { processUploadedExcelFile } from '../lib/ingestion/unified-processor';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function runTest() {
  console.log('=== STARTING UPLOAD RULES & DEDUPLICATION VERIFICATION ===\n');

  const testDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const testFilePath = path.join(testDir, 'Test_Endorsement_Produksi.xlsx');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('MasterProduksi');

  // Standard Header Row
  ws.addRow([
    'Bulan',
    'Policy Status',
    'Agent ID',
    'Profile ID',
    'Agent Name',
    'Agent Status',
    'Branch',
    'Representative',
    'Product',
    'Coverage',
    'Renewed',
    'Prev Policy',
    'SPAU Type',
    'SPAU No',
    'Policy No',
    'Start Period',
    'End Period',
    'Insured Name',
    'Currency of TSI',
    'Rate of TSI',
    'TSI',
    'TSI in IDR',
    'Nilai Premi',
    'Nilai Komisi',
    'Nilai Diskon',
    'Nilai Akusisi',
    'Object Information 1',
    'Object Information 2',
    'Object Information 3',
    'Object Information 4',
    'Object Information 5',
    'Object Information 6',
  ]);

  // Test Policy 1: Exact Duplicate of Jennie's policy (100020526090000022)
  ws.addRow([
    'September',
    'New',
    '800439',
    'M0JV00001',
    'JENNIE VERENA LAUW',
    'Active',
    '00 - KPO',
    '-',
    'Motorcar',
    '02KBM-CMPM - Comprehensive',
    '-',
    '-',
    'New',
    'S202609140007',
    '100020526090000022',
    '2025-09-01',
    '2026-09-01',
    'DAPNIE ROSALIE',
    'IDR',
    '0.0000',
    '250000000.00',
    '250000000.00',
    '5460000.00',
    '-1365000.00',
    '0.00',
    '-1365000.00',
    'V8 VANTAGE',
    'ASTON MARTIN',
    'SEDAN',
    'NON BUS / NON TRUCK',
    '5',
    'B 123',
  ]);

  // Test Policy 2: Endorsement Nominal on Jennie's policy (100020526090000033)
  // Original Premi was 5,460,000. New Premi is 6,460,000 (+1,000,000 Delta)
  ws.addRow([
    'September',
    'Endorsement',
    '800439',
    'M0JV00001',
    'JENNIE VERENA LAUW',
    'Active',
    '00 - KPO',
    '-',
    'Motorcar',
    '02KBM-CMPM - Comprehensive',
    '-',
    '100020526090000033',
    'Endorsement',
    'S202609140010',
    '100020526090000033',
    '2025-09-01',
    '2026-09-01',
    'DAPNIE ROSALIE',
    'IDR',
    '0.0000',
    '250000000.00',
    '250000000.00',
    '6460000.00', // New higher premium (Delta should be +1,000,000)
    '-1615000.00',
    '0.00',
    '-1615000.00',
    'V8 VANTAGE',
    'ASTON MARTIN',
    'SEDAN',
    'NON BUS / NON TRUCK',
    '5',
    'B 123',
  ]);

  // Test Policy 3: Endorsement Non-Nominal on Jennie's policy (100020526090000044)
  // Same Premi (5,460,000), but Insured Name changed to 'YUNITA TANJUNG (GANTI ALAMAT)'
  ws.addRow([
    'September',
    'Endorsement',
    '800439',
    'M0JV00001',
    'JENNIE VERENA LAUW',
    'Active',
    '00 - KPO',
    '-',
    'Motorcar',
    '02KBM-CMPM - Comprehensive',
    '-',
    '100020526090000044',
    'Endorsement',
    'S202609140011',
    '100020526090000044',
    '2026-09-01',
    '2027-09-01',
    'YUNITA TANJUNG (GANTI ALAMAT)',
    'IDR',
    '0.0000',
    '250000000.00',
    '250000000.00',
    '5460000.00', // Identical premium (Delta = 0)
    '-1365000.00',
    '0.00',
    '-1365000.00',
    'V8 VANTAGE',
    'ASTON MARTIN',
    'SEDAN',
    'NON BUS / NON TRUCK',
    '5',
    'B 123',
  ]);

  await wb.xlsx.writeFile(testFilePath);
  console.log('Created test Excel file with 3 test cases: Exact Duplicate, Nominal Delta, Non-Nominal Update.');

  // Run file ingestion through our processor!
  const result = await processUploadedExcelFile(testFilePath, 'Test_Endorsement_Produksi.xlsx', 1024, null);
  console.log('\nIngestion Result:', {
    totalRows: result.totalRows,
    successRows: result.successRows,
    skippedRows: result.skippedRows,
    updatedRows: result.updatedRows,
    status: result.status,
  });

  // Verify DB state
  console.log('\n--- VERIFYING DATABASE STATE ---');

  // 1. Verify Policy 1 (100020526090000022): Should have been SKIPPED (exact duplicate)
  const p1Records = await db.select().from(productionRecords).where(eq(productionRecords.policyNo, '100020526090000022'));
  console.log(`Policy 1 (100020526090000022) count: ${p1Records.length} (Expected: 1, Exact duplicate was skipped!)`);
  if (p1Records.length === 1) {
    console.log('✅ Rule 1 PASSED: Exact duplicate was successfully SKIPPED!');
  } else {
    console.error('❌ Rule 1 FAILED: Expected 1 record, found ' + p1Records.length);
  }

  // 2. Verify Policy 2 (100020526090000033): Should have 2 records (1 Original + 1 Endorsement with Delta)
  const p2Records = await db.select().from(productionRecords).where(eq(productionRecords.policyNo, '100020526090000033'));
  console.log(`\nPolicy 2 (100020526090000033) count: ${p2Records.length} (Expected: 2: 1 Original + 1 Endorsement Delta)`);
  const endorsementP2 = p2Records.find(p => p.policyStatus === 'Endorsement');
  if (endorsementP2) {
    console.log('Endorsement record details:', {
      policyStatus: endorsementP2.policyStatus,
      prevPolicy: endorsementP2.prevPolicy,
      deltaPremi: endorsementP2.nilaiPremi,
      metadata: endorsementP2.metadata,
    });
    const deltaVal = parseFloat(endorsementP2.nilaiPremi || '0');
    if (Math.abs(deltaVal - 1000000) < 0.01) {
      console.log('✅ Rule 2 PASSED: Endorsement Nominal Delta accurately calculated as +Rp 1.000.000!');
    } else {
      console.error('❌ Rule 2 FAILED: Delta value was ' + deltaVal);
    }
  } else {
    console.error('❌ Rule 2 FAILED: Endorsement record not found');
  }

  // 3. Verify Policy 3 (100020526090000044): Should have 2 records (1 Original + 1 Non-Nominal Endorsement with 0.00 premi)
  const p3Records = await db.select().from(productionRecords).where(eq(productionRecords.policyNo, '100020526090000044'));
  console.log(`\nPolicy 3 (100020526090000044) count: ${p3Records.length} (Expected: 2: 1 Original + 1 Non-Nominal Endorsement)`);
  const endorsementP3 = p3Records.find(p => p.policyStatus === 'Endorsement');
  if (endorsementP3) {
    console.log('Non-nominal endorsement record details:', {
      policyStatus: endorsementP3.policyStatus,
      insuredName: endorsementP3.insuredName,
      premi: endorsementP3.nilaiPremi,
      objectDetails: endorsementP3.objectDetails,
      metadata: endorsementP3.metadata,
    });
    if (parseFloat(endorsementP3.nilaiPremi || '0') === 0) {
      console.log('✅ Rule 3 PASSED: Non-nominal Endorsement recorded with Rp 0.00 premium and updated object details!');
    } else {
      console.error('❌ Rule 3 FAILED: Premium should be 0.00');
    }
  } else {
    console.error('❌ Rule 3 FAILED: Non-nominal endorsement record not found');
  }

  // 4. Test MasterClaim Rules: Exact Duplicate & Claim Update (Upsert)
  console.log('\n--- TESTING MASTER CLAIM DEDUPLICATION & UPSERT (RULE 4) ---');
  const claimTestFilePath = path.join(testDir, 'Test_Claim_Rules.xlsx');
  const claimWb = new ExcelJS.Workbook();
  const claimWs = claimWb.addWorksheet('MasterClaim');

  claimWs.addRow([
    'Claim No',
    'Policy No',
    'Agent ID',
    'Date Of Settlement',
    'Gross Claim',
    'Cabang/Branch',
    'Nama Produk',
    'Currency',
    'Cause of Loss',
    'UW Year',
    'Indemnity',
    'Deductible',
    'Salvage',
    'Subrogation',
  ]);

  // Existing claim in DB: claimNo '88802012605000960', grossClaim: '3782901.00', causeOfLoss: 'Hit Another Vehicle'
  // Claim 1: Exact Duplicate -> should SKIP
  claimWs.addRow([
    '88802012605000960',
    '100020125080001094',
    '871300',
    '2026-07-01',
    '3782901.00',
    '00 - KPO',
    'Motorcar',
    'IDR',
    'Hit Another Vehicle',
    '2025',
    '-4982901.00',
    '1200000.00',
    '0.00',
    '0.00',
  ]);

  // Claim 2: Updated Claim -> settlement amount adjusted (+500,000) -> should UPSERT without creating a duplicate record
  claimWs.addRow([
    '88802012605000960',
    '100020125080001094',
    '871300',
    '2026-07-01',
    '4282901.00', // Adjusted gross claim
    '00 - KPO',
    'Motorcar',
    'IDR',
    'Hit Another Vehicle',
    '2025',
    '-5482901.00',
    '1200000.00',
    '0.00',
    '0.00',
  ]);

  await claimWb.xlsx.writeFile(claimTestFilePath);

  // Ingest Claim File
  const claimResult = await processUploadedExcelFile(claimTestFilePath, 'Test_Claim_Rules.xlsx', 1024, null);
  console.log('Claim Ingestion Result:', {
    totalRows: claimResult.totalRows,
    successRows: claimResult.successRows,
    skippedRows: claimResult.skippedRows,
    updatedRows: claimResult.updatedRows,
    status: claimResult.status,
  });

  const claimRecords = await db.select().from(claims).where(eq(claims.claimNo, '88802012605000960'));
  console.log(`Claim 88802012605000960 record count: ${claimRecords.length} (Expected: 1, upserted in-place)`);
  if (claimRecords.length === 1 && parseFloat(claimRecords[0].grossClaim || '0') === 4282901) {
    console.log('✅ Rule 4 PASSED: Exact duplicate skipped and updated claim upserted in-place!');
  } else {
    console.error('❌ Rule 4 FAILED: Claim count is ' + claimRecords.length + ', grossClaim: ' + claimRecords[0]?.grossClaim);
  }

  // Restore original claim state
  await db.update(claims).set({ grossClaim: '3782901.00', indemnity: '-4982901.00' }).where(eq(claims.claimNo, '88802012605000960'));
  await db.delete(uploadBatches).where(eq(uploadBatches.id, claimResult.batchId));
  if (fs.existsSync(claimTestFilePath)) fs.unlinkSync(claimTestFilePath);

  // Clean up test batch and test endorsement records to leave DB pristine
  console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
  await db.delete(productionRecords).where(eq(productionRecords.sourceBatchId, result.batchId));
  await db.delete(uploadBatches).where(eq(uploadBatches.id, result.batchId));
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  console.log('Test artifacts cleaned up. DB is in clean state.');

  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
