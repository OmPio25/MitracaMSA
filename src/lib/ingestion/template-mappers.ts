/**
 * Smart Dynamic Template Ingestion Mappers for MitracaMSA
 * 
 * Supports dynamic column mapping, alias resolution, smart date fallback,
 * and automatic unmapped column preservation in JSONB metadata.
 */

import { parseDecimal18_2, extractObjectDetails, parsePeriodDate, parseExactDate, extractCellValue } from './sanitizer';
import { parsePolicyNo } from './policy-parser';

/**
 * Helper to dynamically extract value from row using column mapping or fallbacks
 */
function getValueByMapping(
  row: Record<string, unknown>,
  canonicalHeader: string,
  columnMapping?: Record<string, string>,
  alternateKeys: string[] = []
): unknown {
  let foundVal: unknown = undefined;

  // 1. Check exact mapping from auto-detector
  if (columnMapping && columnMapping[canonicalHeader]) {
    const mappedKey = columnMapping[canonicalHeader];
    if (row[mappedKey] !== undefined && row[mappedKey] !== null) {
      foundVal = row[mappedKey];
    }
  }

  // 2. Direct lookup by canonical header
  if (foundVal === undefined && row[canonicalHeader] !== undefined && row[canonicalHeader] !== null) {
    foundVal = row[canonicalHeader];
  }

  // 3. Lowercase / trimmed lookup
  if (foundVal === undefined) {
    const cleanCanonical = canonicalHeader.toLowerCase().trim();
    for (const [key, val] of Object.entries(row)) {
      if (key.toLowerCase().trim() === cleanCanonical && val !== undefined && val !== null) {
        foundVal = val;
        break;
      }
    }
  }

  // 4. Check provided alternate keys / aliases
  if (foundVal === undefined) {
    for (const alt of alternateKeys) {
      const cleanAlt = alt.toLowerCase().trim();
      for (const [key, val] of Object.entries(row)) {
        if (key.toLowerCase().trim() === cleanAlt && val !== undefined && val !== null) {
          foundVal = val;
          break;
        }
      }
      if (foundVal !== undefined) break;
    }
  }

  return extractCellValue(foundVal);
}

// ── 1. Template: DataAgent ───────────────────────────────────────────────────
export interface SanitizedDataAgent {
  agentCode: string;
  name: string;
  rawBranchName: string | null;
  profId: string | null;
  statusKeagenan: string | null;
  uplineAgentCode: string | null;
  peringkat: string | null;
  metadata?: Record<string, unknown>;
}

export function mapDataAgentRow(
  row: Record<string, unknown>,
  rowNumber: number,
  columnMapping?: Record<string, string>
): {
  success: boolean;
  data?: SanitizedDataAgent;
  error?: string;
} {
  const rawCode = getValueByMapping(row, 'KODEAGEN', columnMapping, [
    'kode agen', 'agent code', 'agent id', 'id agen', 'kode_agen', 'agentcode'
  ]);
  const rawName = getValueByMapping(row, 'NAMAAGEN', columnMapping, [
    'nama agen', 'agent name', 'nama', 'agent_name', 'agentname'
  ]);

  const code = String(rawCode ?? '').trim().toUpperCase();
  const name = String(rawName ?? '').trim();

  if (!code) {
    return { success: false, error: `Baris ${rowNumber}: Kode Agen wajib diisi.` };
  }

  const rawBranch = getValueByMapping(row, 'NAMACABANG', columnMapping, [
    'nama cabang', 'cabang', 'branch', 'branch name', 'kantor cabang'
  ]);
  const rawProfId = getValueByMapping(row, 'PROFID', columnMapping, [
    'profile id', 'prof id', 'profile_id', 'id profil'
  ]);
  const rawStatus = getValueByMapping(row, 'STATUSKEAGENAN', columnMapping, [
    'status keagenan', 'status', 'stat', 'agent status'
  ]);
  const rawUpline = getValueByMapping(row, 'KodeUpline', columnMapping, [
    'kode upline', 'upline code', 'upline', 'id upline', 'kode_upline'
  ]);
  const rawPeringkat = getValueByMapping(row, 'PERINGKAT', columnMapping, [
    'rank', 'level', 'jabatan', 'tier', 'grade'
  ]);

  const uplineCode = String(rawUpline ?? '').trim().toUpperCase();

  return {
    success: true,
    data: {
      agentCode: code,
      name: name || `AGEN ${code}`,
      rawBranchName: rawBranch ? String(rawBranch).trim() : null,
      profId: rawProfId ? String(rawProfId).trim() : null,
      statusKeagenan: rawStatus ? String(rawStatus).trim() : 'AKTIF',
      uplineAgentCode: uplineCode || null,
      peringkat: rawPeringkat ? String(rawPeringkat).trim() : null,
    },
  };
}

// ── 2. Template: MasterProduksi ──────────────────────────────────────────────
export interface SanitizedMasterProduksi {
  bulan: string;
  period: string; // YYYY-MM-01
  policyStatus: string | null;
  sourceAgentId: string;
  profileId: string | null;
  agentName: string | null;
  agentStatus: string | null;
  rawBranch: string | null;
  representative: string | null;
  product: string | null;
  coverage: string | null;
  renewed: string | null;
  prevPolicy: string | null;
  spauType: string | null;
  spauNo: string | null;
  policyNo: string;
  issueDate: string | null;
  startPeriod: string | null;
  endPeriod: string | null;
  insuredName: string | null;
  currencyTsi: string;
  rateTsi: string;
  tsi: string;
  tsiInIdr: string;
  nilaiPremi: string;
  nilaiKomisi: string;
  nilaiDiskon: string;
  nilaiAkusisi: string;
  objectDetails: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  isMm: boolean;
}

export function mapMasterProduksiRow(
  row: Record<string, unknown>,
  rowNumber: number,
  columnMapping?: Record<string, string>
): {
  success: boolean;
  data?: SanitizedMasterProduksi;
  error?: string;
} {
  const rawPolicyNo = getValueByMapping(row, 'Policy No', columnMapping, [
    'no policy', 'no polis', 'nomor polis', 'policy number', 'policy_no', 'policyno'
  ]);
  const rawAgentId = getValueByMapping(row, 'Agent ID', columnMapping, [
    'kode agen', 'agent code', 'id agen', 'kodeagen', 'agent_id'
  ]);

  const policyNo = String(rawPolicyNo ?? '').trim();
  let agentId = String(rawAgentId ?? '').trim().toUpperCase();
  let isMm = true;

  if (!policyNo) {
    return { success: false, error: `Baris ${rowNumber}: Policy No (Nomor Polis) wajib diisi.` };
  }

  // Handle Missing Agent ID or Formula Errors (#N/A, #VALUE!, [object Object], etc.)
  const isAgentInvalid = !agentId || agentId === '[OBJECT OBJECT]' || agentId === '#N/A' || agentId === 'N/A' || agentId === '#VALUE!' || agentId === 'NULL';
  if (isAgentInvalid) {
    const rawSpau = getValueByMapping(row, 'SPAU No', columnMapping, ['no spau', 'sppa no', 'no sppa', 'spau no', 'spau']);
    const spauClean = String(rawSpau ?? '').trim();
    if (/^\d{6}/.test(spauClean)) {
      agentId = spauClean.slice(0, 6);
      isMm = true;
    } else {
      // Ditandai sebagai Polis Produksi Non-MM
      agentId = 'NON-MM';
      isMm = false;
    }
  }

  // ── Smart Period & Bulan Resolution ─────────────────────────────────────────
  let rawBulan: unknown = undefined;

  // 1. Check if separate Tahun and bulan columns exist (e.g. Format 3)
  const rawTahun = row['Tahun'] ?? row['tahun'] ?? row['Year'] ?? row['year'] ?? row['UW Year'];
  const rawBulanPart = row['bulan'] ?? row['Bulan'] ?? row['Month'] ?? row['month'];

  if (rawTahun && rawBulanPart && /^\d{1,2}$/.test(String(rawBulanPart).trim())) {
    const yr = String(rawTahun).trim();
    const mo = String(rawBulanPart).trim().padStart(2, '0');
    rawBulan = `${yr}-${mo}`;
  } else {
    rawBulan = getValueByMapping(row, 'Bulan', columnMapping, [
      'periode', 'accounting period', 'reporting period', 'month', 'periode akuntansi'
    ]);
  }

  // 2. If rawBulan is just a month number without a year (e.g. "5"), fallback to Submit Date or Start Period
  const isLoneMonthNumber = rawBulan !== undefined && rawBulan !== null && /^\d{1,2}$/.test(String(rawBulan).trim());
  if (!rawBulan || isLoneMonthNumber) {
    const dateFallback = getValueByMapping(row, 'Submit Date', columnMapping, [
      'submit date', 'tgl submit', 'tanggal submit', 'start period', 'periode awal', 'tgl mulai'
    ]);
    if (dateFallback) {
      rawBulan = dateFallback;
    } else {
      // Inferred period from Policy No structure (1CC TTTT YY MM RRRRRRR or S1CC TTTT YY MM RRRRRR)
      const parsedPol = parsePolicyNo(policyNo);
      if (parsedPol) {
        rawBulan = parsedPol.inferredPeriod;
      }
    }
  }

  const period = parsePeriodDate(rawBulan);
  const bulanString = rawBulan ? String(rawBulan).trim() : period;

  // ── Smart Object Details & Extra Metadata Extraction ───────────────────────
  const objectDetails = extractObjectDetails(row);

  // Kumpulkan kolom ekstra yang tidak ada di standar ke dalam metadata
  const standardMappedKeys = new Set(
    columnMapping ? Object.values(columnMapping).map((k) => k.toLowerCase().trim()) : []
  );
  // Tambahkan juga canonical standard names
  [
    'policy no', 'agent id', 'bulan', 'policy status', 'profile id', 'agent name',
    'agent status', 'branch', 'representative', 'product', 'coverage', 'renewed',
    'prev policy', 'spau type', 'spau no', 'tanggal terbit', 'submit date', 'booking_date',
    'booking date', 'issue date', 'tgl terbit', 'start period', 'end period', 'insured name',
    'currency of tsi', 'rate of tsi', 'tsi', 'tsi in idr', 'nilai premi', 'nilai komisi',
    'nilai diskon', 'nilai akusisi', 'premi', 'cabang', 'komisi', 'diskon', 'akuisisi',
    'nama produk', 'stat', 'nama', 'tahun'
  ].forEach((k) => standardMappedKeys.add(k));

  const extraMetadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanK = k.toLowerCase().trim();
    if (!standardMappedKeys.has(cleanK) && !cleanK.startsWith('object') && v !== null && v !== undefined && v !== '') {
      extraMetadata[k] = v;
    }
  }

  // Value extractions via Smart Dynamic Mapping
  const rawStatus = getValueByMapping(row, 'Policy Status', columnMapping, ['status polis', 'stat', 'status']);
  const rawProfId = getValueByMapping(row, 'Profile ID', columnMapping, ['prof id', 'profid']);
  const rawAgentName = getValueByMapping(row, 'Agent Name', columnMapping, ['nama agen', 'nama agent']);
  const rawAgentStat = getValueByMapping(row, 'Agent Status', columnMapping, ['status agen']);
  const rawBranch = getValueByMapping(row, 'Branch', columnMapping, ['cabang', 'nama cabang', 'kantor cabang']);
  const rawRep = getValueByMapping(row, 'Representative', columnMapping, ['rep', 'penanggung jawab']);
  const rawProduct = getValueByMapping(row, 'Product', columnMapping, ['nama produk', 'produk', 'product name']);
  const rawCoverage = getValueByMapping(row, 'Coverage', columnMapping, ['lingkup jaminan', 'jaminan']);
  const rawRenewed = getValueByMapping(row, 'Renewed', columnMapping, ['perpanjangan', 'renewal']);
  const rawPrevPolicy = getValueByMapping(row, 'Prev Policy', columnMapping, ['polis lama', 'policy no ori']);
  const rawSpauType = getValueByMapping(row, 'SPAU Type', columnMapping, ['jenis spau', 'polis type', 'type']);
  const rawSpauNo = getValueByMapping(row, 'SPAU No', columnMapping, ['no spau', 'sppa no', 'no sppa', 'sppa']);
  const rawIssueDate = getValueByMapping(row, 'Tanggal Terbit', columnMapping, [
    'tanggal terbit', 'tgl terbit', 'submit date', 'submit_date', 'booking_date', 'booking date',
    'issue date', 'issued date', 'tgl submit', 'tanggal submit', 'tgl booking', 'policy issue date', 'date issued'
  ]);
  const rawStartPeriod = getValueByMapping(row, 'Start Period', columnMapping, ['periode awal', 'tgl mulai', 'inception date']);
  const rawEndPeriod = getValueByMapping(row, 'End Period', columnMapping, ['periode akhir', 'tgl akhir', 'expiry date']);
  const rawInsuredName = getValueByMapping(row, 'Insured Name', columnMapping, ['nama tertanggung', 'tertanggung', 'nama']);
  const rawCurrency = getValueByMapping(row, 'Currency of TSI', columnMapping, ['currency', 'mata uang', 'curr']);
  const rawRateTsi = getValueByMapping(row, 'Rate of TSI', columnMapping, ['rate tsi', 'kurs', 'rate']);
  const rawTsi = getValueByMapping(row, 'TSI', columnMapping, ['total sum insured', 'sum insured', 'nilai pertanggungan']);
  const rawTsiIdr = getValueByMapping(row, 'TSI in IDR', columnMapping, ['tsi idr', 'total sum insured idr']);
  const rawPremi = getValueByMapping(row, 'Nilai Premi', columnMapping, ['premi', 'gross premium', 'total premi', 'premium']);
  const rawKomisi = getValueByMapping(row, 'Nilai Komisi', columnMapping, ['komisi', 'commission', 'komisi agen']);
  const rawDiskon = getValueByMapping(row, 'Nilai Diskon', columnMapping, ['diskon', 'discount', 'diskon premi']);
  const rawAkusisi = getValueByMapping(row, 'Nilai Akusisi', columnMapping, ['akuisisi', 'biaya akuisisi', 'acquisition cost']);

  return {
    success: true,
    data: {
      bulan: bulanString,
      period,
      policyStatus: rawStatus ? String(rawStatus).trim() : null,
      sourceAgentId: agentId,
      profileId: rawProfId ? String(rawProfId).trim() : null,
      agentName: rawAgentName ? String(rawAgentName).trim() : null,
      agentStatus: rawAgentStat ? String(rawAgentStat).trim() : null,
      rawBranch: rawBranch ? String(rawBranch).trim() : null,
      representative: rawRep ? String(rawRep).trim() : null,
      product: rawProduct ? String(rawProduct).trim() : null,
      coverage: rawCoverage ? String(rawCoverage).trim() : null,
      renewed: rawRenewed ? String(rawRenewed).trim() : null,
      prevPolicy: rawPrevPolicy ? String(rawPrevPolicy).trim() : null,
      spauType: rawSpauType ? String(rawSpauType).trim() : null,
      spauNo: rawSpauNo ? String(rawSpauNo).trim() : null,
      policyNo,
      issueDate: rawIssueDate ? parseExactDate(rawIssueDate) : null,
      startPeriod: rawStartPeriod ? parseExactDate(rawStartPeriod) : null,
      endPeriod: rawEndPeriod ? parseExactDate(rawEndPeriod) : null,
      insuredName: rawInsuredName ? String(rawInsuredName).trim() : null,
      currencyTsi: rawCurrency ? String(rawCurrency).trim().toUpperCase() : 'IDR',
      rateTsi: parseDecimal18_2(rawRateTsi ?? '1'),
      tsi: parseDecimal18_2(rawTsi),
      tsiInIdr: parseDecimal18_2(rawTsiIdr ?? rawTsi),
      nilaiPremi: parseDecimal18_2(rawPremi),
      nilaiKomisi: parseDecimal18_2(rawKomisi),
      nilaiDiskon: parseDecimal18_2(rawDiskon),
      nilaiAkusisi: parseDecimal18_2(rawAkusisi),
      objectDetails,
      metadata: Object.keys(extraMetadata).length > 0 ? extraMetadata : undefined,
      isMm,
    },
  };
}

// ── 3. Template: MasterClaim ─────────────────────────────────────────────────
export interface SanitizedMasterClaim {
  sourceAgentId: string;
  claimNo: string;
  policyNo: string;
  dateOfSettlement: string | null;
  period: string; // Derived from settlement date or loss date
  uwYear: string | null;
  grossClaim: string;
  rawBranch: string | null;
  namaProduk: string | null;
  currency: string;
  causeOfLoss: string | null;
  indemnity: string;
  deductible: string;
  salvage: string;
  subrogation: string;
  metadata?: Record<string, unknown>;
  isMm: boolean;
}

export function mapMasterClaimRow(
  row: Record<string, unknown>,
  rowNumber: number,
  columnMapping?: Record<string, string>
): {
  success: boolean;
  data?: SanitizedMasterClaim;
  error?: string;
} {
  const rawClaimNo = getValueByMapping(row, 'Claim No', columnMapping, [
    'no claim', 'no klaim', 'nomor klaim', 'claim_no', 'claimno'
  ]);
  const rawPolicyNo = getValueByMapping(row, 'Policy No', columnMapping, [
    'no policy', 'no polis', 'nomor polis', 'policy_no', 'policyno'
  ]);
  const rawAgentId = getValueByMapping(row, 'Agent ID', columnMapping, [
    'kode agen', 'agent code', 'id agen', 'kodeagen', 'agent_id'
  ]);

  const claimNo = String(rawClaimNo ?? '').trim();
  const policyNo = String(rawPolicyNo ?? '').trim();
  let agentId = String(rawAgentId ?? '').trim().toUpperCase();
  let isMm = true;

  if (!claimNo) {
    return { success: false, error: `Baris ${rowNumber}: Claim No wajib diisi.` };
  }
  if (!policyNo) {
    return { success: false, error: `Baris ${rowNumber}: Policy No wajib diisi.` };
  }

  // Handle Missing Agent ID or Formula Errors (#N/A, #VALUE!, [object Object], etc.)
  const isAgentInvalid = !agentId || agentId === '[OBJECT OBJECT]' || agentId === '#N/A' || agentId === 'N/A' || agentId === '#VALUE!' || agentId === 'NULL';
  if (isAgentInvalid) {
    const rawSppa = getValueByMapping(row, 'SPPA No', columnMapping, ['no spau', 'sppa no', 'no sppa', 'sppa']);
    const sppaClean = String(rawSppa ?? '').trim();
    if (/^\d{6}/.test(sppaClean)) {
      agentId = sppaClean.slice(0, 6);
      isMm = true;
    } else {
      // Ditandai sebagai Non-MM
      agentId = 'NON-MM';
      isMm = false;
    }
  }

  const rawSettlement = getValueByMapping(row, 'Date Of Settlement', columnMapping, [
    'tgl settlement', 'tanggal settlement', 'settlement date', 'tgl klaim', 'date_of_settlement'
  ]);
  const period = parsePeriodDate(rawSettlement);

  const rawGrossClaim = getValueByMapping(row, 'Gross Claim', columnMapping, [
    'klaim', 'nilai klaim', 'total klaim', 'claim amount', 'claim', 'gross_claim'
  ]);
  const rawBranch = getValueByMapping(row, 'Cabang/Branch', columnMapping, [
    'cabang', 'branch', 'nama cabang', 'kantor cabang'
  ]);
  const rawProduct = getValueByMapping(row, 'Nama Produk', columnMapping, [
    'product', 'produk', 'product name'
  ]);
  const rawCurrency = getValueByMapping(row, 'Currency', columnMapping, [
    'mata uang', 'curr'
  ]);
  const rawCause = getValueByMapping(row, 'Cause of Loss', columnMapping, [
    'penyebab kerugian', 'penyebab', 'alasan klaim'
  ]);
  const rawUwYear = getValueByMapping(row, 'UW Year', columnMapping, [
    'underwriting year', 'tahun uw', 'uw_year'
  ]);

  const rawIndemnity = getValueByMapping(row, 'Indemnity', columnMapping, ['ganti rugi']);
  const rawDeductible = getValueByMapping(row, 'Deductible', columnMapping, ['potongan risiko', 'risiko sendiri']);
  const rawSalvage = getValueByMapping(row, 'Salvage', columnMapping, ['nilai sisa barang', 'sisa barang']);
  const rawSubrogation = getValueByMapping(row, 'Subrogation', columnMapping, ['subrogasi', 'nilai subrogasi']);

  return {
    success: true,
    data: {
      sourceAgentId: agentId,
      claimNo,
      policyNo,
      dateOfSettlement: rawSettlement ? parseExactDate(rawSettlement) : null,
      period,
      uwYear: rawUwYear ? String(rawUwYear).trim() : null,
      grossClaim: parseDecimal18_2(rawGrossClaim),
      rawBranch: rawBranch ? String(rawBranch).trim() : null,
      namaProduk: rawProduct ? String(rawProduct).trim() : null,
      currency: rawCurrency ? String(rawCurrency).trim().toUpperCase() : 'IDR',
      causeOfLoss: rawCause ? String(rawCause).trim() : null,
      indemnity: parseDecimal18_2(rawIndemnity),
      deductible: parseDecimal18_2(rawDeductible),
      salvage: parseDecimal18_2(rawSalvage),
      subrogation: parseDecimal18_2(rawSubrogation),
      isMm,
    },
  };
}
