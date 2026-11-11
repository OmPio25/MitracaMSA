/**
 * Policy Number Structure Parser for MitracaMSA
 * 
 * Supports:
 * 1. Polis Konvensional (18 digits):
 *    - Digit 1: '1' (Penanda Polis Konvensional)
 *    - Digit 2-3: Kode Cabang (2 digit, e.g. '07')
 *    - Digit 4-7: Kode TOC Produk (4 digit, e.g. '0206')
 *    - Digit 8-9: Tahun Polis (2 digit, e.g. '25' -> 2025)
 *    - Digit 10-11: Bulan Polis (2 digit, e.g. '03')
 *    - Digit 12-18: Running Number (7 digit, e.g. '0000045')
 *    Contoh: 107020625030000045
 * 
 * 2. Polis Syariah (17 characters):
 *    - Karakter 1-2: 'S1' (Penanda Polis Syariah)
 *    - Karakter 3-4: Kode Cabang (2 digit, e.g. '06')
 *    - Karakter 5-8: Kode TOC Produk (4 digit, e.g. '0105')
 *    - Karakter 9-10: Tahun Polis (2 digit, e.g. '26' -> 2026)
 *    - Karakter 11-12: Bulan Polis (2 digit, e.g. '09')
 *    - Karakter 13-17: Running Number (6 digit, e.g. '000015')
 *    Contoh: S10601052609000015
 */

export interface ParsedPolicyNo {
  raw: string;
  isSyariah: boolean;
  branchCode: string;
  tocCode: string;
  policyYear: string;   // e.g. '2025'
  policyMonth: string;  // e.g. '03'
  runningNumber: string;
  inferredPeriod: string; // e.g. '2025-03-01'
}

export function parsePolicyNo(rawPolicyNo: unknown): ParsedPolicyNo | null {
  if (!rawPolicyNo) return null;
  const str = String(rawPolicyNo).trim().toUpperCase();

  // 1. Polis Syariah: Diawali 'S1'
  if (str.startsWith('S1') && str.length >= 16) {
    const branchCode = str.slice(2, 4);
    const tocCode = str.slice(4, 8);
    const rawYear = str.slice(8, 10);
    const rawMonth = str.slice(10, 12);
    const runningNumber = str.slice(12);

    const yearNum = parseInt(rawYear, 10);
    const fullYear = !isNaN(yearNum) ? (yearNum < 50 ? `20${rawYear}` : `19${rawYear}`) : '2026';
    const monthNum = parseInt(rawMonth, 10);
    const validMonth = !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 ? rawMonth.padStart(2, '0') : '01';

    return {
      raw: str,
      isSyariah: true,
      branchCode,
      tocCode,
      policyYear: fullYear,
      policyMonth: validMonth,
      runningNumber,
      inferredPeriod: `${fullYear}-${validMonth}-01`,
    };
  }

  // 2. Polis Konvensional: Diawali '1'
  if (str.startsWith('1') && str.length >= 17) {
    const branchCode = str.slice(1, 3);
    const tocCode = str.slice(3, 7);
    const rawYear = str.slice(7, 9);
    const rawMonth = str.slice(9, 11);
    const runningNumber = str.slice(11);

    const yearNum = parseInt(rawYear, 10);
    const fullYear = !isNaN(yearNum) ? (yearNum < 50 ? `20${rawYear}` : `19${rawYear}`) : '2026';
    const monthNum = parseInt(rawMonth, 10);
    const validMonth = !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 ? rawMonth.padStart(2, '0') : '01';

    return {
      raw: str,
      isSyariah: false,
      branchCode,
      tocCode,
      policyYear: fullYear,
      policyMonth: validMonth,
      runningNumber,
      inferredPeriod: `${fullYear}-${validMonth}-01`,
    };
  }

  return null;
}
