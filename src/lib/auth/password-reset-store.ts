export interface ResetTokenEntry {
  userId: string;
  email: string;
  code: string;
  expiresAt: number; // timestamp in ms
}

// Global declaration to survive Next.js HMR in development mode
const globalForReset = globalThis as unknown as {
  passwordResetTokens?: Map<string, ResetTokenEntry>;
};

export const resetTokens =
  globalForReset.passwordResetTokens || new Map<string, ResetTokenEntry>();

if (process.env.NODE_ENV !== 'production') {
  globalForReset.passwordResetTokens = resetTokens;
}

/**
 * Menghasilkan kode numerik 6-digit acak
 */
export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Menyimpan token/kode reset password ke memory store (berlaku 15 menit)
 */
export function storeResetToken(email: string, userId: string): string {
  const code = generateResetCode();
  const cleanEmail = email.trim().toLowerCase();
  resetTokens.set(cleanEmail, {
    userId,
    email: cleanEmail,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 menit
  });
  return code;
}

/**
 * Memverifikasi validitas kode reset password
 */
export function verifyResetToken(email: string, code: string): ResetTokenEntry | null {
  const cleanEmail = email.trim().toLowerCase();
  const entry = resetTokens.get(cleanEmail);
  if (!entry) return null;

  // Cek apakah kode telah expired
  if (Date.now() > entry.expiresAt) {
    resetTokens.delete(cleanEmail);
    return null;
  }

  // Cek kecocokan kode verifikasi
  if (entry.code !== code.trim()) {
    return null;
  }

  return entry;
}

/**
 * Menghapus token reset setelah berhasil digunakan
 */
export function consumeResetToken(email: string): void {
  resetTokens.delete(email.trim().toLowerCase());
}
