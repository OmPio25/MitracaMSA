/**
 * Glassmorphism & Smart Contrast Helper Utilities
 */

export function hexToRgba(hex: string | undefined | null, opacityPercent: number): string {
  if (!hex) return `rgba(255, 255, 255, ${opacityPercent / 100})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  if (c.length !== 6) {
    return `rgba(255, 255, 255, ${opacityPercent / 100})`;
  }
  const r = parseInt(c.substring(0, 2), 16) || 255;
  const g = parseInt(c.substring(2, 4), 16) || 255;
  const b = parseInt(c.substring(4, 6), 16) || 255;
  const a = Math.max(0, Math.min(1, Math.round(opacityPercent) / 100));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Menghitung tingkat kecerahan warna (Luminance) untuk menentukan apakah
 * teks & elemen di dalam kartu harus berwarna Putih (Dark Mode) atau Hitam (Light Mode).
 */
export function isColorDark(hex: string | undefined | null): boolean {
  if (!hex) return false;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16) || 255;
  const g = parseInt(c.substring(2, 4), 16) || 255;
  const b = parseInt(c.substring(4, 6), 16) || 255;
  // ITU-R BT.709 perceived luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 140;
}

export function getCardBlurClass(blur?: string | null): string {
  switch (blur) {
    case 'none':
      return 'backdrop-blur-none';
    case 'sm':
      return 'backdrop-blur-sm';
    case 'md':
      return 'backdrop-blur-md';
    case 'xl':
      return 'backdrop-blur-xl';
    case '2xl':
      return 'backdrop-blur-2xl';
    default:
      return 'backdrop-blur-xl';
  }
}
