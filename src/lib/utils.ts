import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalisasi format tanggal menjadi dd-mm-yyyy saat ditampilkan di aplikasi.
 * Menghindari masalah pergeseran zona waktu pada parsing string "YYYY-MM-DD".
 */
export function formatDate(dateInput?: string | Date | null, fallback = '-'): string {
  if (!dateInput) return fallback;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return fallback;

    // Jika format sudah dd-mm-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // Jika format YYYY-MM-DD atau diawali YYYY-MM-DD (e.g. ISO string "2026-01-23" atau "2026-01-23T...")
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, yyyy, mm, dd] = match;
      return `${dd}-${mm}-${yyyy}`;
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return fallback;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Normalisasi format tanggal & waktu menjadi dd-mm-yyyy HH:mm:ss atau dd-mm-yyyy HH:mm
 */
export function formatDateTime(
  dateInput?: string | Date | null,
  withSeconds = true,
  fallback = '-'
): string {
  if (!dateInput) return fallback;

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return fallback;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (!withSeconds) {
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}
