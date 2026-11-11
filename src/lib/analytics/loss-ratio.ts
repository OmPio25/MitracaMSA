/**
 * Utilitas dan Logika Bisnis untuk Analitik Produksi & Loss Ratio
 * Berdasarkan Parameter Underwriting & Cutoff System
 */

export interface CutoffPeriod {
  year: number;
  label: string;
  startDate: string; // YYYY-MM-DD (14 November tahun lalu)
  endDate: string;   // YYYY-MM-DD (13 November tahun ini)
}

/**
 * Menghitung tahun cutoff aktif saat ini berdasarkan tanggal acuan.
 * Siklus Cutoff: 14 November (Tahun - 1) s/d 13 November (Tahun).
 * Contoh: 30 Oktober 2026 berada dalam siklus Cutoff 2026 (14 Nov 2025 - 13 Nov 2026).
 * Jika tanggal sudah mencapai/melewati 14 November 2026, maka masuk siklus Cutoff 2027.
 */
export function getCurrentCutoffYear(refDate = new Date()): number {
  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1; // 1 - 12
  const day = refDate.getDate();

  if (month > 11 || (month === 11 && day >= 14)) {
    return year + 1;
  }
  return year;
}

/**
 * Menghasilkan objek rentang tanggal Cutoff untuk tahun tertentu.
 * Fixed formula: 14 November (year - 1) s/d 13 November (year)
 */
export function getCutoffPeriod(year: number): CutoffPeriod {
  const startYear = year - 1;
  const endYear = year;
  return {
    year,
    label: `Cutoff ${year} (14 Nov ${startYear} - 13 Nov ${endYear})`,
    startDate: `${startYear}-11-14`,
    endDate: `${endYear}-11-13`,
  };
}

/**
 * Menghasilkan daftar pilihan tahun cutoff untuk dropdown filter (misal: 5 tahun terakhir).
 */
export function getAvailableCutoffYears(count = 5): CutoffPeriod[] {
  const currentYear = getCurrentCutoffYear();
  const list: CutoffPeriod[] = [];
  for (let i = 0; i < count; i++) {
    list.push(getCutoffPeriod(currentYear - i));
  }
  return list;
}

/**
 * Format string periode 'YYYY-MM' atau 'YYYY-MM-DD' menjadi format singkat Indonesia
 * Contoh: '2025-11' -> 'Nov-25', '2026-01' -> 'Jan-26'
 */
export function formatMonthYearLabel(monthStr: string | null | undefined): string {
  if (!monthStr) return '-';
  const clean = String(monthStr).split('T')[0].trim();
  const parts = clean.split('-');
  if (parts.length < 2) return clean;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  if (monthIdx < 0 || monthIdx > 11) return clean;
  const shortYear = year.slice(-2);
  return `${monthNames[monthIdx]}-${shortYear}`;
}

export type LossRatioStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NO_DATA';

export interface LossRatioBadgeInfo {
  status: LossRatioStatus;
  label: string;
  ratioFormatted: string;
  badgeClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  excelColor: { bg: string; text: string };
  pdfColor: { bg: [number, number, number]; text: [number, number, number] };
}

/**
 * Evaluasi status kesehatan Loss Ratio:
 * - Hijau (Sehat)    : < 35%
 * - Kuning (Waspada)  : = 35% (35.00%)
 * - Merah (Kritis)    : > 35%
 */
export function evaluateLossRatio(ratio: number | null | undefined): LossRatioBadgeInfo {
  if (ratio === null || ratio === undefined || isNaN(ratio)) {
    return {
      status: 'NO_DATA',
      label: 'Tanpa Data',
      ratioFormatted: '-',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      textClass: 'text-slate-500 dark:text-slate-400',
      bgClass: 'bg-slate-50 dark:bg-slate-900',
      borderClass: 'border-slate-200 dark:border-slate-800',
      excelColor: { bg: 'FFF1F5F9', text: 'FF64748B' },
      pdfColor: { bg: [241, 245, 249], text: [100, 116, 139] },
    };
  }

  // Presisi 2 desimal
  const rounded = Math.round(ratio * 100) / 100;
  const ratioFormatted = `${rounded.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  if (rounded < 35.0) {
    return {
      status: 'HEALTHY',
      label: 'Sehat (<35%)',
      ratioFormatted,
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold',
      textClass: 'text-emerald-700 dark:text-emerald-400 font-bold',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderClass: 'border-emerald-200 dark:border-emerald-800/60',
      excelColor: { bg: 'FFD1FAE5', text: 'FF065F46' }, // Soft Emerald
      pdfColor: { bg: [209, 250, 229], text: [6, 95, 70] },
    };
  } else if (rounded === 35.0) {
    return {
      status: 'WARNING',
      label: 'Waspada (=35%)',
      ratioFormatted,
      badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold',
      textClass: 'text-amber-700 dark:text-amber-400 font-bold',
      bgClass: 'bg-amber-50 dark:bg-amber-950/20',
      borderClass: 'border-amber-200 dark:border-amber-800/60',
      excelColor: { bg: 'FFFEF3C7', text: 'FF78350F' }, // Soft Amber
      pdfColor: { bg: [254, 243, 199], text: [120, 53, 15] },
    };
  } else {
    return {
      status: 'CRITICAL',
      label: 'Kritis (>35%)',
      ratioFormatted,
      badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold',
      textClass: 'text-rose-700 dark:text-rose-400 font-bold',
      bgClass: 'bg-rose-50 dark:bg-rose-950/20',
      borderClass: 'border-rose-200 dark:border-rose-800/60',
      excelColor: { bg: 'FFFFE4E6', text: 'FFE11D48' }, // Soft Rose/Red
      pdfColor: { bg: [255, 228, 230], text: [225, 29, 72] },
    };
  }
}
