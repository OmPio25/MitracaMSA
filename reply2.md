## ✅ Perbaikan Status Upline Selesai

### Perubahan:
**File**: `src/lib/ingestion.ts` (lines 82-89)
- Menghapus logic yang mengubah status menjadi `PENDING_UPLINE` saat upline tidak ditemukan
- Status sekarang **tetap mengikuti data sumber** (mapping AKTIF→ACTIVE, NONAKTIF→INACTIVE, CUT→CUT, dll)
- Upline yang tidak ditemukan disimpan di `upline_agent_code` sebagai info/penanda
- `upline_agent_id` diset null (karena tidak ditemukan)
- Warning tetap di-generate untuk tracking: `"Upline agent {kode} not found - hierarchy pending"`

### Hasil Testing:
Upload test dengan upline `NONEXISTENT`:
| Field | Value |
|-------|-------|
| KODEAGEN | TEST001 |
| STATUSKEAGENAN | AKTIF |
| KODEUPLINE | NONEXISTENT (tidak ada di DB) |
| **Result Status** | **ACTIVE** (ikuti data sumber) |
| upline_agent_code | NONEXISTENT (tersimpan sebagai penanda) |
| upline_agent_id | NULL |
| Warning | ✅ "Upline agent NONEXISTENT not found - hierarchy pending" |

### Agent 881286 (Budi Kartiyasa Hendra):
Sudah diupdate manual ke `ACTIVE` (sebelumnya `PENDING_UPLINE`):
- upline_agent_code: `402671` (tersimpan)
- upline_agent_id: NULL
- status: **ACTIVE** (ikuti data sumber)

**Kesimpulan**: Status agent sekarang **match dengan data sumber**, upline missing hanya jadi info/warning, bukan status.
