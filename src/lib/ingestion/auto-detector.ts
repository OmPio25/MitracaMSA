/**
 * Automatic Excel Template Detection & Smart Dynamic Column Mapping
 * 
 * Capabilities:
 * - Disambiguates duplicate file headers (e.g., 'Type' and 'Type' -> 'Type', 'Type_2')
 * - Auto-detects template type (DATA_AGENT, MASTER_PRODUKSI, MASTER_CLAIM)
 * - Resolves aliases/synonyms across Indonesian, English, and legacy naming conventions
 * - Applies smart fallbacks (e.g., uses 'Submit Date' or 'Start Period' if 'Bulan' is absent)
 * - Identifies unmapped extra columns for automatic storage in JSONB metadata
 */

import { TEMPLATE_DEFINITIONS, TemplateType, ColumnDefinition } from './template-definitions';

export interface DetectionResult {
  detectedType: TemplateType | null;
  confidence: number; // 0 to 1
  matchedColumns: string[];
  missingRequiredColumns: string[];
  allFoundHeaders: string[];
  columnMapping: Record<string, string>; // Canonical Column Header -> Actual File Header
  unmappedColumns: string[]; // Extra unmapped headers in file
  fallbackColumns: Record<string, string>; // Canonical -> Fallback Header (e.g., 'Bulan' -> 'Submit Date')
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Normalizes header string for robust matching (lowercase, trimmed, collapsed whitespace/symbols)
 */
export function normalizeHeaderStr(str: string): string {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s_\/-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Disambiguates duplicate headers in an array of headers
 * e.g., ['No', 'Type', 'Type'] -> ['No', 'Type', 'Type_2']
 */
export function disambiguateHeaders(rawHeaders: string[]): string[] {
  const seenCount = new Map<string, number>();
  return rawHeaders.map((h) => {
    const clean = String(h ?? '').trim();
    if (!clean) return '';
    const count = seenCount.get(clean) || 0;
    seenCount.set(clean, count + 1);
    if (count > 0) {
      return `${clean}_${count + 1}`;
    }
    return clean;
  });
}

/**
 * Checks if a file header matches a column definition via canonical name or aliases
 */
function isHeaderMatch(fileHeader: string, colDef: ColumnDefinition): boolean {
  const normFileHeader = normalizeHeaderStr(fileHeader);
  if (!normFileHeader) return false;

  const normCanonical = normalizeHeaderStr(colDef.header);
  if (normFileHeader === normCanonical) return true;

  if (colDef.aliases && colDef.aliases.length > 0) {
    for (const alias of colDef.aliases) {
      const normAlias = normalizeHeaderStr(alias);
      if (normFileHeader === normAlias) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Automatically inspects the first row headers from the Excel file
 * and identifies which of the 3 templates was uploaded, constructing a smart mapping dictionary.
 */
export function autoDetectTemplate(fileHeaders: string[]): DetectionResult {
  const cleanHeaders = disambiguateHeaders(fileHeaders);
  const normalizedFileHeaders = cleanHeaders.map(normalizeHeaderStr);

  // Distinct domain signatures to prevent cross-contamination
  const hasPolicyIndicator = normalizedFileHeaders.some((h) =>
    ['policyno', 'nopolis', 'policy_no', 'policynumber', 'nomorpolis', 'policy'].includes(h)
  );
  const hasPremiumIndicator = normalizedFileHeaders.some((h) =>
    ['premi', 'nilaipremi', 'grosspremium', 'totalpremi', 'premium'].includes(h)
  );
  const hasClaimNoIndicator = normalizedFileHeaders.some((h) =>
    ['claimno', 'noklaim', 'claim_no', 'nomorklaim'].includes(h)
  );

  let bestType: TemplateType | null = null;
  let highestScore = 0;
  let bestMatchedColumns: string[] = [];
  let bestMissingRequired: string[] = [];
  let bestColumnMapping: Record<string, string> = {};
  let bestFallbackColumns: Record<string, string> = {};
  let bestUnmapped: string[] = [];

  for (const [typeKey, definition] of Object.entries(TEMPLATE_DEFINITIONS) as [
    TemplateType,
    typeof TEMPLATE_DEFINITIONS[TemplateType]
  ][]) {
    // 0. Domain Exclusion Rules
    if (typeKey === 'DATA_AGENT') {
      // DataAgent roster NEVER contains policies, premiums, or claim numbers
      if (hasPolicyIndicator || hasPremiumIndicator || hasClaimNoIndicator) {
        continue;
      }
    } else if (typeKey === 'MASTER_PRODUKSI') {
      // If file contains Claim No and has NO premium indicator, it's not production
      if (hasClaimNoIndicator && !hasPremiumIndicator) {
        continue;
      }
    } else if (typeKey === 'MASTER_CLAIM') {
      // If file has premium indicator and NO claim number indicator, it's not claim
      if (hasPremiumIndicator && !hasClaimNoIndicator) {
        continue;
      }
    }

    const currentMatched: string[] = [];
    const currentColumnMapping: Record<string, string> = {};
    const currentFallbackColumns: Record<string, string> = {};
    const usedFileHeaderIndices = new Set<number>();

    // 1. Match Canonical Columns and Aliases
    for (const col of definition.columns) {
      for (let i = 0; i < cleanHeaders.length; i++) {
        if (usedFileHeaderIndices.has(i)) continue;

        const rawHeader = cleanHeaders[i];
        if (isHeaderMatch(rawHeader, col)) {
          currentMatched.push(col.header);
          currentColumnMapping[col.header] = rawHeader;
          usedFileHeaderIndices.add(i);
          break;
        }
      }
    }

    // 2. Evaluate Smart Fallbacks for Unmatched Columns (e.g. 'Bulan' -> 'Submit Date')
    const missingRequired: string[] = [];
    for (const col of definition.columns) {
      if (!currentMatched.includes(col.header)) {
        let fallbackFound = false;
        if (col.fallbackColumns && col.fallbackColumns.length > 0) {
          for (const fallbackName of col.fallbackColumns) {
            const normFallback = normalizeHeaderStr(fallbackName);
            const foundIdx = normalizedFileHeaders.findIndex(
              (h, idx) => h === normFallback && !usedFileHeaderIndices.has(idx)
            );

            if (foundIdx !== -1) {
              const matchedFallbackHeader = cleanHeaders[foundIdx];
              currentMatched.push(col.header);
              currentColumnMapping[col.header] = matchedFallbackHeader;
              currentFallbackColumns[col.header] = matchedFallbackHeader;
              usedFileHeaderIndices.add(foundIdx);
              fallbackFound = true;
              break;
            }
          }
        }

        if (!fallbackFound && col.required) {
          missingRequired.push(col.header);
        }
      }
    }

    // 3. Signature Matching (direct or fallback)
    let sigMatchedCount = 0;
    for (const sigCol of definition.signatureColumns) {
      if (currentMatched.includes(sigCol)) {
        sigMatchedCount += 1;
      }
    }

    // 4. Determine Unmapped Columns (Remaining headers)
    const unmapped: string[] = [];
    cleanHeaders.forEach((h, idx) => {
      if (!usedFileHeaderIndices.has(idx) && h.trim()) {
        unmapped.push(h);
      }
    });

    // 5. Score Calculation (F1-score of file headers coverage + signature weight)
    const precision = cleanHeaders.length > 0 ? usedFileHeaderIndices.size / cleanHeaders.length : 0;
    const recall = definition.columns.length > 0 ? currentMatched.length / definition.columns.length : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const sigRatio = definition.signatureColumns.length > 0 ? sigMatchedCount / definition.signatureColumns.length : 0;

    let score = f1 * 0.45 + sigRatio * 0.55;
    if (missingRequired.length > 0) {
      score *= 0.5; // Penalty for missing required columns
    }

    if (score > highestScore && score >= 0.2) {
      highestScore = score;
      bestType = typeKey;
      bestMatchedColumns = currentMatched;
      bestMissingRequired = missingRequired;
      bestColumnMapping = currentColumnMapping;
      bestFallbackColumns = currentFallbackColumns;
      bestUnmapped = unmapped;
    }
  }

  if (!bestType || highestScore < 0.25) {
    return {
      detectedType: null,
      confidence: 0,
      matchedColumns: [],
      missingRequiredColumns: [],
      allFoundHeaders: cleanHeaders,
      columnMapping: {},
      unmappedColumns: cleanHeaders,
      fallbackColumns: {},
      isValid: false,
      errorMessage: `Format header Excel tidak dikenali. Pastikan file memuat kolom utama yang sesuai untuk DataAgent, MasterProduksi, atau MasterClaim.`,
    };
  }

  const isValid = bestMissingRequired.length === 0;
  const errorMessage = isValid
    ? undefined
    : `Header terdeteksi sebagai ${TEMPLATE_DEFINITIONS[bestType].title}, namun kolom wajib berikut tidak ditemukan: ${bestMissingRequired.join(', ')}`;

  return {
    detectedType: bestType,
    confidence: Math.min(Math.round(highestScore * 100) / 100, 1),
    matchedColumns: bestMatchedColumns,
    missingRequiredColumns: bestMissingRequired,
    allFoundHeaders: cleanHeaders,
    columnMapping: bestColumnMapping,
    unmappedColumns: bestUnmapped,
    fallbackColumns: bestFallbackColumns,
    isValid,
    errorMessage,
  };
}
