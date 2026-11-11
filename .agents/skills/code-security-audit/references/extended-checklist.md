# Extended Security Checklist & Remediation Guide

Panduan checklist mendalam untuk audit keamanan Next.js 14 (App Router) + TypeScript + Drizzle ORM + PostgreSQL.

---

## 1. Authentication & Session Security (Next.js & JWT)

### Keamanan JWT (`jose` / `jsonwebtoken`)
* **Algoritma Eksplisit:** Pastikan verifikasi token mendefinisikan algoritma secara eksplisit (contoh: `HS256` atau `RS256`). Hindari memperbolehkan header `none`.
* **Secret Key Strength:** Secret key harus minimal 32-64 karakter acak (256-bit entropy) dan disimpan di environment variable (`JWT_SECRET`), bukan default fallback string.
* **Masa Berlaku (Expiration):**
  * Access Token: Max 15 - 60 menit.
  * Refresh Token: Disimpan aman di database dengan status revoke / rotate.
* **Cookie Flags:** Jika token disimpan di cookie:
  * `httpOnly: true` (mencegah XSS membaca token)
  * `secure: process.env.NODE_ENV === 'production'` (hanya lewat HTTPS)
  * `sameSite: 'lax'` atau `'strict'` (mitigasi CSRF)
  * `path: '/'`

---

## 2. Authorization & Broken Access Control (OWASP A01)

### Route Handler & Server Actions Protection
* **Middleware vs Handler Verification:** Middleware Next.js hanya boleh menjadi *first-line defense* (redirect unauthenticated user). Setiap Route Handler (`app/api/**/route.ts`) atau Server Action **wajib** memvalidasi ulang identitas dan hak akses user secara independen.
* **Insecure Direct Object References (IDOR):**
  * Selalu sertakan konteks user/tenant yang sedang login pada klausa query database:
    ```typescript
    // RENTAN (IDOR):
    await db.select().from(orders).where(eq(orders.id, orderId));

    // AMAN:
    await db.select().from(orders).where(
      and(
        eq(orders.id, orderId),
        eq(orders.userId, currentUser.id) // atau companyId/role check
      )
    );
    ```

---

## 3. Database & Injection Security (Drizzle ORM)

### Drizzle Query Safety
* **Parameterized Queries:** Drizzle secara default menggunakan parameterized queries pada query builder-nya.
* **Raw SQL Guard (`sql\`...\``):**
  * Hindari string concatenation langsung ke template literal `sql`:
    ```typescript
    // RENTAN:
    sql`SELECT * FROM users WHERE username = '${userInput}'`;

    // AMAN:
    sql`SELECT * FROM users WHERE username = ${userInput}`; // Param binding otomatis
    ```
* **Input Validation (`zod`):** Validasi seluruh `req.json()` dan query parameter dengan schema Zod sebelum diproses atau diteruskan ke query DB.

---

## 4. HTTP Headers & Configuration Hardening

### `next.config.mjs` Security Headers
Pastikan HTTP response menyertakan header keamanan modern:

```javascript
// next.config.mjs
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  }
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 5. File Upload & Processing Security

* **Validasi Tipe File (MIME Sniffing):** Jangan hanya mengandalkan ekstensi nama file atau `file.type` dari browser. Gunakan *magic bytes verification* jika memproses file sensitif.
* **Path Traversal Protection:** Pastikan nama file yang disimpan di disk telah di-sanitize (gunakan UUID / random string) dan tidak mengandung `../`.
* **File Size Limit:** Batasi payload size di Next.js route handler untuk mencegah DoS / Memory exhaustion.

---

## 6. Secrets & Environment Management

* Pastikan file `.env`, `.env.local`, `.env.production` terdaftar di `.gitignore`.
* Jangan mengekspos environment variable sensitif dengan prefix `NEXT_PUBLIC_` (semua prefix `NEXT_PUBLIC_` akan di-bundle ke client-side JavaScript yang bisa dibaca siapa saja di browser).
