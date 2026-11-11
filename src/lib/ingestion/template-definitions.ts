/**
 * Exact Fixed Header Definitions & Smart Dynamic Aliases for Source Templates
 * 
 * Supports Smart Dynamic Column Mapping:
 * - DATA_AGENT
 * - MASTER_PRODUKSI
 * - MASTER_CLAIM
 * 
 * Allows legacy files, English/Indonesian export headers, and alternative naming conventions
 * to be auto-detected and mapped smoothly into standard database columns.
 */

export type TemplateType = 'DATA_AGENT' | 'MASTER_PRODUKSI' | 'MASTER_CLAIM';

export interface ColumnDefinition {
  header: string;
  required: boolean;
  description: string;
  exampleValue: string | number;
  aliases?: string[]; // Alternative header names / synonyms (lowercase)
  fallbackColumns?: string[]; // Columns to check if this column is absent
}

export interface TemplateDefinition {
  type: TemplateType;
  title: string;
  fileName: string;
  signatureColumns: string[]; // Primary signature headers (evaluated against aliases too)
  columns: ColumnDefinition[];
}

export const TEMPLATE_DEFINITIONS: Record<TemplateType, TemplateDefinition> = {
  // ── 1. DataAgent ─────────────────────────────────────────────────────────────
  DATA_AGENT: {
    type: 'DATA_AGENT',
    title: 'Template Data Agent',
    fileName: 'Template_DataAgent.xlsx',
    signatureColumns: ['KODEAGEN', 'NAMAAGEN', 'KodeUpline'],
    columns: [
      {
        header: 'KODEAGEN',
        required: true,
        description: 'Kode unik agen (Primary ID)',
        exampleValue: 'AGT001',
        aliases: ['kodeagen', 'kode agen', 'agent code', 'agent id', 'id agen', 'kode_agen', 'agentcode'],
      },
      {
        header: 'NAMAAGEN',
        required: true,
        description: 'Nama lengkap agen',
        exampleValue: 'Ahmad Dahlan',
        aliases: ['namaagen', 'nama agen', 'agent name', 'nama', 'agent_name', 'agentname'],
      },
      {
        header: 'NAMACABANG',
        required: false,
        description: 'Nama kantor cabang (Auto-provisioned)',
        exampleValue: 'Jakarta Selatan',
        aliases: ['namacabang', 'nama cabang', 'cabang', 'branch', 'branch name', 'kantor cabang', 'nama_cabang'],
      },
      {
        header: 'PROFID',
        required: false,
        description: 'Profile ID dari sistem lama',
        exampleValue: 'PROF-9921',
        aliases: ['profid', 'profile id', 'prof id', 'profile_id', 'id profil', 'profileid'],
      },
      {
        header: 'STATUSKEAGENAN',
        required: false,
        description: 'Status keagenan',
        exampleValue: 'AKTIF',
        aliases: ['statuskeagenan', 'status keagenan', 'status', 'stat', 'agent status', 'status_keagenan'],
      },
      {
        header: 'KodeUpline',
        required: false,
        description: 'Kode agen upline (Self-healing jika belum ada)',
        exampleValue: 'UPL001',
        aliases: ['kodeupline', 'kode upline', 'upline code', 'upline', 'id upline', 'upline_code', 'kode_upline'],
      },
      {
        header: 'PERINGKAT',
        required: false,
        description: 'Peringkat/Tier agen',
        exampleValue: 'Agency Director',
        aliases: ['peringkat', 'rank', 'level', 'jabatan', 'tier', 'grade'],
      },
    ],
  },

  // ── 2. MasterProduksi ────────────────────────────────────────────────────────
  MASTER_PRODUKSI: {
    type: 'MASTER_PRODUKSI',
    title: 'Template Master Produksi',
    fileName: 'Template_MasterProduksi.xlsx',
    signatureColumns: ['Policy No', 'Nilai Premi', 'Bulan'],
    columns: [
      {
        header: 'Bulan',
        required: true,
        description: 'Periode akuntansi (YYYY-MM atau Nama Bulan)',
        exampleValue: '2026-01',
        aliases: ['bulan', 'periode', 'accounting period', 'reporting period', 'month', 'periode akuntansi', 'bulan akuntansi', 'period'],
        fallbackColumns: ['submit date', 'start period', 'tgl submit', 'periode awal', 'tgl mulai', 'tanggal submit'],
      },
      {
        header: 'Policy Status',
        required: false,
        description: 'Status polis terkini',
        exampleValue: 'Active',
        aliases: ['policy status', 'status polis', 'stat', 'status', 'policy_status', 'pol status'],
      },
      {
        header: 'Agent ID',
        required: true,
        description: 'Kode agen produsen (Auto-provision jika baru)',
        exampleValue: 'AGT001',
        aliases: ['agent id', 'kode agen', 'agent code', 'id agen', 'kodeagen', 'agent_id'],
      },
      {
        header: 'Profile ID',
        required: false,
        description: 'Profile ID',
        exampleValue: 'PROF-9921',
        aliases: ['profile id', 'prof id', 'profid', 'profile_id', 'profileid'],
      },
      {
        header: 'Agent Name',
        required: false,
        description: 'Nama agen saat transaksi',
        exampleValue: 'Ahmad Dahlan',
        aliases: ['agent name', 'nama agen', 'nama agent', 'agent_name', 'namaagen'],
      },
      {
        header: 'Agent Status',
        required: false,
        description: 'Status keagenan saat transaksi',
        exampleValue: 'AKTIF',
        aliases: ['agent status', 'status agen', 'status agent', 'agent_status'],
      },
      {
        header: 'Branch',
        required: false,
        description: 'Cabang produksi',
        exampleValue: 'Jakarta Selatan',
        aliases: ['branch', 'cabang', 'nama cabang', 'branch name', 'kantor cabang', 'raw branch', 'raw_branch'],
      },
      {
        header: 'Representative',
        required: false,
        description: 'Handling representative',
        exampleValue: 'Budi Santoso',
        aliases: ['representative', 'rep', 'penanggung jawab', 'pic'],
      },
      {
        header: 'Product',
        required: false,
        description: 'Nama produk asuransi',
        exampleValue: 'Property All Risks',
        aliases: ['product', 'nama produk', 'produk', 'product name', 'nama_produk'],
      },
      {
        header: 'Coverage',
        required: false,
        description: 'Lingkup jaminan',
        exampleValue: 'Comprehensive',
        aliases: ['coverage', 'lingkup jaminan', 'jaminan'],
      },
      {
        header: 'Renewed',
        required: false,
        description: 'Status perpanjangan',
        exampleValue: 'NO',
        aliases: ['renewed', 'perpanjangan', 'renewal', 'is renewed'],
      },
      {
        header: 'Prev Policy',
        required: false,
        description: 'Nomor polis sebelumnya jika renewal',
        exampleValue: '',
        aliases: ['prev policy', 'previous policy', 'polis lama', 'polis sebelumnya', 'policy no ori', 'policy no original'],
      },
      {
        header: 'SPAU Type',
        required: false,
        description: 'Jenis SPAU',
        exampleValue: 'Direct',
        aliases: ['spau type', 'jenis spau', 'sppa type', 'polis type', 'type polis', 'jenis polis'],
      },
      {
        header: 'SPAU No',
        required: false,
        description: 'Nomor surat permohonan',
        exampleValue: 'SPAU-2026-001',
        aliases: ['spau no', 'no spau', 'sppa no', 'no sppa', 'nomor spau', 'nomor sppa', 'sppa'],
      },
      {
        header: 'Policy No',
        required: true,
        description: 'Nomor polis (Non-unique antar periode)',
        exampleValue: 'POL-PAR-2026-0001',
        aliases: ['policy no', 'no policy', 'no polis', 'nomor polis', 'policy number', 'policy_no', 'policyno'],
      },
      {
        header: 'Start Period',
        required: false,
        description: 'Tanggal awal pertanggungan',
        exampleValue: '2026-01-01',
        aliases: ['start period', 'periode awal', 'tgl mulai', 'inception date', 'start date', 'tgl awal', 'start_period'],
      },
      {
        header: 'End Period',
        required: false,
        description: 'Tanggal akhir pertanggungan',
        exampleValue: '2027-01-01',
        aliases: ['end period', 'periode akhir', 'tgl akhir', 'expiry date', 'end date', 'tgl selesai', 'end_period'],
      },
      {
        header: 'Insured Name',
        required: false,
        description: 'Nama tertanggung',
        exampleValue: 'PT Sumber Berkah Makmur',
        aliases: ['insured name', 'nama tertanggung', 'tertanggung', 'nama', 'insured_name', 'customer name', 'nama nasabah'],
      },
      {
        header: 'Currency of TSI',
        required: false,
        description: 'Mata uang pertanggungan',
        exampleValue: 'IDR',
        aliases: ['currency of tsi', 'currency', 'mata uang', 'curr', 'currency_tsi'],
      },
      {
        header: 'Rate of TSI',
        required: false,
        description: 'Nilai kurs',
        exampleValue: '1.0000',
        aliases: ['rate of tsi', 'rate tsi', 'kurs', 'rate', 'rate_tsi'],
      },
      {
        header: 'TSI',
        required: false,
        description: 'Total Sum Insured (DECIMAL 18,2)',
        exampleValue: '5000000000.00',
        aliases: ['tsi', 'total sum insured', 'sum insured', 'nilai pertanggungan', 'uang pertanggungan'],
      },
      {
        header: 'TSI in IDR',
        required: false,
        description: 'TSI dalam IDR (DECIMAL 18,2)',
        exampleValue: '5000000000.00',
        aliases: ['tsi in idr', 'tsi idr', 'total sum insured idr', 'tsi_in_idr'],
      },
      {
        header: 'Nilai Premi',
        required: true,
        description: 'Nilai premi gross (DECIMAL 18,2)',
        exampleValue: '12500000.00',
        aliases: ['nilai premi', 'premi', 'gross premium', 'total premi', 'premium', 'total premium', 'nilai premi brutto', 'nilai_premi'],
      },
      {
        header: 'Nilai Komisi',
        required: false,
        description: 'Komisi agen (DECIMAL 18,2)',
        exampleValue: '1875000.00',
        aliases: ['nilai komisi', 'komisi', 'commission', 'komisi agen', 'nilai_komisi'],
      },
      {
        header: 'Nilai Diskon',
        required: false,
        description: 'Diskon premi (DECIMAL 18,2)',
        exampleValue: '0.00',
        aliases: ['nilai diskon', 'diskon', 'discount', 'diskon premi', 'nilai_diskon'],
      },
      {
        header: 'Nilai Akusisi',
        required: false,
        description: 'Biaya akuisisi (DECIMAL 18,2)',
        exampleValue: '250000.00',
        aliases: ['nilai akusisi', 'akuisisi', 'biaya akuisisi', 'acquisition cost', 'nilai akuisisi', 'nilai_akusisi'],
      },
      // Object Information 1..15
      { header: 'Object Information 1', required: false, description: 'Detail objek 1 (Lokasi/Alamat)', exampleValue: 'Jl. Sudirman No. 45', aliases: ['object information 1', 'object info 1', 'info object 1'] },
      { header: 'Object Information 2', required: false, description: 'Detail objek 2 (Penggunaan Bangunan)', exampleValue: 'Gedung Perkantoran', aliases: ['object information 2', 'object info 2', 'info object 2'] },
      { header: 'Object Information 3', required: false, description: 'Detail objek 3 (Konstruksi Kelas)', exampleValue: 'Kelas 1', aliases: ['object information 3', 'object info 3', 'info object 3'] },
      { header: 'Object Information 4', required: false, description: 'Detail objek 4', exampleValue: '', aliases: ['object information 4', 'object info 4'] },
      { header: 'Object Information 5', required: false, description: 'Detail objek 5', exampleValue: '', aliases: ['object information 5', 'object info 5'] },
      { header: 'Object Information 6', required: false, description: 'Detail objek 6', exampleValue: '', aliases: ['object information 6', 'object info 6'] },
      { header: 'Object Information 7', required: false, description: 'Detail objek 7', exampleValue: '', aliases: ['object information 7', 'object info 7'] },
      { header: 'Object Information 8', required: false, description: 'Detail objek 8', exampleValue: '', aliases: ['object information 8', 'object info 8'] },
      { header: 'Object Information 9', required: false, description: 'Detail objek 9', exampleValue: '', aliases: ['object information 9', 'object info 9'] },
      { header: 'Object Information 10', required: false, description: 'Detail objek 10', exampleValue: '', aliases: ['object information 10', 'object info 10'] },
      { header: 'Object Information 11', required: false, description: 'Detail objek 11', exampleValue: '', aliases: ['object information 11', 'object info 11'] },
      { header: 'Object Information 12', required: false, description: 'Detail objek 12', exampleValue: '', aliases: ['object information 12', 'object info 12'] },
      { header: 'Object Information 13', required: false, description: 'Detail objek 13', exampleValue: '', aliases: ['object information 13', 'object info 13'] },
      { header: 'Object Information 14', required: false, description: 'Detail objek 14', exampleValue: '', aliases: ['object information 14', 'object info 14'] },
      { header: 'Object Information 15', required: false, description: 'Detail objek 15', exampleValue: '', aliases: ['object information 15', 'object info 15'] },
    ],
  },

  // ── 3. MasterClaim ───────────────────────────────────────────────────────────
  MASTER_CLAIM: {
    type: 'MASTER_CLAIM',
    title: 'Template Master Claim',
    fileName: 'Template_MasterClaim.xlsx',
    signatureColumns: ['Claim No', 'Gross Claim', 'Date Of Settlement'],
    columns: [
      {
        header: 'Agent ID',
        required: true,
        description: 'Kode agen terkait (Auto-provision jika baru)',
        exampleValue: 'AGT001',
        aliases: ['agent id', 'kode agen', 'agent code', 'id agen', 'kodeagen', 'agent_id'],
      },
      {
        header: 'Claim No',
        required: true,
        description: 'Nomor berkas klaim unik',
        exampleValue: 'CLM-2026-0089',
        aliases: ['claim no', 'no claim', 'no klaim', 'nomor klaim', 'claim_no', 'claimno'],
      },
      {
        header: 'Policy No',
        required: true,
        description: 'Nomor polis terkait klaim',
        exampleValue: 'POL-PAR-2026-0001',
        aliases: ['policy no', 'no policy', 'no polis', 'nomor polis', 'policy number', 'policy_no', 'policyno'],
      },
      {
        header: 'Date Of Settlement',
        required: false,
        description: 'Tanggal penyelesaian klaim (YYYY-MM-DD)',
        exampleValue: '2026-03-15',
        aliases: ['date of settlement', 'tgl settlement', 'tanggal settlement', 'settlement date', 'tgl klaim', 'date_of_settlement'],
      },
      {
        header: 'UW Year',
        required: false,
        description: 'Underwriting year',
        exampleValue: '2026',
        aliases: ['uw year', 'underwriting year', 'tahun uw', 'uw_year'],
      },
      {
        header: 'Gross Claim',
        required: true,
        description: 'Nilai klaim kotor (DECIMAL 18,2)',
        exampleValue: '4500000.00',
        aliases: ['gross claim', 'klaim', 'nilai klaim', 'total klaim', 'claim amount', 'claim', 'gross_claim'],
      },
      {
        header: 'Cabang/Branch',
        required: false,
        description: 'Cabang klaim (Auto-provisioned)',
        exampleValue: 'Jakarta Selatan',
        aliases: ['cabang/branch', 'cabang', 'branch', 'nama cabang', 'kantor cabang', 'cabang_klaim'],
      },
      {
        header: 'Nama Produk',
        required: false,
        description: 'Nama produk terkait klaim',
        exampleValue: 'Property All Risks',
        aliases: ['nama produk', 'product', 'produk', 'product name', 'nama_produk'],
      },
      {
        header: 'Currency',
        required: false,
        description: 'Mata uang klaim',
        exampleValue: 'IDR',
        aliases: ['currency', 'mata uang', 'curr'],
      },
      {
        header: 'Cause of Loss',
        required: false,
        description: 'Penyebab kerugian',
        exampleValue: 'Kerusakan akibat kebocoran pipa air',
        aliases: ['cause of loss', 'penyebab kerugian', 'penyebab', 'alasan klaim', 'cause_of_loss'],
      },
      {
        header: 'Indemnity',
        required: false,
        description: 'Nilai ganti rugi (DECIMAL 18,2)',
        exampleValue: '4500000.00',
        aliases: ['indemnity', 'ganti rugi', 'nilai ganti rugi'],
      },
      {
        header: 'Deductible',
        required: false,
        description: 'Potongan risiko sendiri (DECIMAL 18,2)',
        exampleValue: '500000.00',
        aliases: ['deductible', 'potongan risiko', 'risiko sendiri'],
      },
      {
        header: 'Salvage',
        required: false,
        description: 'Nilai sisa barang (DECIMAL 18,2)',
        exampleValue: '0.00',
        aliases: ['salvage', 'nilai sisa barang', 'sisa barang'],
      },
      {
        header: 'Subrogation',
        required: false,
        description: 'Nilai subrogasi (DECIMAL 18,2)',
        exampleValue: '0.00',
        aliases: ['subrogation', 'subrogasi', 'nilai subrogasi'],
      },
    ],
  },
};
