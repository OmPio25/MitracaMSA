# Dokumentasi Proyek MitracaMSA
## Modular Insurance Agency Management System

Folder ini berisi seluruh dokumen cetak biru (*blueprint*), rencana implementasi teknis (*implementation plans*), serta rekam jejak progres pengerjaan (*walkthrough*) dari proyek **MitracaMSA**.

---

### Daftar Dokumen

| No | Nama File | Kategori | Ringkasan Isi Dokumen |
|---|---|---|---|
| 1 | **[`walkthrough.md`](./walkthrough.md)** | **Progres & Rekap Utama** | Rekapitulasi menyeluruh seluruh modul yang telah dibangun (Tahap 1 & Tahap 2), skema database, penanganan deduplikasi, panduan RBAC, dan hasil pengujian otomatis. |
| 2 | **[`phase-1-blueprint.md`](./phase-1-blueprint.md)** | **Cetak Biru Arsitektur** | Blueprint teknis Tahap 1: Matriks 7 Peran RBAC & batasan data, spesifikasi 3 template sumber Excel baku, trigger self-healing hirarki, dan formula Loss Ratio. |
| 3 | **[`plan-master-agent-management.md`](./plan-master-agent-management.md)** | **Rencana Teknis Modul** | Spesifikasi modul Master Agen: Tambah Agen Baru (`Profile ID`), 4 jenjang karir (*Partner*), 3 status keagenan (*Aktif, Non Aktif, Cut*), mutasi upline, proteksi *anti-circular loop*, dan KPI card 3-in-1. |
| 4 | **[`plan-floating-left-navigation.md`](./plan-floating-left-navigation.md)** | **Rencana Teknis Modul** | Rencana transformasi navigasi menjadi *Floating Left Sidebar Navigation* yang modern dan responsif. |
| 5 | **[`plan-collapsed-settings-navigation.md`](./plan-collapsed-settings-navigation.md)** | **Rencana Teknis Modul** | Rencana penyempurnaan mode ramping (*Collapsed*): submenu pengaturan tampil sebagai deretan ikon mandiri dengan *floating tooltip* melayang. |
| 6 | **[`plan-compact-pdf-tables.md`](./plan-compact-pdf-tables.md)** | **Rencana Teknis Modul** | Standardisasi format tabel ringkas multi-tabel 5 kolom seragam pada hasil ekspor PDF eksekutif untuk semua peran (*roles*). |
| 7 | **[`plan-upload-deduplication-rules.md`](./plan-upload-deduplication-rules.md)** | **Rencana Teknis Modul** | Spesifikasi 4 aturan deduplikasi ingestion: *skip* duplikat persis, selisih $\Delta$ endorsement premi, endorsement non-nominal Rp 0, dan *upsert* klaim. |
| 8 | **[`plan-login-background-customization.md`](./plan-login-background-customization.md)** | **Rencana Teknis Modul** | Spesifikasi kustomisasi *branding*, nama aplikasi, penggantian logo, dan latar belakang login dinamis. |
| 9 | **[`subagent-schema-architect.md`](./subagent-schema-architect.md)** | **Arsitektur Subagent** | Dokumentasi instruksi teknis subagent perancang skema PostgreSQL Drizzle ORM awal. |
| 10 | **[`security-audit-2026-11-04.md`](./security-audit-2026-11-04.md)** | **Audit Keamanan & Patching** | Laporan audit keamanan komprehensif White-Box & SAST, serta dokumentasi 5 patch keamanan yang telah diterapkan. |
| 11 | **[`plan-full-upgrade-impact-analysis.md`](./plan-full-upgrade-impact-analysis.md)** | **Analisis Dampak Sistem** | Analisis dampak kerusakan teknis jika dilakukan update serentak ke Next.js 16, React 19, Tailwind v4, dan Drizzle ORM 0.45. |
| 12 | **[`plan-full-migration-refactoring-roadmap.md`](./plan-full-migration-refactoring-roadmap.md)** | **Peta Jalan Refactoring** | Panduan 5 tahapan teknis terstruktur untuk migrasi dan refactoring menyeluruh ke stack modern. |
| 13 | **[`plan-full-refactoring-pros-and-cons.md`](./plan-full-refactoring-pros-and-cons.md)** | **Kelebihan & Kekurangan** | Evaluasi komparatif mendalam dari 6 dimensi: Server, Function, Fleksibilitas, UI/UX, Keamanan, dan Kecepatan Akses. |

---

*Terakhir diperbarui: 04 November 2026*
