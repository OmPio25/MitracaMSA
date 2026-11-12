# Changelog

Semua perubahan dan riwayat versi pada proyek **MitracaMSA** didokumentasikan di berkas ini.
Format penulisan mengikuti standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).

Skema Penomoran Versi:
- **Fase Development**: `0.0.1.<running_number>` (contoh: `0.0.1.1`, `0.0.1.2`, dst.)
- **Fase Live Production**: `1.0.0`

---

## [0.0.1.9] - 2026-11-12
### Ditambahkan
- Kolom `issue_date` (`date`) dan indeks `production_records_issue_date_idx` pada tabel database `production_records` untuk mencatat tanggal terbit riil polis (*submit date* / *booking date* / *tanggal terbit*).
- Dukungan pemetaan otomatis (*smart mapping*) pada template upload `MASTER_PRODUKSI` untuk membaca alias `"Submit date"`, `"BOOKING_DATE"`, `"tanggal terbit"`, `"issue date"`, dan variasi lainnya langsung tersimpan ke kolom `issue_date`.
- Indikator tanggal terbit pada tabel Polis di Explorer (`/explorer`), dialog rincian polis, serta ekspor file Excel Data Polis.
- Script pengujian komprehensif `src/scripts/test-agent-kpi-cutoff.ts` untuk verifikasi otomatis kalkulasi cutoff dan pemetaan upload.

### Diubah
- **Portal Mandiri Agen (`/agent/portal`)**:
  - **KPI Card Polis Pribadi**:
    - Angka Utama (Hero): Menampilkan **Premi 2026** (total premi polis produksi agen pada siklus Cutoff tahun berjalan).
    - Subteks: Menampilkan **Jumlah Polis 2026** (total nomor polis unik / `COUNT(DISTINCT policy_no)` pada siklus Cutoff tahun berjalan).
    - Ditambahkan penanda siklus tanggal cutoff aktif `(14-11-2025 s/d 13-11-2026)` di bawah judul card.
  - **KPI Card Loss Ratio Pribadi**:
    - Angka Utama (Hero): Menampilkan **Loss Ratio Pribadi Cutoff 2026** ($\frac{\text{Beban Klaim Cutoff}}{\text{Premi Cutoff}} \times 100\%$).
    - Standarisasi ambang batas warna underwriting Analitik: 🟢 Sehat (`< 35%`), 🟡 Waspada (`= 35%`), 🔴 Kritis (`> 35%`).
    - Subteks: Menampilkan Beban Klaim Cutoff dan jumlah berkas klaim diselesaikan pada periode berjalan.
- **Pembaruan Aturan CutOff Seluruh Sistem**:
  - Formula perhitungan produksi polis pada siklus Cutoff kini secara seragam mengacu pada tanggal terbit polis: `COALESCE(issue_date, start_period) BETWEEN startDate AND endDate`.
  - Formula perhitungan klaim pada siklus Cutoff mengacu pada tanggal penyelesaian: `date_of_settlement BETWEEN startDate AND endDate`.
  - Berlaku di `/agent/portal`, `/explorer` (filter polis & klaim), dan `/analytics` (GWP, Loss Ratio, dan tren bulanan).

---

## [0.0.1.8] - 2026-11-11
### Ditambahkan
- Fungsi utilitas `formatDate(dateInput, fallback)` dan `formatDateTime(dateInput, withSeconds, fallback)` di `src/lib/utils.ts` untuk normalisasi tanggal ke `dd-mm-yyyy` bebas dari bug pergeseran zona waktu (*timezone shift*).

### Diubah
- **Halaman Explorer (`/explorer`)**:
  - Kolom masa periode polis diubah menjadi format `dd-mm-yyyy s/d dd-mm-yyyy`.
  - Kolom tanggal settlement klaim diubah menjadi format `dd-mm-yyyy`.
  - Teks keterangan rentang Cutoff diubah menjadi `Rentang: 14-11-2025 s/d 13-11-2026`.
  - Modal rincian polis, modal klaim terkait, dan modal rincian klaim kini menampilkan tanggal seragam `dd-mm-yyyy`.
- **Halaman Analitik (`/analytics`)**:
  - Label dropdown filter Cutoff diubah menjadi `Cutoff {year} (14-11-{startYear} s/d 13-11-{endYear})`.
  - Keterangan filter diubah menjadi `(14-11 tahun lalu s/d 13-11 tahun ini)`.
- **Modul Lainnya**:
  - Tanggal login terakhir pengguna di `/admin/users` dinormalisasi ke `dd-mm-yyyy HH:mm`.
  - Tanggal aktivitas di Log Audit Trail (`/admin/audit-logs`) dinormalisasi ke `dd-mm-yyyy HH:mm:ss`.
  - Tanggal pada Portal Agen (`/agent/portal`) dinormalisasi ke `dd-mm-yyyy`.
- **Ekspor Data (Excel & PDF)**:
  - Format tanggal pada file Excel Eksplorasi Polis & Klaim otomatis menggunakan format `dd-mm-yyyy`.
  - Format rentang tanggal pada file ekspor Analitik & Log Audit dinormalisasi.

---

## [0.0.1.7] - 2026-11-11
### Ditambahkan
- Sistem Filter Periode terpadu pada **Filter Lengkap** di halaman Explorer (`/explorer`), berlaku untuk tab **Daftar Polis Asuransi** dan tab **Daftar Klaim Asuransi**:
  - Pilihan **Tahun Cutoff (Fixed Cycle)**: Mengikuti formula siklus tetap 14 November tahun lalu s/d 13 November tahun ini.
  - Pilihan **Semua Periode (All Time)** (`ALL`).
  - Pilihan **Kustom Tanggal Rentang** (`CUSTOM`) dengan input *Tanggal Mulai* dan *Sampai Dengan*.
  - Pill indikator periode aktif pada tombol toggle *Filter Lengkap*.
- Dukungan parameter `cutoffYear` langsung pada API `/api/explorer/policies` dan `/api/explorer/claims`.

### Diubah
- Default periode halaman Explorer kini otomatis menggunakan **Cutoff Tahun Berjalan** (contoh: `Cutoff 2026`).
- Tombol *Reset Filter* otomatis mengembalikan filter ke Cutoff tahun berjalan.

---

## [0.0.1.6] - 2026-11-11
### Ditambahkan
- Ikon navigasi berwarna semantik dinamis (*Vibrant Multi-Color Icons - Opsi A*) pada sidebar menu navigasi (`floating-sidebar.tsx`):
  - Analitik & Loss Ratio: Hijau Emerald (`text-emerald-500`)
  - Pohon Hirarki: Indigo Ungu (`text-indigo-500`)
  - Eksplorasi Polis & Klaim: Amber Emas (`text-amber-500`)
  - Upload Data: Sky Blue (`text-sky-500`)
  - Kelola User: Violet Ungu (`text-violet-500`)
  - Identitas Aplikasi: Fuchsia Pink (`text-fuchsia-500`)
  - Master Cabang: Royal Blue (`text-blue-500`)
  - Master Agen: Teal Tosca (`text-teal-500`)
  - Log Audit Trail: Rose Merah (`text-rose-500`)
  - Direktori / Portal Agen: Cyan Biru Muda (`text-cyan-500`)
  - Ganti Password: Amber Oranye (`text-amber-500`)
- Efek visual `scale-110` dan `opacity-100` saat hover/aktif dengan dukungan penuh Dark Mode.

---

## [0.0.1.5] - 2026-11-11
### Diubah
- Susunan teks pada kolom **No. Polis & No. Klaim** di tab *Daftar Klaim Asuransi* (`/explorer`):
  - **No. Polis** kini ditampilkan di bagian atas dengan font tebal (`font-bold`).
  - **No. Klaim** kini ditampilkan di bagian bawah dengan label kecil (`Klaim: {claimNo}`).
- Header kolom tabel disesuaikan menjadi **No. Polis & No. Klaim**.

---

## [0.0.1.4] - 2026-11-11
### Diperbaiki
- Masalah latar belakang dropdown transparan/putih saat mode Dark Mode pada dropdown *Maks. Kedalaman Hirarki* di halaman Analitik.
- Menambahkan aturan global `color-scheme: dark;` pada elemen `.dark` di `src/app/globals.css` untuk memastikan popup elemen `<select>` bawaan browser merender warna solid gelap (`#0f172a`).

---

## [0.0.1.3] - 2026-11-11
### Diperbaiki
- Harmonisasi tema Dark Mode pada halaman Analitik (`/analytics`) agar seragam dengan tema halaman lainnya:
  - Kanvas latar belakang (`bg-slate-50/50 dark:bg-[#0b0f19]`).
  - Kartu metrik KPI, grafik tren bulanan SVG, dan badge Loss Ratio.

---

## [0.0.1.2] - 2026-11-11
### Diperbaiki
- Memperbaiki layout dan CSS halaman login (`/login`) yang sebelumnya tampil tanpa style (HTML polos) akibat terhalangnya pemuatan stylesheet Next.js.
- Memindahkan skrip anti-FOUC ke dalam tag `<body>` dan membersihkan port cache 3000.

---

## [0.0.1.1] - 2026-11-11
### Ditambahkan
- Sistem tema ganda global (**Light & Dark Theme**) dengan penyimpanan preferensi pengguna via `localStorage`.
- Komponen *Floating Theme Toggle* di pojok kanan bawah pada seluruh halaman aplikasi utama.
- Isolasi halaman login (`/login`) agar tetap bertema khusus dengan kontrol tema manual mandiri.

---

## [0.0.1] - 2026-11-11
### Ditambahkan
- Baseline awal repository dalam tahap aktif *Development* sebelum rilis live production `1.0.0`.
- Tag git baseline `v0.0.1` sebagai titik acuan rollback utama.
