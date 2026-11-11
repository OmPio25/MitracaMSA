# Walkthrough: Modul Eksplorasi Detail Polis & Klaim (Policy & Claim Explorer)

Modul **Eksplorasi Detail Polis & Klaim** ([`/explorer`](file:///home/ompiovm/Project/MitracaMSA/src/app/explorer/page.tsx)) telah selesai dibangun, terintegrasi dengan RBAC, dan diverifikasi dengan data riil (776 polis dan 7.777 klaim yang ada di database).

---

## 1. Fitur-Fitur Utama yang Selesai Dibangun

### A. Tab Navigasi Ganda (*Polis & Klaim*)
Pengguna dapat beralih dengan satu klik antara:
* 📑 **Daftar Polis Asuransi** (*Production Records*): Menampilkan data polis, nomor SPAU, masa berlaku pertanggungan, nama tertanggung, produk, coverage, nilai premi, TSI, status polis, dan ringkasan nilai premi/TSI.
* 🛡️ **Daftar Klaim Asuransi** (*Claims*): Menampilkan nomor berkas klaim, nomor polis terkait, tanggal penyelesaian (*settlement date*), underwriting year (*UW Year*), sebab kerugian (*cause of loss*), nilai beban klaim (*Gross Claim*), dan nilai ganti rugi (*Indemnity*).

### B. Pencarian Cepat & Filter Multidimensi
* **Pencarian Cepat (*Debounced Search*)**: Mencari secara instan berdasarkan No. Polis, No. Klaim, Nama Tertanggung, Kode Agen, Nama Agen, Sebab Klaim, atau No. SPAU.
* **Filter Cabang**: Memfilter data per kantor cabang (otomatis terisolasi untuk peran KACAB & PIC Cabang).
* **Filter Produk & Status**: Filter berdasarkan nama lini produk atau status polis (*New, Active, Lapsed, Endorsed*).
* **Filter Underwriting Year**: Memfilter tahun pertanggungan pada klaim.
* **Rentang Tanggal**: Memfilter tanggal mulai polis atau tanggal settlement klaim.

### C. Modal Detail Interaktif (*Object Information 1 s/d 15 JSONB*)
Setiap baris data dilengkapi tombol **"Detail"**:
* **Untuk Polis Asuransi:**
  1. **Header & Status:** No. Polis, SPAU, Masa Pertanggungan (Mulai - Akhir).
  2. **Rincian Finansial:** Nilai Premi Bruto, Total Sum Insured (TSI IDR), dan Komisi Agensi.
  3. **Visualisasi Objek Pertanggungan (*JSONB*)**: Menampilkan seluruh data dinamis *Object Information 1 s/d 15* (tipe kendaraan, merek, model, nomor plat/polisi, tahun pembuatan, warna, bahan bakar, dan wilayah penggunaan) yang tersimpan di kolom PostgreSQL JSONB.
  4. **Profil Agen & Cabang:** Kode agen, nama agen, peringkat keagenan, cabang resmi, dan *materialized hierarchy path*.
  5. **Riwayat Klaim Terkait (*Cross-Check*)**: Sistem otomatis mengecek dan menampilkan daftar klaim yang pernah terjadi pada nomor polis tersebut beserta tanggal dan nilai klaimnya.
* **Untuk Klaim Asuransi:**
  1. Rincian beban klaim (*Gross Claim*), ganti rugi dibayar (*Indemnity*), dan potongan risiko sendiri (*Deductible*).
  2. Detail penyebab kerugian (*Cause of Loss*).
  3. Agen dan cabang pelapor klaim.

### D. Ekspor Data ke Excel (.xlsx)
Tombol **"Ekspor Excel (.xlsx)"** otomatis mengekspor seluruh baris data hasil filter pencarian aktif ke dalam file Excel resmi (`Data_Polis_Mitraca_YYYY-MM-DD.xlsx` atau `Data_Klaim_Mitraca_YYYY-MM-DD.xlsx`).

---

## 2. File yang Dibuat & Dimodifikasi

| Komponen | File | Deskripsi |
|---|---|---|
| **API Polis** | [`src/app/api/explorer/policies/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/explorer/policies/route.ts) | Endpoint kueri daftar polis dengan filter RBAC, search, pagination, dan agregasi total. |
| **API Detail Polis** | [`src/app/api/explorer/policies/[id]/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/explorer/policies/[id]/route.ts) | Endpoint rincian satu polis, metadata JSONB Objek 1-15, dan relasi klaim terkait. |
| **API Klaim** | [`src/app/api/explorer/claims/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/explorer/claims/route.ts) | Endpoint kueri daftar klaim dengan filter RBAC, search, pagination, dan agregasi total. |
| **API Ekspor Excel** | [`src/app/api/explorer/export/xlsx/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/explorer/export/xlsx/route.ts) | Endpoint unduh spreadsheet Excel untuk hasil pencarian aktif. |
| **Generator Excel** | [`src/lib/export/excel-explorer-generator.ts`](file:///home/ompiovm/Project/MitracaMSA/src/lib/export/excel-explorer-generator.ts) | Generator file .xlsx dengan format profesional, header beku, dan angka finansial rapi. |
| **UI Halaman Explorer** | [`src/app/explorer/page.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/app/explorer/page.tsx) | Antarmuka pengguna lengkap dengan KPI summary, tabel data, filter drawer, dan modal rincian objek. |
| **Navigasi Header** | [`src/components/shared/nav-header.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/shared/nav-header.tsx) | Menambahkan menu **"Polis & Klaim"** di navigasi utama aplikasi. |

---

## 3. Hasil Pengujian & Verifikasi

1. **Kompilasi TypeScript:**
   * Perintah `npx tsc --noEmit` lolos dengan **Exit Code 0** (0 error).
2. **Kueri Data Riil:**
   * `GET /api/explorer/policies?limit=2` $\rightarrow$ Berhasil memuat data polis dengan detail JSONB.
   * `GET /api/explorer/claims?limit=2` $\rightarrow$ Berhasil memuat 7.777 data klaim.
   * `GET /api/explorer/policies/[id]` $\rightarrow$ Berhasil memuat rincian objek kendaraan (Alphard, Toyota, Minibus, Plat BA 123 ACA, dll.) dan cross-check riwayat klaim.
3. **Ekspor Spreadsheet:**
   * `GET /api/explorer/export/xlsx?type=policies` $\rightarrow$ Status `200 OK`, header `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

## 4. Pembersihan Data Duplikat & Aturan Upload Baru (Deduplikasi & Endorsement)

### Diagnosa Kasus Duplikasi Jennie Verena Lauw (800439)
* **Penyebab:** File `Produksi.xlsx` sebelumnya terunggah 2 kali pada tanggal 29 Oktober 2026 (Batch `25a2d118` dan Batch `f5264a83`), sehingga jumlah polis di database sempat membengkak dari 388 menjadi 776, dan polis Jennie Verena Lauw yang seharusnya 6 muncul menjadi 12.
* **Pembersihan:** Batch duplikat `25a2d118` telah dibersihkan secara aman dari tabel `production_records` dan status batch diubah menjadi `FAILED (CLEANED_DUPLICATE)`.
* **Kondisi Database Terkini:**
  * Total Polis Aktif di Database: **388 polis unik** (sesuai file sumber).
  * Total Polis Jennie Verena Lauw: **6 polis unik** (`100020526090000022` s/d `100020526090000077`).

### Implementasi Aturan Upload Baru di [`unified-processor.ts`](file:///home/ompiovm/Project/MitracaMSA/src/lib/ingestion/unified-processor.ts)
1. **Aturan 1 (Duplikat Persis - MasterProduksi):** Baris file dengan nominal dan keterangan yang sama persis dengan database otomatis **di-SKIP** (tidak membuat baris ganda).
2. **Aturan 2 (Endorsement Nominal - MasterProduksi):** Data historis tetap utuh (*audit trail* terjaga). Baris baru disisipkan dengan status `'Endorsement'`, `prevPolicy`, dan nilai selisih (*Delta Nominal*):
   $$\Delta \text{Premi} = \text{Premi Baru} - \sum \text{Premi Sebelumnya}$$
3. **Aturan 3 (Endorsement Non-Nominal - MasterProduksi):** Jika terjadi koreksi teks/objek tanpa perubahan nominal, baris endorsement baru dicatat dengan `nilaiPremi: 0.00` dan rincian objek terbaru.
4. **Aturan 4 (MasterClaim Upsert & Deduplikasi):** Berkas klaim yang sama persis otomatis **di-SKIP**. Jika tanggal settlement atau nilai klaim disesuaikan, sistem melakukan **UPSERT** (*update in-place*) tanpa menggandakan baris.

### Hasil Verifikasi Otomatis
Pengujian regresi otomatis di [`test-upload-rules.ts`](file:///home/ompiovm/Project/MitracaMSA/src/scripts/test-upload-rules.ts) mengonfirmasi 100% lulus:
* ✅ **Rule 1 PASSED:** Polis duplikat persis berhasil dilewati (*skipped*).
* ✅ **Rule 2 PASSED:** Selisih endorsement nominal terhitung akurat (+Rp 1.000.000).
* ✅ **Rule 3 PASSED:** Endorsement non-nominal tercatat dengan premi Rp 0,00 dan rincian objek diperbarui.
* ✅ **Rule 4 PASSED:** Berkas klaim duplikat dilewati dan koreksi settlement di-upsert tanpa duplikasi.

---

## 5. Kustomisasi Analitik Peran Agen (Kinerja Personal & Kinerja Group)

### Fitur yang Diterapkan:
1. **Branch Scoping Khusus Agen:**
   * Untuk peran `AGENT` dan `OFFICER_AGENT`, hak akses difokuskan pada **pohon hirarki keagenan (`materializedPath`) lintas cabang secara nasional**, sehingga downline yang beroperasi di cabang berbeda (misal Jennie Verena Lauw & Robert Wiharja di KPO) tidak tereliminasi oleh cabang leader (Kelapa Gading).
2. **Tab 1: Kinerja Personal:**
   * Khusus peran Agen, tab **"Kinerja Personal"** menampilkan portofolio atas nama pribadi akun agen yang bersangkutan (premi pribadi, polis pribadi, klaim pribadi, dan loss ratio pribadi tanpa menggabungkan downline).
3. **Tab 2: Kinerja Group:**
   * Menampilkan portofolio gabungan seluruh jaringan tim keagenan (leader + downline bertingkat).
4. **Hierarki TreeView Opsi 1 (Panah `↳`):**
   * Leader selalu berada pada baris pertama (Index 0) dengan badge mahkota 👑.
   * Setiap downline memiliki indentasi berjenjang dengan ikon panah belok ke bawah `↳` (*CornerDownRight*).
   * Keterangan upline langsung disajikan ringkas di bawah nama: `Kode: {kode} • Upline Langsung: {uplineName} ({uplineCode})`.
   * Tersedia toggle cakupan: **Pohon Beraktivitas / Terkait** vs **Seluruh Jaringan Tim**.

---

## 6. Standardisasi Tabel Ringkas & Navigasi 4-Tab untuk Semua Role

### A. Struktur Navigasi Tab Sesuai Role
1. **Untuk Role Cabang / PIC Cabang (`KACAB`, `PIC_CABANG`):**
   * **Tab 1: Kinerja Cabang** $\rightarrow$ Menampilkan kinerja khusus kantor cabang yang login (format ringkas 4 kolom).
   * **Tab 2: Kinerja Agen** $\rightarrow$ Menampilkan ringkasan total portofolio seluruh agen yang terdaftar di cabang tersebut + tabel ringkas 5 kolom (minimal 50 agen per halaman).
   * **Tab 3: Kinerja Agen [Target]** $\rightarrow$ *Kondisional:* Otomatis muncul ketika filter kode/nama agen diinput, menampilkan rincian portofolio personal agen yang dicari.
   * **Tab 4: Kinerja Group Agent [Target]** $\rightarrow$ *Kondisional:* Otomatis muncul ketika filter kode/nama agen diinput, menampilkan hirarki TreeView tim downline agen target dengan konektor `↳` dan upline langsung.
   * **Tab 5: Top Penyebab Klaim** $\rightarrow$ Analisis penyebab kerugian klaim.

2. **Untuk Role SuperAdmin, Admin, dan Audit (`SUPERADMIN`, `ADMIN`, `AUDIT`):**
   * **Tab 1: Kinerja Cabang** $\rightarrow$ Menampilkan kinerja seluruh cabang secara nasional (ringkas 4 kolom).
   * **Tab 2: Kinerja Agen** $\rightarrow$ Menampilkan banner ringkasan total seluruh agen nasional (total agen, total premi, total klaim, dan agregat loss ratio) + tabel rincian per agen (50 agen per halaman).
   * **Tab 3: Kinerja Agen [Target]** $\rightarrow$ *Kondisional:* Muncul saat filter nama/kode agen diisi (menampilkan portofolio personal agen target).
   * **Tab 4: Kinerja Group Agent [Target]** $\rightarrow$ *Kondisional:* Muncul saat filter nama/kode agen diisi (menampilkan TreeView silsilah jaringan downline agen target).
   * **Tab 5: Top Penyebab Klaim** $\rightarrow$ Analisis penyebab kerugian klaim nasional.

3. **Untuk Role Agen / Officer Agent (`AGENT`, `OFFICER_AGENT`):**
   * **Tab 1: Kinerja Personal** (portofolio akun pribadi)
   * **Tab 2: Kinerja Group** (silsilah TreeView jaringan leader + downline)
   * **Tab 3: Top Penyebab Klaim**

### B. Format Tabel Ringkas 5 Kolom Konsisten
Seluruh tabel kinerja agen kini menggunakan format 5 kolom multi-baris yang seragam:
1. **Profil Agen / Silsilah Jaringan:** Nama Agen, Kode Agen, dan Upline Langsung.
2. **Peringkat & Cabang:** Peringkat keagenan baris 1, Nama Cabang baris 2.
3. **Total Premi (Polis):** Nominal premi IDR tebal baris 1, Jumlah polis aktif baris 2.
4. **Total Klaim (Kasus):** Nominal klaim IDR tebal baris 1, Jumlah kasus klaim baris 2.
5. **Loss Ratio & Status:** Pill badge gabungan `XX,XX% • Sehat/Waspada/Kritis`.

### C. Pagination & Ekspor Excel
* Default pagination ditetapkan **50 entri per halaman** (`pageSize = 50`).
* Ekspor Excel (`.xlsx`) secara dinamis menyertakan Sheet Kinerja Cabang, Sheet Kinerja Agen, Sheet Personal Target, Sheet Group Target (dengan TreeView `↳`), dan Sheet Penyebab Klaim.
   * Menampilkan portofolio gabungan seluruh jaringan: **Leader (Akun Anda) + seluruh Downline**.
   * **Wajib di Baris Pertama (Index 0):** Akun Leader (`👑 Leader (Anda)`) dijamin secara mutlak tampil di baris teratas tabel sebelum anggota downline.
   * **Batas Maksimal 4 Tingkat Kedalaman (*Hierarchy Depth Limit*):** Sesuai aturan bisnis keagenan, downline yang dihitung dibatasi hingga maksimal 4 level kedalaman relatif terhadap leader (`Level 1 (Direct)` s/d `Level 4`).
   * **Filter Kedalaman Interaktif (*Testing Mode*):** Dilengkapi dropdown parameter *"Maks. Kedalaman Hirarki"* di panel filter utama (pilihan: Level 1, Level 2, Level 3, Level 4, atau Tanpa Batas) untuk kemudahan pengujian.
   * Dilengkapi badge pembeda visual yang jelas pada kolom *Level & Peran*:
     * `👑 Leader (Anda)` (aksen emas amber dan icon mahkota).
     * `Level 1 (Direct) • Downline` (badge biru).
     * `Level 2 • Downline` (badge indigo).
     * `Level 3 • Downline` (badge ungu).
     * `Level 4 • Downline` (badge fuchsia).
4. **Sinkronisasi Ekspor Spreadsheet (.xlsx):**
   * Ekspor laporan analitik untuk peran Agen otomatis menghasilkan sheet **Kinerja Personal** dan **Kinerja Group** lengkap dengan status peran dan level kedalaman masing-masing anggota.

---

## 6. Hierarki TreeView Kinerja Group & Sinkronisasi Dinamis KPI / Grafik

### A. Rekonstruksi Urutan Hirarki TreeView (DFS Traversal)
* **Struktur Jaringan Ekasurya Halim (`871300`):**
  * `👑 [Level 0] 871300 - Ekasurya Halim` (Leader)
    * `└── [Level 1] 800439 - Jennie Verena Lauw` (Upline: `871300 Ekasurya Halim`)
      * `└── [Level 2] 800538 - Prasetiyo Febriyanto` (Upline: `800439 Jennie Verena Lauw`)
    * `└── [Level 1] 400400 - Robert Wiharja` (Upline: `871300 Ekasurya Halim`)
    * `└── [Level 1] 800486 - Kok Susanti` (Upline: `871300 Ekasurya Halim`)
    * `└── [Level 1] 800438 - Faula Iman Sitompul` (Upline: `871300 Ekasurya Halim`)
      * `├── [Level 2] 800479 - Dawaani Hawa` (Upline: `800438 Faula Iman Sitompul`)
      * `└── [Level 2] 800478 - Youbert Ngangi` (Upline: `800438 Faula Iman Sitompul`)
        * `└── [Level 3] 861059 - Safril Hidayat` (Upline: `800478 Youbert Ngangi`)
* **Jawaban Kasus Safril Hidayat (`861059`):**
  * Safril Hidayat adalah **Downline Level 3**, dengan upline langsung: **Youbert Ngangi (`800478`)**.
  * Youbert Ngangi adalah downline dari **Faula Iman Sitompul (`800438`)**, yang merupakan downline langsung (Level 1) dari **Ekasurya Halim (`871300`)**.
  * Agen perantara (`800438` & `800478`) kini diikutsertakan dalam pohon jaringan sebagai **Jembatan Hirarki** sehingga silsilah pohon tidak terputus.
* **Kolom Tambahan:** Kolom **"Upline Langsung (Direct)"** menampilkan nama dan kode upline langsung untuk setiap baris downline.
* **Filter Cakupan Pohon:** Pengguna dapat beralih antara:
  * `Pohon Beraktivitas / Terkait (9 Agen)`: Hanya menampilkan leader, downline berproduksi/klaim, dan leluhur jembatan hirarkinya.
  * `Seluruh Jaringan Tim (71 Agen)`: Menampilkan seluruh downline hingga batas kedalaman 4 level.

### B. Desain Ringkas 5 Kolom (*Compact Multi-line UI*)
Untuk menghemat ruang pandang layar (*view table*) dan menghilangkan kebutuhan *horizontal scroll*, tabel dirampingkan dari 11 kolom menjadi **5 kolom terpadu**:
1. **Agen & Silsilah Jaringan:** Menggabungkan indentasi TreeView dengan ikon modern `CornerDownRight` (`↳`), Nama Agen (bold), Badge Level/Leader, serta sub-teks Kode Agen dan Upline Langsung (`Kode: 861059 • Upline Langsung: Youbert Ngangi (800478)`). Format `↳` juga diekspor secara rapi dan stabil ke Excel.
2. **Peringkat & Cabang:** Peringkat jabatan agen di baris atas dan nama kantor cabang di baris bawah.
3. **Total Premi (Polis):** Nominal premi bruto (bold) dipadukan dengan jumlah polis di baris bawah.
4. **Total Klaim (Kasus):** Nilai klaim dibayar (warna rose) dipadukan dengan jumlah kasus klaim di baris bawah.
5. **Loss Ratio & Status:** Badge terpadu persentase rasio klaim dan status underwriting (contoh: `🔴 70.92% • Kritis` atau `🟢 10.65% • Sehat`).

### C. Sinkronisasi Dinamis Kartu KPI & Grafik Sesuai Tab Aktif
* **Saat Memilih Tab 1: Kinerja Personal:**
  * Kartu KPI finansial otomatis menampilkan **data portofolio pribadi akun agen** (Premi Pribadi, Klaim Pribadi Rp 10.946.025, Loss Ratio Pribadi, Polis Pribadi).
  * Grafik Tren Bulanan & Komposisi Produk otomatis menampilkan transaksi pribadi agen.
  * Ditampilkan banner indikator: `👤 Mode Personal Aktif`.
* **Saat Memilih Tab 2: Kinerja Group:**
  * Kartu KPI finansial otomatis menampilkan **akumulasi seluruh jaringan** (Total Premi Group Rp 37.440.000, Total Klaim Group Rp 26.552.810, Loss Ratio Group 70.92%).
  * Grafik Tren Bulanan & Komposisi Produk otomatis menampilkan akumulasi portofolio tim.
  * Ditampilkan banner indikator: `👥 Mode Group Aktif`.

---

## 7. Modul Ekspor PDF Laporan Eksekutif (Executive PDF Report)

### A. Fitur yang Selesai Dibangun:
1. **Engine Generator PDF Resmi ([`src/lib/export/pdf-analytics-generator.ts`](file:///home/ompiovm/Project/MitracaMSA/src/lib/export/pdf-analytics-generator.ts)):**
   * Menggunakan format **Landscape A4 (297mm x 210mm)** agar data multi-kolom dapat tercetak proporsional dan tidak terpotong.
   * **Kop Surat Eksekutif:** Memuat logo/identitas `MITRACAMSA — EXECUTIVE ANALYTICS & LOSS RATIO REPORT`, metadata periode cutoff, kantor cabang, target agen, dan waktu cetak (WIB).
   * **5 Kartu Ringkasan KPI Eksekutif:**
     * Total Premi Bruto (IDR) & Jumlah Polis Aktif
     * Total Beban Klaim (IDR) & Jumlah Kasus Klaim
     * Loss Ratio (%) dengan pewarnaan badge otomatis sesuai ambang batas
     * Net Underwriting Margin (Premi - Klaim - Komisi)
     * Total Komisi Agensi (Beban Akuisisi)
   * **Legend Ambang Batas Underwriting:** Keterangan batas toleransi dengan lingkaran vektor berwarna (`doc.circle`):
     * 🟢 Hijau: `Sehat: LR < 35,00%`
     * 🟡 Kuning: `Waspada: LR = 35,00%`
     * 🔴 Merah: `Kritis: LR > 35,00%`
     *(Label disingkat menjadi `LR` dan simbol peluru diganti lingkaran vektor penuh sehingga terbebas dari encoding bug `%Ï` serta bebas tumpang tindih).*
   * **Proporsi Jarak Vertikal yang Konsisten:**
     * Ruang jarak antara kotak Ambang Batas Underwriting dengan judul tabel pertama di bawahnya (`1. KINERJA PRODUKSI & LOSS RATIO CABANG`) ditingkatkan menjadi **8 mm**, sama persis dengan jarak antar-tabel yang ada di bawahnya.
     * Jarak antara judul sub-bab dan garis awal tabel distandardisasi menjadi **3 mm** di seluruh seksi dokumen.
   * **Tabel Multi-Dimensi Otomatis:**
     * *Standardisasi Lebar Penuh (269mm):* Seluruh tabel (Cabang, Agen, Group TreeView, dan Top Penyebab Klaim) telah diselaraskan dengan parameter `tableWidth: contentWidth = 269mm` dan jumlah lebar kolom yang persis sama, sehingga garis batas kiri (margin 14mm) dan kanan (margin 283mm) sejajar 100% simetris dan rapi.
     * *Role Non-Agent:* Tabel Kinerja Cabang, Tabel Kinerja Seluruh Agen, Tabel Silsilah Group Target (TreeView dengan penanda `[Leader]` dan `\-- ` tanpa distorsi unicode), dan Tabel Analisis Top Penyebab Klaim.
     * *Role Agent:* Box Kinerja Personal (Pribadi), Tabel Silsilah Group Keagenan (TreeView `\-- `), dan Tabel Top Penyebab Klaim.
   * **Running Footer:** Menampilkan nomor halaman (`Halaman X dari Y`) dan watermark kerahasiaan dokumen di seluruh halaman secara dinamis.
2. **API Endpoint Ekspor PDF ([`src/app/api/analytics/export/pdf/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/analytics/export/pdf/route.ts)):**
   * Menerima query parameter yang sama persis dengan filter dashboard analitik (`cutoffYear`, `branchId`, `agentCode`, `uwYear`, dll).
   * Mengembalikan respons `Content-Type: application/pdf` dengan header `Content-Disposition: attachment; filename="Laporan_Eksekutif_Analitik_Loss_Ratio_...pdf"`.
3. **Integrasi UI Dashboard ([`src/components/analytics/analytics-filter.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/analytics/analytics-filter.tsx) & [`src/app/analytics/page.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/app/analytics/page.tsx)):**
   * Tombol **"Ekspor Ringkasan Eksekutif (.pdf)"** berwarna merah (*Rose*) bersanding dengan tombol ekspor Excel (.xlsx).
   * Otomatis mengunduh berkas PDF siap cetak hanya dengan satu kali klik.

### B. Hasil Pengujian:
* **SuperAdmin (Nasional):** Sukses membuat file PDF berukuran **528 KB** (Status 200 OK).
* **SuperAdmin + Filter Agen `871300`:** Sukses membuat file PDF lengkap dengan TreeView `↳` berukuran **740 KB** (Status 200 OK).
* **Role Agen (`871300`):** Sukses membuat file PDF personal & group berukuran **230 KB** (Status 200 OK).
* **Role Kacab (Kelapa Gading):** Sukses membuat file PDF terisolasi cabang berukuran **19 KB** (Status 200 OK).

---

## 8. Pembaruan Desain Ringkas Tabel PDF (Penerapan Penuh ke Seluruh Role)

Format tabel ringkas multi-line, *header alignment center*, dan ikon sudut siku vektor `↳` telah **diterapkan ke seluruh role** (SUPERADMIN, MANAGEMENT, AUDIT, KACAB, dan AGENT):

1. **Role Agen (Portofolio Pribadi & Silsilah Group):**
   * **Tabel 1 — Kinerja Personal:** 5 Kolom ringkas (Profil Pribadi [85mm], Peringkat & Cabang [46mm], Total Premi [46mm], Total Klaim [46mm], Loss Ratio & Status [46mm]).
   * **Tabel 2 — Kinerja Group Keagenan:** 5 Kolom ringkas dengan indentasi berjenjang, penanda status `[Leader (Anda)]`, `(Jembatan Hirarki)`, dan panah siku vektor `↳` pada hook `didDrawCell`.

2. **Role Non-Agent (SuperAdmin, Management, Audit, Kepala Cabang):**
   * **Tabel 1 — Kinerja Cabang (Ringkas 4 Kolom):**
     * Kolom 1 (Cabang & Wilayah - 95 mm): Nama Cabang & Kode Cabang.
     * Kolom 2 (Total Premi - 58 mm): Nominal Premi IDR & Jumlah Polis Aktif.
     * Kolom 3 (Total Klaim - 58 mm): Nominal Beban Klaim IDR & Jumlah Kasus Klaim.
     * Kolom 4 (Loss Ratio & Status - 58 mm): Rasio Klaim % & Status Ambang Batas Underwriting.
     * Total lebar: $95 + 58 + 58 + 58 = \mathbf{269\text{ mm}}$ (Presisi 100% Full Width).
   * **Tabel 2 — Daftar Kinerja Agen (Ringkas 5 Kolom):**
     * Profil Agen (85 mm), Peringkat & Cabang (46 mm), Total Premi (46 mm), Total Klaim (46 mm), Loss Ratio & Status (46 mm).
     * Total lebar: $\mathbf{269\text{ mm}}$.
   * **Tabel 3 — Silsilah Group Target TreeView (Saat Filter Agen Aktif):**
     * 5 Kolom ringkas dengan sorotan warna indigo lembut pada Leader Target dan ikon siku vektor `↳` tajam pada downline.
     * Total lebar: $\mathbf{269\text{ mm}}$.
   * **Tabel 4 (atau 3) — Analisis Top Penyebab Klaim:**
     * 5 Kolom terukur (95 mm, 26 mm, 58 mm, 32 mm, 58 mm) = $\mathbf{269\text{ mm}}$.

3. **Standardisasi Seluruh Header Tabel:**
   * Di seluruh tabel, `headStyles` menggunakan `valign: 'middle'`, `halign: 'center'`, dan `minCellHeight: 8`.
   * Seluruh baris data menggunakan `valign: 'middle'` sehingga teks multi-line selalu berada tepat di tengah sel secara vertikal.

4. **Hasil Pengujian & Verifikasi:**
   * `npx tsc --noEmit` lolos dengan status Exit Code 0 (0 error).
   * Pengujian ekspor SuperAdmin Nasional (`/tmp/test-superadmin.pdf` - 28.078 byte) berhasil.
   * Pengujian ekspor SuperAdmin dengan Target Filter Agen (`/tmp/test-target-filter.pdf` - 34.276 byte) berhasil.
   * Pengujian ekspor Role Agen (`/tmp/agent-report-test.pdf` - 33.183 byte) berhasil.

---

## 9. Resolusi Nama Cabang Riil pada Metadata Header Ekspor PDF & Excel

* **Masalah yang Ditemukan:** Saat pengguna dengan hak akses SuperAdmin memfilter cabang (contoh: cabang `KPO`), metadata di atas KPI eksekutif pada berkas PDF menampilkan teks generik `Cabang: Cabang Terpilih`.
* **Akar Masalah:** Pada endpoint ekspor [`route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/analytics/export/pdf/route.ts), properti `branchName` sebelumnya dipasang dengan nilai *hardcoded placeholder*: `branchName: data.filter.branchId ? 'Cabang Terpilih' : 'Nasional'`.
* **Solusi yang Diterapkan:**
  1. Pada [`src/app/api/analytics/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/analytics/route.ts), menambahkan resolusi nama cabang terpilih dari tabel `branches` berdasarkan `branchId` yang dikirim pengguna, kemudian menyematkannya ke dalam objek respons `data.filter.branchName` dan `data.filter.selectedBranch`.
  2. Pada [`src/app/api/analytics/export/pdf/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/analytics/export/pdf/route.ts) dan [`src/app/api/analytics/export/xlsx/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/analytics/export/xlsx/route.ts), membaca `data.filter.branchName` atau fallback ke nama cabang pertama di `data.branchPerformance`, sehingga metadata header secara dinamis mencetak nama cabang yang dipilih (contoh: `Cabang: KPO`).
  3. Nama file unduhan PDF & Excel kini secara otomatis menyematkan nama cabang terpilih (contoh: `Laporan_Eksekutif_Analitik_Loss_Ratio_Cutoff_2026_KPO_2026-11-03.pdf`).
* **Verifikasi:** Pengujian otomatis memastikan teks berkas PDF berisi `Cabang: KPO` secara presisi.

---

## 10. Transformasi Menu Navigasi: Floating Left Sidebar Navigation

### A. Komponen yang Dibangun:
1. **[`navigation-context.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/navigation/navigation-context.tsx):**
   * Mengelola state global navigasi (`isCollapsed`, `isMobileOpen`).
   * Menyimpan preferensi buka/tutup menu di `localStorage` pengguna (`'mitraca_sidebar_collapsed'`).
2. **[`floating-sidebar.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/navigation/floating-sidebar.tsx):**
   * **Struktur Mengambang (*Floating Detached*):** `fixed left-3 sm:left-4 top-3 sm:top-4 bottom-3 sm:bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/5`.
   * **Mode Normal (Expand - 256px / `w-64`):** Menampilkan logo aplikasi kustom, nama aplikasi, subtitle brand, daftar tautan menu berlabel, accordion pengaturan, serta kartu profil pengguna lengkap.
   * **Mode Ramping (Collapse - 80px / `w-20`):** Menampilkan ikon terpusat dengan *floating tooltip* mengambang saat hover, memberikan ruang layar maksimal untuk tabel data lebar.
   * **Tautan Modul & RBAC:**
     * Analitik & Loss Ratio (`/analytics`)
     * Pohon Hirarki (`/hierarchy`)
     * Polis & Klaim (`/explorer`)
     * Upload Modul (`/`) (Superadmin & Admin)
     * Accordion Pengaturan: Kelola User (`/admin/users`), Identitas Aplikasi (`/settings/app`), Master Cabang (`/admin/branches`), dan Ganti Password (`/settings/change-password`).
   * **Footer Pengguna:** Menampilkan avatar berinisial, nama user, badge role, lingkup cabang/agen, tombol ganti password, dan tombol logout.
3. **[`app-shell.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/navigation/app-shell.tsx):**
   * Mengatur padding konten dinamis (`transition-all duration-300 ease-in-out`):
     * Saat Sidebar Expand: `md:pl-72`
     * Saat Sidebar Collapsed: `md:pl-28`
     * Di Layar Mobile: `pt-12 md:pt-0` dengan tombol hamburger menu melayang.
   * Tidak aktif pada halaman login (`/login`).
4. **Pembaruan Layout Utama ([`src/app/layout.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/app/layout.tsx)):**
   * Menggantikan header horizontal lama dengan `<AppShell>{children}</AppShell>`.

### B. Hasil Pengujian:
* **Kompilasi TypeScript:** `npx tsc --noEmit` lolos tanpa error (**Exit Code 0**).
* **Pengujian HTTP 200 di Seluruh Rute:**
  * `GET /analytics` $\rightarrow$ Status **200 OK**
  * `GET /hierarchy` $\rightarrow$ Status **200 OK**
  * `GET /explorer` $\rightarrow$ Status **200 OK**
  * `GET /admin/users` $\rightarrow$ Status **200 OK**
  * `GET /admin/branches` $\rightarrow$ Status **200 OK**
  * `GET /settings/app` $\rightarrow$ Status **200 OK**
  * `GET /settings/change-password` $\rightarrow$ Status **200 OK**
* **Halaman Login:** Bebas dari sidebar, tetap tampil bersih terpusat.
* **Penyempurnaan Mode Ramping (Option 1 Edge Floating Toggle Badge):**
  * Tombol expand/collapse dipindahkan ke batas tepi kanan sidebar berupa lingkaran melayang (`absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border shadow-md`).
  * Logo pada mode ramping kini berada tepat di tengah-tengah (*centered*) dan tampil **100% utuh tanpa terpotong** oleh tombol kontrol.

---

## 11. Modul 3: Log Aktivitas & Audit Trail (Kepatuhan & Keamanan)

Modul **Log Aktivitas & Audit Trail** ([`/admin/audit-logs`](file:///home/ompiovm/Project/MitracaMSA/src/app/admin/audit-logs/page.tsx)) telah selesai diimplementasikan untuk memenuhi standar kepatuhan regulasi, keamanan sistem asuransi, dan audit forensik.

### A. Fitur-Fitur Utama yang Dibangun:
1. **Pencatatan Otomatis & Non-Blocking (`logActivity`):**
   * Utilitas [`src/lib/audit/audit-logger.ts`](file:///home/ompiovm/Project/MitracaMSA/src/lib/audit/audit-logger.ts) bekerja secara asinkron tanpa memperlambat thread respon pengguna.
   * Dilengkapi deteksi otomatis IP Address klien (`x-forwarded-for`, `x-real-ip`, socket remote) dan User-Agent (browser & platform).
2. **Instrumentasi Event Komprehensif:**
   * **Autentikasi:** Login sukses (`AUTH_LOGIN_SUCCESS`), login gagal dengan rincian alasan seperti email tak terdaftar/password salah (`AUTH_LOGIN_FAILED`), logout (`AUTH_LOGOUT`), dan pergantian password (`AUTH_CHANGE_PASSWORD`).
   * **Manajemen Pengguna:** Penambahan user (`USER_CREATED`), perubahan user/role/cabang (`USER_UPDATED`), dan penghapusan user (`USER_DELETED`).
   * **Operasional Data & Upload:** Unggah batch produksi & klaim (`UPLOAD_BATCH_PROCESSED`) mencatat tipe file, jumlah baris berhasil, dan baris gagal.
   * **Pengaturan Sistem & Branding:** Perubahan logo, nama aplikasi, dan background login (`SETTINGS_BRANDING_UPDATED`).
3. **Antarmuka Log Audit ([`/admin/audit-logs`](file:///home/ompiovm/Project/MitracaMSA/src/app/admin/audit-logs/page.tsx)):**
   * **4 Kartu Metrik KPI:** Total Aktivitas, Aktivitas Hari Ini, Event Autentikasi, dan Aktivitas Gagal / Mencurigakan.
   * **Filter Multidimensi:** Kategori (`AUTH`, `USER_MGMT`, `UPLOAD`, `SETTINGS`, dll.), Status (`SUCCESS`, `FAILED`, `WARNING`), Rentang Tanggal (`startDate` & `endDate`), dan Pencarian Teks Bebas (*debounced* untuk nama, email, aksi, dan deskripsi).
   * **Tabel Interaktif:** Tanggal & waktu presisi, pelaku (*User & Role badge*), aksi sistem, kategori berikon & berwarna, status, IP & Client browser, serta tombol Detail.
   * **Modal Inspektur Metadata (JSON):** Memeriksa rincian payload perubahan dan konteks teknis di balik setiap log.
   * **Ekspor Excel (.xlsx):** Tombol ekspor langsung menghasilkan dokumen Excel resmi berformat audit ([`/api/admin/audit-logs/export/xlsx`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/admin/audit-logs/export/xlsx/route.ts)).
4. **Integrasi Navigasi & Keamanan (RBAC):**
   * Ditambahkan ke Floating Sidebar menu pada kelompok **Pengaturan & Administrasi** dengan ikon perisai aman (`ShieldCheck`).
   * Dibatasi secara ketat hanya untuk peran berwenang: `SUPERADMIN`, `AUDIT`, dan `ADMIN`. Peran lain otomatis ditolak dengan pesan peringatan keamanan yang ramah.

### B. File yang Dibuat & Diperbarui:
| Komponen | File | Deskripsi |
|---|---|---|
| **Database Schema** | [`src/db/schema/audit-logs.ts`](file:///home/ompiovm/Project/MitracaMSA/src/db/schema/audit-logs.ts) | Definisi tabel `audit_logs` dengan UUID, indeks performa kueri (`created_at`, `category`, `action`, `user_id`, `status`), dan kolom JSONB `metadata`. |
| **Schema Registry** | [`src/db/schema/index.ts`](file:///home/ompiovm/Project/MitracaMSA/src/db/schema/index.ts) | Pendaftaran relasi dan export tabel `auditLogs`. |
| **Logger Utility** | [`src/lib/audit/audit-logger.ts`](file:///home/ompiovm/Project/MitracaMSA/src/lib/audit/audit-logger.ts) | Helper fungsi `logActivity` non-blocking dan ekstraktor IP/User-Agent `getClientInfo`. |
| **API Kueri Log** | [`src/app/api/admin/audit-logs/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/admin/audit-logs/route.ts) | Endpoint GET dengan pagination, search, filter kustom, serta statistik agregat. |
| **API Ekspor Excel** | [`src/app/api/admin/audit-logs/export/xlsx/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/admin/audit-logs/export/xlsx/route.ts) | Generator file spreadsheet Excel untuk arsip audit kepatuhan. |
| **Halaman Audit Logs** | [`src/app/admin/audit-logs/page.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/app/admin/audit-logs/page.tsx) | Antarmuka interaktif pemantauan audit log dengan KPI card, filter bar, tabel, dan modal JSON viewer. |
| **Sidebar Menu** | [`src/components/navigation/floating-sidebar.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/navigation/floating-sidebar.tsx) | Penambahan item menu `Log Audit Trail` di accordion Pengaturan. |
| **Event Hooks** | Rute autentikasi, users, upload, dan settings | Pencatatan otomatis aktivitas operasional. |

### C. Hasil Pengujian & Verifikasi:
* **TypeScript Compilation:** `npx tsc --noEmit` lolos tanpa peringatan atau error (**Exit Code 0**).
* **Verifikasi Pencatatan Real-time:**
  * Percobaan login gagal (`AUTH_LOGIN_FAILED`) tercatat otomatis dengan IP Address dan deskripsi alasan kegagalan.
  * Percobaan login sukses (`AUTH_LOGIN_SUCCESS`) tercatat lengkap dengan identitas pengguna dan role.
* **Verifikasi Endpoint API:**
  * `GET /api/admin/audit-logs` $\rightarrow$ Status **200 OK**, mengembalikan payload logs, pagination, dan metrik summary.
  * `GET /api/admin/audit-logs/export/xlsx` $\rightarrow$ Status **200 OK**, menghasilkan berkas biner valid `Microsoft Excel 2007+`.
* **Verifikasi Halaman UI:**
  * `GET /admin/audit-logs` $\rightarrow$ Status **200 OK** dirender sempurna oleh Next.js.

---

## 12. Penyempurnaan Navigasi Mode Ramping: Submenu Mandiri (Opsi 2) & Floating Tooltips

Menindaklanjuti kebutuhan akses submenu Pengaturan di Mode Ramping (*Collapsed Sidebar*), seluruh rangkaian perbaikan telah diterapkan di [`src/components/navigation/floating-sidebar.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/navigation/floating-sidebar.tsx):

### A. Fitur & Penyesuaian:
1. **Penerapan Opsi 2 (Adaptive Collapsed Submenu):**
   * **Saat Mode Ramping (*Collapsed*):** Seluruh item di dalam kelompok Pengaturan & Administrasi otomatis dipecah menjadi **deretan ikon mandiri terpisah** di bawah garis pembatas:
     - 👥 **Kelola User** (Ikon `Users`, aksen ungu) — *Superadmin*
     - ✨ **Identitas Aplikasi** (Ikon `Sparkles`, aksen ungu) — *Superadmin*
     - 🏢 **Master Cabang** (Ikon `Building2`, aksen biru) — *Superadmin & Admin*
     - 🛡️ **Log Audit Trail** (Ikon `ShieldCheck`, aksen biru) — *Superadmin, Audit, & Admin*
     - 🔑 **Ganti Password** (Ikon `KeyRound`, aksen amber) — *Semua Role*
     Pengguna dapat langsung membuka menu yang dituju dengan **1 kali klik**.
   * **Saat Mode Normal (*Expanded*):** Tampilan otomatis kembali menjadi kelompok **Accordion "Pengaturan"** yang rapi dengan tombol panah chevron buka-tutup.
2. **Perbaikan CSS Tooltip Melayang (*Floating Badges with Arrow Pointer*):**
   * Masalah *clipping* akibat `overflow-x-hidden` diperbaiki dengan menyetel kontainer ke `overflow-visible` saat dalam mode ramping.
   * Setiap tautan menu kini menampilkan kotak tooltip hitam melayang (`bg-slate-900 text-white shadow-xl`) di sebelah kanan (`left-full ml-3`) lengkap dengan panah segitiga penunjuk (*arrow pointer*) yang presisi menghadap ke arah ikon menu saat kursor di-hover.
   * Dilengkapi atribut `title` bawaan browser sebagai fallback aksesibilitas universal.
3. **Optimasi Respon Navigasi & Efek Klik Instan:**
   * Ditambahkan `prefetch={false}` pada setiap tautan menu agar server Next.js di mode development tidak terbebani mengompilasi semua rute sekaligus di latar belakang.
   * Ditambahkan efek sentuh instan (`active:scale-95`) yang memberikan umpan balik visual seketika saat tombol menu diklik.
   * Penataan footer profil pengguna di mode samping dirapikan menjadi tata letak vertikal (`flex-col items-center gap-2.5`) agar avatar dan tombol logout tidak saling bertumpukan.

### B. Hasil Pengujian:
* **TypeScript Compilation:** `npx tsc --noEmit` $\rightarrow$ **Exit Code 0** (0 error).
* **HTTP Status Rute:** Seluruh rute `/analytics`, `/admin/audit-logs`, `/hierarchy`, dll. berstatus **200 OK** dengan waktu respon cepat.

---

## 13. Modul Master Agen: Tambah Agen, Update Agen & Mutasi Upline

Modul **Master Agen** ([`/admin/agents`](file:///home/ompiovm/Project/MitracaMSA/src/app/admin/agents/page.tsx)) telah selesai dibangun untuk memberikan fleksibilitas operasional penuh bagi **SUPERADMIN** dan **ADMIN** dalam mengelola direktori agen, mutasi upline, dan memelihara konsistensi pohon hirarki secara *real-time*.

### A. Fitur-Fitur Utama yang Selesai Dibangun:
1. **Dasbor Metrik KPI Master Agen (Termasuk Card 3-in-1 Status Keagenan):**
   * **Total Master Agen:** Menghitung seluruh agen resmi di database (14.243 agen).
   * **Status Keagenan (Card 3-in-1):** Menyajikan 3 rincian angka status keagenan sekaligus dalam 1 kartu metrik:
     - **Aktif:** 2.419 agen (badge hijau emerald)
     - **Non Aktif:** 4.985 agen (badge abu-abu slate)
     - **Cut:** 6.837 agen (badge merah rose)
   * **Agen Placeholder:** Agen sementara yang terbuat secara *auto-provision* saat batch Produksi/Klaim diunggah lebih dulu sebelum file master agen (2 agen).
   * **Pending Upline:** Agen yang kode upline-nya belum terdaftar dan siap disembuhkan oleh engine *self-healing* (7 agen).
2. **Pencarian Cepat & Filter Multidimensi:**
   * Pencarian instan (*debounced search*) berdasarkan Kode Agen, Nama Lengkap, Profile ID, atau Kode Upline.
   * Filter Cabang Resmi.
   * **Filter Status Keagenan:** Mengacu langsung ke 3 status resmi: **Aktif**, **Non Aktif**, dan **Cut**.
   * Filter Status Pohon (`LINKED`, `PENDING_UPLINE`, `ROOT`), dan Filter Khusus Agen Placeholder.
3. **Penyempurnaan Label & Pilihan Form Sesuai Bisnis:**
   * **Profile ID:** Label disesuaikan menjadi **Profile ID** (mengisi kolom database `profId`, contoh: `M8BW00001`).
   * **Peringkat / Jenjang Karir Resmi (4 Tier):**
     1. `Partner`
     2. `Senior Partner`
     3. `Executive Partner`
     4. `Managing Partner`
   * **Status Keagenan Resmi (3 Opsi):**
     1. `Aktif`
     2. `Non Aktif`
     3. `Cut`
     *(Menghilangkan opsi status 'Terminated')*.
4. **Tabel Data Master Agen & Indikator Status Akurat:**
   * Kolom Keagenan kini menampilkan status riil agen (**Aktif**, **Non Aktif**, atau **Cut**) secara presisi dengan pewarnaan badge yang konsisten.
   * Menampilkan sub-teks Profile ID di bawah nama agen.
5. **Modal Edit Agen & Mutasi Upline (*Upline Reassignment*):**
   * Memperbarui profil agen, penyesuaian peringkat partner, dan mutasi upline.
   * **Proteksi Siklus Hirarki (*Anti-Circular Loop Validation*):** Sistem secara otomatis memblokir upaya agen memilih dirinya sendiri atau salah satu bawahannya (*downline*) sebagai upline baru.
   * **Penyelarasan Berantai (*Cascading Tree Refresh*):** Ketika upline diubah, sistem otomatis memicu `refreshAllHierarchyPaths()` untuk memperbarui `materializedPath` seluruh downline di bawahnya secara rekursif.
6. **Modal Inspeksi Detail & Silsilah Downline:**
   * Menampilkan profil lengkap agen, Profile ID, silsilah jalur upline ke atas (*ancestor breadcrumb chain*), ringkasan portofolio produksi & klaim pribadi, serta tabel daftar *downline langsung (Level 1)*.
7. **Penonaktifan Aman (*Soft Deactivate*):**
   * Mengubah status keagenan menjadi Cut/Non Aktif tanpa menghapus fisik baris data, guna menjaga integritas riwayat polis dan klaim historis.
8. **Integrasi Audit Trail:**
   * Setiap penambahan (`AGENT_CREATED`), pembaruan (`AGENT_UPDATED`), dan penonaktifan (`AGENT_DEACTIVATED`) otomatis dicatat ke tabel `audit_logs`.

### B. File yang Dibuat & Diperbarui:
| Komponen | File | Deskripsi |
|---|---|---|
| **API Master Agen** | [`src/app/api/admin/agents/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/admin/agents/route.ts) | Endpoint `GET` (daftar, filter Aktif/Non Aktif/Cut, & agregasi KPI 3-in-1) dan `POST` (tambah agen baru & audit log). |
| **API Detail & Mutasi** | [`src/app/api/admin/agents/[id]/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/admin/agents/[id]/route.ts) | Endpoint `GET` (detail silsilah & downline), `PATCH` (edit & mutasi upline anti-loop), dan `DELETE` (soft deactivate ke status Cut). |
| **Halaman UI Master Agen** | [`src/app/admin/agents/page.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/app/admin/agents/page.tsx) | Antarmuka lengkap dengan Card 3-in-1, filter bar, tabel interaktif dengan badge status akurat, dan modal CRUD. |
| **Sidebar Navigation** | [`src/components/navigation/floating-sidebar.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/navigation/floating-sidebar.tsx) | Menambahkan menu **"Master Agen"** dengan ikon `UserCheck` untuk SUPERADMIN & ADMIN. |

### C. Hasil Pengujian & Verifikasi:
1. **TypeScript Compilation:** `npx tsc --noEmit` lolos tanpa error (**Exit Code 0**).
2. **Verifikasi Card KPI 3-in-1:**
   * Total Agen: **14.243**
   * Status Aktif: **2.419**
   * Status Non Aktif: **4.985**
   * Status Cut: **6.837**
   * Jumlah ketiga status konsisten 100% dengan total baris database.
3. **Verifikasi Filter Status:**
   * Filter `Aktif` $\rightarrow$ Tepat mengembalikan 2.419 baris.
   * Filter `Non Aktif` $\rightarrow$ Tepat mengembalikan 4.985 baris.
   * Filter `Cut` $\rightarrow$ Tepat mengembalikan 6.837 baris.
4. **Verifikasi Form Tambah & Update:**
   * Label terkonfirmasi `Profile ID` dan tersimpan ke kolom `profId`.
   * Pilihan jenjang karir hanya 4 tier partner (`Partner`, `Senior Partner`, `Executive Partner`, `Managing Partner`).
   * Pilihan status keagenan hanya 3 opsi (`Aktif`, `Non Aktif`, `Cut`).
5. **Uji Audit Trail:** Aktivitas penambahan dan perubahan agen tercatat rapi di database `audit_logs`.
6. **Investigasi & Pemulihan Agen `400102` (Ida Farida):**
   * **Penyebab:** Endpoint nonaktif sebelumnya menerapkan `deleted_at = NOW()`, sedangkan endpoint GET memfilter `WHERE deleted_at IS NULL`. Akibatnya agen yang dinonaktifkan tersembunyi dari tabel.
   * **Solusi & Perbaikan:**
     - Data agen `400102` dipulihkan kembali (`deleted_at = NULL`, `status_keagenan = 'Non Aktif'`).
     - Endpoint penonaktifan (`DELETE` & `PATCH`) diperbaiki agar **hanya mengubah `status_keagenan = 'Non Aktif'` dan `is_active = false` tanpa mengisi `deleted_at`**, sehingga agen tetap tampil di daftar direktori master dan bisa difilter berdasarkan statusnya.
     - Ditambahkan tombol aksi interaktif di tabel: ikon **Power Merah** (*Ubah Status ke Non Aktif*) untuk agen aktif, dan ikon **Power Hijau** (*Aktifkan Kembali Agen*) untuk agen berstatus Non Aktif / Cut.


---

## 14. Tahap 2: Portal Mandiri Agen & Manajemen Asisten (Officer Agent Self-Service)

Modul **Portal Mandiri Agen & Manajemen Asisten** ([`/agent/portal`](file:///home/ompiovm/Project/MitracaMSA/src/app/agent/portal/page.tsx)) telah selesai dibangun, terintegrasi penuh dengan sistem RBAC, dan diverifikasi otomatis.

### A. Fitur-Fitur Utama yang Selesai Dibangun:
1. **Kartu Identitas Agen (*Agent Identity Card*):**
   * Avatar dengan inisial nama, Nama Lengkap Agen, badge Jenjang Karir (*Partner, Senior Partner, Executive Partner, Managing Partner*), dan badge Status Keagenan (*Aktif, Non Aktif, Cut*).
   * Kode Agen dan Profile ID dilengkapi tombol salin satu-klik (*click-to-copy*).
   * Info silsilah: Kantor Cabang resmi, Upline Leader (Nama & Kode), kedalaman silsilah (*depth level*), dan tanggal bergabung.
2. **4 Kartu KPI Performa Personal & Staf:**
   * **Polis Pribadi:** Jumlah polis dan total premi bruto pribadi (Rp).
   * **Loss Ratio Pribadi:** Persentase rasio klaim pribadi (%) dengan pewarnaan ambang batas underwriting (hijau $\le 50\%$, kuning $\le 65\%$, merah $> 65\%$) serta total nominal beban klaim.
   * **Jaringan Tim Downline:** Jumlah downline langsung (Level 1) dan total seluruh jaringan downline.
   * **Staf Asisten (Officer Agent):** Jumlah asisten aktif dan total asisten terdaftar.
3. **Manajemen Asisten Mandiri oleh Agen (*Officer Agent Self-Service*):**
   * **Tambah Asisten Baru:** Agen dapat mendaftarkan staf asisten secara mandiri (Nama, Email unik, No. Telp/WhatsApp, Password awal). Akun asisten otomatis terhubung ke `parentAgentId` dan cabang agen.
   * **Edit Profil Asisten:** Mengubah nama, kontak telepon, atau status aktif/nonaktif.
   * **Reset Password Asisten:** Fitur cepat bagi agen untuk memberikan password baru saat asisten lupa password.
   * **Toggle Status & Hapus Asisten:** Mengaktifkan/menonaktifkan asisten atau menghapus akun asisten secara permanen.
4. **Proteksi Keamanan & Pembatasan Peran (*RBAC Role Guard*):**
   * **Peran `AGENT`:** Memegang kendali penuh atas asisten miliknya sendiri.
   * **Peran `OFFICER_AGENT`:** Memiliki hak akses monitoring data portofolio agen pemilik, tetapi tabel asisten beroperasi dalam mode *read-only* (tombol tambah/edit/hapus asisten dicegah dengan status `403 Forbidden`).
   * **Pencatatan Audit Trail Otomatis:** Setiap aktivitas pendaftaran (`OFFICER_AGENT_CREATED`), perubahan data (`OFFICER_AGENT_UPDATED`), reset password (`OFFICER_AGENT_PASSWORD_RESET`), dan penghapusan (`OFFICER_AGENT_DELETED`) otomatis dicatat ke tabel `audit_logs`.

### B. File yang Dibuat & Diperbarui:
| Komponen | File | Deskripsi |
|---|---|---|
| **API Profil Mandiri** | [`src/app/api/agent/profile/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/agent/profile/route.ts) | Endpoint kueri profil keagenan, cabang, upline, dan kalkulasi 4 metrik KPI personal. |
| **API Manajemen Asisten** | [`src/app/api/agent/assistants/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/agent/assistants/route.ts) | Endpoint `GET` (daftar asisten terdaftar) dan `POST` (pendaftaran asisten baru dengan hashing bcrypt & audit log). |
| **API Operasi Asisten** | [`src/app/api/agent/assistants/[id]/route.ts`](file:///home/ompiovm/Project/MitracaMSA/src/app/api/agent/assistants/[id]/route.ts) | Endpoint `PATCH` (update nama, telp, status, reset password) dan `DELETE` (penghapusan akun asisten). |
| **Halaman UI Portal Agen** | [`src/app/agent/portal/page.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/app/agent/portal/page.tsx) | Antarmuka lengkap dengan kartu identitas gradien, 4 KPI cards, tabel asisten, search bar, dan modal CRUD. |
| **Navigasi Sidebar** | [`src/components/navigation/floating-sidebar.tsx`](file:///home/ompiovm/Project/MitracaMSA/src/components/navigation/floating-sidebar.tsx) | Menempatkan menu **"Portal Agen & Asisten"** (ikon `ShieldCheck`) di dalam kelompok accordion **Pengaturan** tepat di atas *Ganti Password* (mendukung mode normal accordion dan mode ramping adaptive collapsed). |
| **Middleware Guard** | [`src/middleware.ts`](file:///home/ompiovm/Project/MitracaMSA/src/middleware.ts) | Memproteksi rute `/agent/*` dan `/api/agent/*` hanya untuk peran yang berwenang. |
| **Script Uji Otomatis** | [`src/scripts/test-agent-portal.ts`](file:///home/ompiovm/Project/MitracaMSA/src/scripts/test-agent-portal.ts) | Script otomasi pengujian end-to-end seluruh endpoint portal agen dan asisten. |

### C. Hasil Pengujian & Verifikasi:
1. **TypeScript Compilation:** `npx tsc --noEmit` lolos tanpa error (**Exit Code 0**).
2. **Uji Otomasi End-to-End (`test-agent-portal.ts`):**
   * ✅ **GET `/api/agent/profile`:** Berhasil memuat profil Ekasurya Halim (871300), cabang, upline, dan kalkulasi KPI personal.
   * ✅ **GET `/api/agent/assistants`:** Berhasil memuat daftar asisten terhubung.
   * ✅ **POST `/api/agent/assistants`:** Berhasil mendaftarkan asisten baru dengan password bcrypt terenkripsi.
   * ✅ **PATCH `/api/agent/assistants/[id]`:** Berhasil memperbarui telepon dan reset password.
   * ✅ **Proteksi Keamanan Role OFFICER_AGENT:** Asisten yang login dapat melihat profil agen pemilik, namun saat mencoba mendaftarkan asisten lain langsung ditolak dengan **HTTP 403 Forbidden**.
   * ✅ **DELETE `/api/agent/assistants/[id]`:** Berhasil menghapus akun asisten pengujian.
   * ✅ **Audit Trail Verification:** Terverifikasi 3 entri log audit baru tercatat di database (`OFFICER_AGENT_CREATED`, `OFFICER_AGENT_PASSWORD_RESET`, `OFFICER_AGENT_DELETED`).
