# Rencana Implementasi: Aturan Upload Ingestion, Penanganan Endorsement (Delta), dan Pembersihan Duplikat

Dokumen ini merumuskan secara presisi arsitektur **Aturan Upload & Ingestion** berdasarkan arahan bisnis yang telah disepakati:
1. **Data Identik Persis**: Diabaikan / dilewati (*SKIP*), tidak disimpan ganda ke database.
2. **Data Historis Dipertahankan**: Data lama tidak pernah ditimpa/dihapus (*Audit Trail Protection*).
3. **Endorsement Nominal (Perubahan Premi/TSI/Komisi)**: Disimpan sebagai baris baru dengan **Nilai Delta (Selisih)** agar total agregat di Analitik tetap akurat sesuai nilai terbaru.
4. **Endorsement Non-Nominal (Perubahan Nama/Objek/Alamat)**: Disimpan sebagai baris riwayat baru dengan keterangan endorsement (`prev_policy = policy_no`), dengan nilai premi 0 (delta 0).
5. **Klaim (`claim_no`)**: Dilakukan *Upsert* jika terdapat pembaruan nilai atau tanggal settlement, dan *Skip* jika data sama persis.
6. **Pembersihan Data Duplikat Uji Coba**: Menghapus batch duplikat `25a2d118-...` sehingga polis Jennie Verena Lauw kembali normal menjadi 6 polis.

---

## 1. Arsitektur Alur Logika Ingestion Baru

```mermaid
flowchart TD
    Row["Baris Excel Masuk"] --> CheckType{"Tipe Template?"}
    
    %% MASTER PRODUKSI FLOW
    CheckType -->|MasterProduksi| FindExisting{"Cari Polis yang Pernah Ada<br/>(policy_no)"}
    
    FindExisting -->|Belum Pernah Ada| InsertNew["INSERT POLIS BARU<br/>(Status: New / Original)"]
    
    FindExisting -->|Pernah Ada| CompareExact{"Apakah Semua Kolom<br/>Sama Persis (Identik)?"}
    
    CompareExact -->|Ya (Sama Persis)| SkipRow["SKIP / LEWATI<br/>(Jangan simpan, catat di Log)"]
    
    CompareExact -->|Ada Perbedaan| CheckDiff{"Perubahan Nominal atau Teks?"}
    
    CheckDiff -->|Perubahan Nominal| CalcDelta["HITUNG DELTA:<br/>Delta Premi = Premi Baru - Total Premi Lama<br/>Delta TSI = TSI Baru - Total TSI Lama<br/>INSERT BARIS ENDORSEMENT DENGAN DELTA"]
    
    CheckDiff -->|Hanya Teks / Objek| InsertTextEndorse["INSERT BARIS ENDORSEMENT NON-NOMINAL:<br/>Premi = 0 (Delta 0)<br/>Data Objek JSONB / Nama Baru<br/>prev_policy = policy_no"]
    
    %% MASTER CLAIM FLOW
    CheckType -->|MasterClaim| FindClaim{"Cari claim_no di DB"}
    FindClaim -->|Belum Ada| InsertClaim["INSERT KLAIM BARU"]
    FindClaim -->|Sudah Ada| CheckClaimExact{"Apakah Sama Persis?"}
    CheckClaimExact -->|Ya| SkipClaim["SKIP / LEWATI"]
    CheckClaimExact -->|Ada Update Nominal/Tgl| UpsertClaim["UPSERT / UPDATE KLAIM TERBARU"]
```

---

## 2. Rincian Teknis Implementasi

### A. Komponen 1: Logika Deteksi & Delta Endorsement di `unified-processor.ts`
[`src/lib/ingestion/unified-processor.ts`](file:///home/ompiovm/Project/MitracaMSA/src/lib/ingestion/unified-processor.ts)

1. **Pemeriksaan Data Identik (*Exact Duplicate Check*)**:
   * Sistem memeriksa apakah sudah ada baris di `production_records` dengan `policy_no` yang sama:
     * Jika `spau_no`, `period`, `start_period`, `end_period`, `insured_name`, `product`, `coverage`, `nilai_premi`, `tsi_in_idr`, dan `object_details` identik 100%:
     * **Aksi:** `skippedRows++`, catat log `SKIPPED_DUPLICATE_IDENTICAL`, **tidak melakukan INSERT**.

2. **Pemeriksaan Endorsement Nominal (*Delta Calculation*)**:
   * Jika `policy_no` sudah ada, namun nominal pada baris baru berbeda dari kondisi aktif di database:
     $$\Delta \text{Premi} = \text{Premi Baru} - \sum \text{Premi Sebelumnya}$$
     $$\Delta \text{TSI} = \text{TSI Baru} - \sum \text{TSI Sebelumnya}$$
     $$\Delta \text{Komisi} = \text{Komisi Baru} - \sum \text{Komisi Sebelumnya}$$
   * **Aksi:**
     * Lakukan `INSERT` baris baru dengan:
       * `policy_no`: Nomor polis yang sama.
       * `policy_status`: `'Endorsement'`.
       * `prev_policy`: Nomor polis sebelumnya.
       * `nilai_premi`: Nilai $\Delta \text{Premi}$.
       * `tsi`: Nilai $\Delta \text{TSI}$.
       * `nilai_komisi`: Nilai $\Delta \text{Komisi}$.
       * `object_details`: Objek terbaru.
       * `metadata`: Menyimpan snapshot `{ endorsement_type: 'NOMINAL_DELTA', original_full_premi: premi_baru }`.

3. **Pemeriksaan Endorsement Non-Nominal**:
   * Jika nominal premi sama (Delta = 0), namun terdapat perubahan data teks (nama tertanggung, nomor plat di objek 6, warna, alamat, dll.):
   * **Aksi:**
     * Lakukan `INSERT` baris baru dengan:
       * `policy_status`: `'Endorsement'`.
       * `prev_policy`: Nomor polis sebelumnya.
       * `nilai_premi`: `0.00` (agar tidak menambah total premi di analitik).
       * `tsi`: `0.00`.
       * `object_details`: Data objek pertanggungan terbaru.
       * `metadata`: `{ endorsement_type: 'NON_NOMINAL_UPDATE' }`.

---

### B. Komponen 2: Logika MasterClaim di `unified-processor.ts`
1. Sistem mencari `claims` berdasarkan `claim_no`:
   * Jika ditemukan data dengan `claim_no`, `policy_no`, `date_of_settlement`, `gross_claim`, dan `indemnity` yang sama persis:
     * **Aksi:** `skippedRows++`, **tidak melakukan INSERT**.
   * Jika `claim_no` sudah ada namun terdapat perubahan nominal beban klaim (`gross_claim`) atau tanggal settlement:
     * **Aksi:** Lakukan `UPDATE` pada data klaim tersebut dengan nilai settlement terbaru.
   * Jika `claim_no` belum pernah ada:
     * **Aksi:** Lakukan `INSERT` klaim baru.

---

### C. Komponen 3: Pembersihan Batch Duplikat Uji Coba (*Data Cleanup*)
* **Fakta:** File `Produksi.xlsx` Batch 1 (`25a2d118-502f-43eb-b2af-998decd04f8e`) dan Batch 2 (`f5264a83-6456-4e21-a5de-fd5124edc768`) berisi 388 baris yang identik 100%.
* **Tindakan Pembersihan:**
  1. Hapus 388 baris di `production_records` yang memiliki `source_batch_id = '25a2d118-502f-43eb-b2af-998decd04f8e'`.
  2. Perbarui status batch `25a2d118-...` menjadi `REPLACED_BY_DUPLICATE_CLEANUP`.
  3. Hasil akhir: Total polis di database menjadi **388 polis unik** (dan polis milik Jennie Verena Lauw kembali menjadi **tepat 6 polis**).

---

## 3. Rencana Pengujian & Verifikasi (*Verification Plan*)

### A. Pengujian Otomatis
1. **Verifikasi Pembersihan Data**:
   * Kueri jumlah total polis di `production_records` harus tepat `388`.
   * Kueri jumlah polis untuk agen Jennie Verena Lauw (800439) harus tepat `6`.
2. **Verifikasi Aturan Upload Baru**:
   * Jalankan uji coba upload baris identik $\rightarrow$ sistem harus melaporkan `Skipped: 1`, baris di database tidak bertambah.
   * Jalankan uji coba upload baris endorsement dengan kenaikan premi Rp 1.000.000 $\rightarrow$ sistem harus mencatat baris endorsement dengan delta premi Rp 1.000.000.
3. **Verifikasi TypeScript & Server**:
   * `npx tsc --noEmit` lolos 0 error.

### B. Verifikasi Manual Pengguna
* Login sebagai agen Ekasurya Halim (871300) dan buka menu **Polis & Klaim** ([`/explorer`](file:///home/ompiovm/Project/MitracaMSA/src/app/explorer/page.tsx)).
* Cari agen downline **Jennie Verena Lauw**.
* Pastikan daftar polis menampilkan tepat 6 polis unik tanpa duplikasi.
