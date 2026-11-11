# Rencana Implementasi: Desain Ringkas Tabel PDF Analitik (Sesuai UI Web) & Header Alignment Center

Dokumen ini memuat analisis dan rancangan teknis untuk menyelaraskan tampilan tabel pada **Laporan Eksekutif PDF ([`src/lib/export/pdf-analytics-generator.ts`](file:///home/ompiovm/Project/MitracaMSA/src/lib/export/pdf-analytics-generator.ts))** agar:
1. **Lebih Ringkas & Tidak Kebanyakan Kolom:** Mengadopsi format **Compact Multi-Line** yang sama persis dengan UI Web (menggabungkan data berpasangan ke baris kedua, misal Nama + Upline/Kode, Peringkat + Cabang, Premi + Polis, Klaim + Kasus, Loss Ratio + Status).
2. **Header Alignment Center (Horizontal & Vertikal):** Memperbaiki teks header tabel agar tidak lagi condong ke atas (*top-aligned*), melainkan berada tepat di tengah-tengah secara vertikal (*`valign: 'middle'`*) dan horizontal (*`halign: 'center'`*).

---

## 1. Analisis Masalah & Perbandingan Saat Ini

### Masalah 1: Kolom Terlalu Banyak & Tercecer (11 Kolom)
Saat ini pada tabel PDF peran Agen (*Kinerja Group*), data dipecah menjadi **11 kolom terpisah**:
`['Kode', 'Nama Agen & Hirarki', 'Upline Langsung', 'Level', 'Peringkat', 'Cabang', 'Premi (IDR)', 'Polis', 'Klaim (IDR)', 'Loss Ratio', 'Status Underwriting']`

* **Dampak:** Setiap kolom menjadi sangat sempit (lebar kolom hanya 11 mm - 16 mm), font mengecil, dan tampilan terlihat padat serta terpecah-pecah.
* **Solusi UI Web yang Sudah Terbukti:** Pada UI Web (`analytics-tables.tsx`), kita menggabungkan metrik-metrik berpasangan ke baris sub-teks sehingga hanya ada **5 kolom terpadu yang lapang, informatif, dan elegan**.

### Masalah 2: Teks Header Menempel di Atas (*Top-Aligned*)
* Pada konfigurasi `autoTable` sebelumnya:
  * Pengaturan `headStyles` hanya menetapkan `halign: 'center'`, namun **tidak mendefinisikan `valign: 'middle'`**.
  * Akibatnya, default bawaan library `jspdf-autotable` menerapkan perataan vertikal ke atas (`top`), sehingga judul header terlihat menempel di garis tepi atas sel header.

---

## 2. Rancangan Desain Baru Tabel PDF (Compact Multi-Line)

### A. Tabel Kinerja Agen & Group Keagenan (Ringkas 5 Kolom)
Berlaku untuk:
* Tab Personal Agen (Role Agen)
* Tab Group Keagenan (Role Agen)
* Tab Kinerja Seluruh Agen (Role Cabang / SuperAdmin)
* Tab Group Target TreeView (Role Cabang / SuperAdmin saat filter agen aktif)

| No | Nama Kolom Header | Isi Baris 1 (Teks Utama Tebal) | Isi Baris 2 (Sub-Teks Penjelas) | Lebar | Perataan (*Align*) |
|:---:|---|---|---|:---:|:---:|
| **1** | **Profil Agen / Silsilah Jaringan** | Nama Agen + Badge Level/Leader<br>*(misal: `Jennie Verena Lauw [Level 1]`)* | Kode Agen & Upline Langsung<br>*(misal: `Kode: 800439 • Upline: Ekasurya Halim (871300)`)* | **85 mm** | Kiri (*Left*) |
| **2** | **Peringkat & Cabang** | Peringkat Keagenan<br>*(misal: `Senior Agency Director`)* | Kantor Cabang Terdaftar<br>*(misal: `Kelapa Gading`)* | **46 mm** | Kiri (*Left*) |
| **3** | **Total Premi (Polis)** | Nominal Premi IDR<br>*(misal: `Rp 37.440.000`)* | Jumlah Polis Aktif<br>*(misal: `6 Polis Aktif`)* | **46 mm** | Kanan (*Right*) |
| **4** | **Total Klaim (Kasus)** | Nominal Klaim IDR<br>*(misal: `Rp 26.552.810`)* | Jumlah Kasus Klaim<br>*(misal: `3 Kasus Klaim`)* | **46 mm** | Kanan (*Right*) |
| **5** | **Loss Ratio & Status** | Nilai Persentase Rasio Klaim<br>*(misal: `70,92%`)* | Status Ambang Batas Underwriting<br>*(misal: `Kritis (>35%)`)* | **46 mm** | Tengah (*Center*) |

$$\text{Total Lebar} = 85 + 46 + 46 + 46 + 46 = \mathbf{269\text{ mm}}\ (\text{Presisi 100\% Full Width})$$

### B. Tabel Kinerja Cabang (Ringkas 4 Kolom)
Berlaku untuk Laporan Kinerja Cabang (Role Non-Agent):
* **Kolom 1 (Cabang & Wilayah - 95 mm):** Baris 1 Nama Cabang, Baris 2 `Kode Cabang: XX`.
* **Kolom 2 (Total Premi - 58 mm):** Baris 1 Nominal Premi IDR, Baris 2 `XX Polis Aktif`.
* **Kolom 3 (Total Klaim - 58 mm):** Baris 1 Nominal Klaim IDR, Baris 2 `XX Kasus Klaim`.
* **Kolom 4 (Loss Ratio & Status - 58 mm):** Baris 1 Rasio %, Baris 2 Status Underwriting.

$$\text{Total Lebar} = 95 + 58 + 58 + 58 = \mathbf{269\text{ mm}}$$

### C. Tabel Top Penyebab Klaim (5 Kolom - 269 mm)
* Tetap 5 kolom proporsional (95mm, 26mm, 58mm, 32mm, 58mm) dengan header tengah sempurna.

---

## 3. Standardisasi Header Alignment Center & Spacing

Di seluruh tabel `autoTable`, kita terapkan styling header terpusat:
```ts
headStyles: {
  fillColor: [30, 58, 138], // Navy formal
  textColor: [255, 255, 255],
  fontStyle: 'bold',
  halign: 'center',        // Horizontal Center
  valign: 'middle',        // Vertical Center (Tepat di tengah, tidak menempel di atas)
  minCellHeight: 7.5,      // Tinggi minimum header yang proporsional
},
styles: {
  font: 'helvetica',
  fontSize: 7.2,
  cellPadding: 2.2,
  valign: 'middle',        // Seluruh baris data rata tengah vertikal
  lineColor: [226, 232, 240],
}
```

---

## 4. Penerapan Ikon Corner Arrow `↳` Berbasis Vektor di PDF

Karakter Unicode `↳` (U+21B3) tidak didukung oleh font standar PDF (Helvetica Latin-1). Namun, kita dapat menggambar **ikon panah belok (*Corner Arrow `↳`*) langsung secara vektor** menggunakan hook `didDrawCell` pada `jspdf-autotable`:

```ts
function drawCornerArrow(doc: jsPDF, x: number, y: number, size = 2.2) {
  doc.setDrawColor(100, 116, 139); // Slate 500
  doc.setLineWidth(0.35);
  // Garis vertikal ke bawah
  doc.line(x, y - size + 0.2, x, y);
  // Garis horizontal belok ke kanan
  doc.line(x, y, x + size, y);
  // Kepala panah (arrow head)
  doc.line(x + size - 0.7, y - 0.7, x + size, y);
  doc.line(x + size - 0.7, y + 0.7, x + size, y);
}
```

* **Keunggulan:**
  * 100% vektor murni, sangat tajam pada level zoom berapapun dan tidak pernah pecah.
  * Tampil persis sama dengan ikon Lucide `CornerDownRight` (`↳`) pada UI Web.
  * Bebas dari risiko karakter rusak (*encoding bug*).
  * Posisi horizontal otomatis bergeser mengikuti tingkat kedalaman (*relativeDepth*): `indentX = cell.x + 2.5 + (depth - 1) * 6`.

---

## 5. Perubahan File yang Diusulkan

### [MODIFY] `src/lib/export/pdf-analytics-generator.ts`
1. **Fungsi Gambar Vektor `drawCornerArrow`:** Tambahkan fungsi penggambaran panah `↳` presisi.
2. **Refactor Tabel Personal Agen:** Ubah dari 9 kolom menjadi **5 kolom ringkas**.
3. **Refactor Tabel Group Keagenan (Treeview):** Ubah dari 11 kolom menjadi **5 kolom ringkas** dengan hook `didDrawCell` untuk menggambar panah `↳`.
4. **Refactor Tabel Seluruh Agen (Non-Agent):** Ubah dari 9 kolom menjadi **5 kolom ringkas**.
5. **Refactor Tabel Cabang:** Ubah menjadi **4 kolom ringkas**.
6. **Tambahkan `valign: 'middle'`** pada seluruh blok `headStyles` dan `styles`.

---

## 6. Rencana Pengujian & Verifikasi

1. **Automated Compiler & API Test:**
   * Menjalankan `npx tsc --noEmit` untuk validasi tipe.
   * Menjalankan script uji Node.js untuk mengekspor PDF peran Agen (`AGENT`) dan Admin (`SUPERADMIN`).
2. **Verifikasi Visual Dokumen PDF:**
   * Memastikan tabel Kinerja Group hanya terdiri dari 5 kolom lapang.
   * Memastikan indentasi silsilah downline menampilkan panah `↳` yang rapi.
   * Memastikan teks judul header berada tepat di tengah-tengah kotak header secara vertikal dan horizontal.
   * Memastikan tidak ada teks yang terpotong atau tumpang tindih.

---

> [!IMPORTANT]
> **Persetujuan Diperlukan:**
> Silakan tinjau ringkasan di atas. Jika Anda menyetujui perubahan format tabel PDF menjadi 5 kolom ringkas (multi-line) dan header alignment center (tengah vertikal & horizontal), silakan konfirmasi agar dapat langsung dieksekusi.
