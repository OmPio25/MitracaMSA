/**
 * Sanitizer & Normalization Engine for Insurance Legacy Ingestion
 * Enforces Core Business Rules:
 * - Dynamic Object Information 1..15 consolidation into single JSONB
 * - Strict DECIMAL(18, 2) currency parsing without JS floating point drift
 * - Branch code and name normalization
 */

import { FIXED_BRANCHES, BRANCH_ALIAS_MAP } from '@/lib/constants/branches';

// ── Cell Value Unwrapper (Handles Formulas, RichText, Hyperlinks) ───────────
export function extractCellValue(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    if (val instanceof Date) return val;
    // ExcelJS cell error object: { error: '#N/A' } or { error: '#VALUE!' }
    if ('error' in (val as Record<string, unknown>)) {
      return null;
    }
    // ExcelJS formula cell: { formula: '...', result: '100111822120000052' }
    if ('result' in (val as Record<string, unknown>)) {
      const res = (val as any).result;
      if (res && typeof res === 'object') {
        if ('error' in res) return null;
        if ('richText' in res && Array.isArray((res as any).richText)) {
          return (res as any).richText.map((t: any) => t.text).join('');
        }
      }
      return res ?? null;
    }
    // ExcelJS rich text: { richText: [{ text: '...' }] }
    if ('richText' in (val as Record<string, unknown>) && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((t: any) => t.text).join('');
    }
    // ExcelJS hyperlink: { text: '...', hyperlink: '...' }
    if ('text' in (val as Record<string, unknown>)) {
      return (val as any).text ?? null;
    }
  }
  return val;
}

// ── Financial Sanitizer: DECIMAL(18, 2) ─────────────────────────────────────────
export function parseDecimal18_2(value: unknown): string {
  const extracted = extractCellValue(value);
  if (extracted === null || extracted === undefined || extracted === '') {
    return '0.00';
  }

  if (typeof extracted === 'number') {
    if (isNaN(extracted) || !isFinite(extracted)) return '0.00';
    return extracted.toFixed(2);
  }

  let str = String(extracted).trim();

  // Handle accounting parentheses: (1,500.00) -> -1500.00
  const isParenthesesNegative = str.startsWith('(') && str.endsWith(')');
  str = str.replace(/[()]/g, '');

  // Strip currency prefixes, spaces, and commas: Rp, IDR, $, etc.
  str = str.replace(/[^0-9.-]/g, '');

  if (!str) return '0.00';

  const num = parseFloat(str);
  if (isNaN(num)) return '0.00';

  const isNegative = isParenthesesNegative || num < 0 || str.startsWith('-');
  const formatted = Math.abs(num).toFixed(2);
  return isNegative ? `-${formatted}` : formatted;
}

// ── Branch Normalizer (Enforces 49 Fixed Master Branches) ───────────────────
const codeToBranch = new Map<string, string>();
FIXED_BRANCHES.forEach((b) => codeToBranch.set(b.code, b.name));

export function normalizeBranch(rawName: unknown): { code: string; name: string } | null {
  const extracted = extractCellValue(rawName);
  if (!extracted) return null;
  const rawStr = String(extracted).trim();
  if (!rawStr) return null;

  const upper = rawStr.toUpperCase();

  // 1. Direct code match (e.g. '00', '81', or number 81 / 0)
  if (/^\d{1,2}$/.test(rawStr)) {
    const padded = rawStr.padStart(2, '0');
    if (codeToBranch.has(padded)) {
      return { code: padded, name: codeToBranch.get(padded)! };
    }
  }

  // 2. Prefixed code (e.g. "81 - KELAPA GADING" or "00 - KANTOR PUSAT" or "08---TIANG-BENDERA")
  const prefixMatch = upper.match(/^([0-9]{2})[\s\-:_]+(.*)$/);
  if (prefixMatch && codeToBranch.has(prefixMatch[1])) {
    const code = prefixMatch[1];
    return { code, name: codeToBranch.get(code)! };
  }

  // 3. Clean string for alias dictionary matching
  const clean = upper.replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (BRANCH_ALIAS_MAP[clean]) {
    const code = BRANCH_ALIAS_MAP[clean];
    return { code, name: codeToBranch.get(code)! };
  }

  // 4. Clean string without spaces (e.g. "TIANGBENDERA", "KELAPAGADING")
  const noSpace = clean.replace(/\s+/g, '');
  for (const [alias, code] of Object.entries(BRANCH_ALIAS_MAP)) {
    if (noSpace === alias.replace(/[^A-Z0-9]/g, '')) {
      return { code, name: codeToBranch.get(code)! };
    }
  }

  // 5. Partial substring match against fixed branch names
  for (const b of FIXED_BRANCHES) {
    const bUpper = b.name.toUpperCase();
    if (clean.includes(bUpper) || bUpper.includes(clean)) {
      return { code: b.code, name: b.name };
    }
  }

  // Fallback: If not matched in fixed list, return default/standardized slug but flag
  const fallbackCode = clean.replace(/\s+/g, '-').slice(0, 50);
  const fallbackName = clean
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { code: fallbackCode, name: fallbackName };
}

// ── Object Information 1..15 Consolidation ───────────────────────────────────
export function extractObjectDetails(row: Record<string, unknown>): Record<string, unknown> {
  const objectDetails: Record<string, unknown> = {};

  // Pattern matches: "Object Information 1", "object_information_1", "object info 1", etc.
  const regex = /^(?:object[_\s]*information|object[_\s]*info|info[_\s]*object)[_\s]*([0-9]{1,2})$/i;

  for (const [key, value] of Object.entries(row)) {
    const match = key.trim().match(regex);
    if (match) {
      const index = parseInt(match[1], 10);
      if (index >= 1 && index <= 15 && value !== null && value !== undefined && value !== '') {
        objectDetails[`object_${index}`] = typeof value === 'string' ? value.trim() : value;
      }
    }
  }

  return objectDetails;
}

// ── Date Normalizer ───────────────────────────────────────────────────────────

/**
 * Universal Date Component Parser
 * Accurately extracts year, month, and day from:
 * - DD/MM/YYYY or DD-MM-YYYY (Indonesian / British standard)
 * - YYYY-MM-DD or YYYY/MM/DD (ISO standard)
 * - Excel Serial Numbers (e.g. 45292)
 * - Date instances
 * Returns { year, month, day } or null if invalid/empty.
 */
export function parseDateComponents(rawDate: unknown): { year: string; month: string; day: string } | null {
  const extracted = extractCellValue(rawDate);
  if (extracted === null || extracted === undefined || extracted === '' || extracted === '-' || extracted === '0') {
    return null;
  }

  // 1. If it's already a Date instance
  if (extracted instanceof Date && !isNaN(extracted.getTime())) {
    const y = String(extracted.getFullYear());
    const m = String(extracted.getMonth() + 1).padStart(2, '0');
    const d = String(extracted.getDate()).padStart(2, '0');
    return { year: y, month: m, day: d };
  }

  // 2. If it's an Excel Serial Number (e.g. 45292 or '45292')
  const numVal =
    typeof extracted === 'number'
      ? extracted
      : /^\d{4,5}(\.\d+)?$/.test(String(extracted).trim())
      ? parseFloat(String(extracted).trim())
      : null;

  if (numVal !== null && numVal > 1000 && numVal < 100000) {
    // Excel base date: 1899-12-30 (accounting for Lotus 1-2-3 leap year bug)
    const jsDate = new Date(Math.round((numVal - 25569) * 86400000));
    if (!isNaN(jsDate.getTime())) {
      const y = String(jsDate.getUTCFullYear());
      const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(jsDate.getUTCDate()).padStart(2, '0');
      return { year: y, month: m, day: d };
    }
  }

  const str = String(extracted).trim();
  if (!str) return null;

  // 3. Match DD/MM/YYYY or DD-MM-YYYY (Indonesian standard format with optional timestamp)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+.*)?$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);

    // Expand 2-digit year (e.g. 25 -> 2025, 99 -> 1999)
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    // Auto-detect if user swapped month and day (e.g. month > 12 and day <= 12)
    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year: String(year),
        month: String(month).padStart(2, '0'),
        day: String(day).padStart(2, '0'),
      };
    }
  }

  // 4. Match YYYY-MM-DD or YYYY/MM/DD (ISO standard format)
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year: String(year),
        month: String(month).padStart(2, '0'),
        day: String(day).padStart(2, '0'),
      };
    }
  }

  // 5. Fallback standard JavaScript Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = String(parsed.getFullYear());
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return { year: y, month: m, day: d };
  }

  return null;
}

/**
 * Exact Date Parser for Start Period, End Period, Date of Settlement
 * Returns formatted 'YYYY-MM-DD' string, or NULL if empty/invalid.
 * NEVER falls back to current date!
 */
export function parseExactDate(rawDate: unknown): string | null {
  const parts = parseDateComponents(rawDate);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Period Date Parser for monthly accounting cuts (YYYY-MM-01)
 * Used specifically for financial period grouping.
 */
export function parsePeriodDate(rawDate: unknown): string {
  const parts = parseDateComponents(rawDate);
  if (parts) {
    return `${parts.year}-${parts.month}-01`;
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}
