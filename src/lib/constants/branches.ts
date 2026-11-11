/**
 * Master Cabang Resmi (Fixed Master Branches)
 * Sesuai ketentuan baku perusahaan: 49 Cabang Resmi.
 */

export interface MasterBranch {
  code: string;
  name: string;
}

export const FIXED_BRANCHES: MasterBranch[] = [
  { code: '00', name: 'KPO' },
  { code: '01', name: 'Duta Merlin' },
  { code: '02', name: 'Bogor' },
  { code: '03', name: 'Sukabumi' },
  { code: '06', name: 'Latumenten' },
  { code: '07', name: 'Tangerang' },
  { code: '08', name: 'Tiang Bendera' },
  { code: '09', name: 'Bekasi' },
  { code: '11', name: 'Bandung' },
  { code: '12', name: 'Cirebon' },
  { code: '14', name: 'Karawang' },
  { code: '21', name: 'Semarang' },
  { code: '22', name: 'Solo' },
  { code: '23', name: 'Purwokerto' },
  { code: '24', name: 'Tegal' },
  { code: '25', name: 'Yogyakarta' },
  { code: '31', name: 'Surabaya' },
  { code: '32', name: 'Malang' },
  { code: '33', name: 'Jember' },
  { code: '35', name: 'Surabaya 2' },
  { code: '36', name: 'Denpasar' },
  { code: '37', name: 'Mataram' },
  { code: '38', name: 'Kupang' },
  { code: '40', name: 'Bangka Belitung' },
  { code: '41', name: 'Medan' },
  { code: '42', name: 'Palembang' },
  { code: '43', name: 'Lampung' },
  { code: '44', name: 'Batam' },
  { code: '45', name: 'Pekanbaru' },
  { code: '46', name: 'Padang' },
  { code: '49', name: 'Jambi' },
  { code: '51', name: 'Pontianak' },
  { code: '52', name: 'Banjarmasin' },
  { code: '53', name: 'Samarinda' },
  { code: '54', name: 'Balikpapan' },
  { code: '55', name: 'Sampit' },
  { code: '61', name: 'Makasar' },
  { code: '62', name: 'Manado' },
  { code: '64', name: 'Medan Kisaran' },
  { code: '65', name: 'Aceh' },
  { code: '66', name: 'Pematang Siantar' },
  { code: '67', name: 'Medan Serdang' },
  { code: '81', name: 'Kelapa Gading' },
  { code: '82', name: 'Puri Indah' },
  { code: '83', name: 'Bintaro' },
  { code: '84', name: 'Pondok Indah' },
  { code: '88', name: 'Pusat' },
  { code: '91', name: 'Cikini' },
  { code: '93', name: 'Jatinegara' },
];

/**
 * Peta Sinonim / Variasi Penulisan Cabang Historis
 * Memetakan variasi teks legacy ke Kode Cabang Resmi.
 */
export const BRANCH_ALIAS_MAP: Record<string, string> = {
  // 00 KPO
  'KPO': '00',
  'KANTOR PUSAT OPERASIONAL': '00',
  '00 - KANTOR PUSAT OPERASIONAL': '00',
  '00---KANTOR-PUSAT-OPERASIONAL': '00',

  // 01 Duta Merlin
  'DUTA MERLIN': '01',
  'DUTA-MERLIN': '01',
  '01 - DUTA MERLIN': '01',

  // 02 Bogor
  'BOGOR': '02',
  '02 - BOGOR': '02',

  // 03 Sukabumi
  'SUKABUMI': '03',
  '03 - SUKABUMI': '03',

  // 06 Latumenten
  'LATUMENTEN': '06',
  '06 - LATUMENTEN': '06',

  // 07 Tangerang
  'TANGERANG': '07',
  '07 - TANGERANG': '07',

  // 08 Tiang Bendera
  'TIANG BENDERA': '08',
  'TIANG-BENDERA': '08',
  '08 - TIANG BENDERA': '08',
  '08---TIANG-BENDERA': '08',

  // 09 Bekasi
  'BEKASI': '09',
  '09 - BEKASI': '09',

  // 11 Bandung
  'BANDUNG': '11',
  '11 - BANDUNG': '11',

  // 12 Cirebon
  'CIREBON': '12',
  '12 - CIREBON': '12',

  // 14 Karawang
  'KARAWANG': '14',
  '14 - KARAWANG': '14',
  '14---KARAWANG': '14',

  // 21 Semarang
  'SEMARANG': '21',
  '21 - SEMARANG': '21',

  // 22 Solo
  'SOLO': '22',
  'SURAKARTA': '22',
  '22 - SOLO': '22',

  // 23 Purwokerto
  'PURWOKERTO': '23',
  '23 - PURWOKERTO': '23',

  // 24 Tegal
  'TEGAL': '24',
  '24 - TEGAL': '24',

  // 25 Yogyakarta
  'YOGYAKARTA': '25',
  'JOGJA': '25',
  'JOGJAKARTA': '25',
  '25 - YOGYAKARTA': '25',

  // 31 Surabaya
  'SURABAYA': '31',
  'SURABAYA 1': '31',
  'SURABAYA PUSAT': '31',
  'SURABAYA-PUSAT': '31',
  '31 - SURABAYA': '31',

  // 32 Malang
  'MALANG': '32',
  '32 - MALANG': '32',

  // 33 Jember
  'JEMBER': '33',
  '33 - JEMBER': '33',

  // 35 Surabaya 2
  'SURABAYA 2': '35',
  'SURABAYA-2': '35',
  'SURABAYA II': '35',
  '35 - SURABAYA 2': '35',

  // 36 Denpasar
  'DENPASAR': '36',
  '36 - DENPASAR': '36',
  '36---DENPASAR': '36',

  // 37 Mataram
  'MATARAM': '37',
  'LOMBOK': '37',
  '37 - MATARAM': '37',

  // 38 Kupang
  'KUPANG': '38',
  '38 - KUPANG': '38',

  // 40 Bangka Belitung
  'BANGKA BELITUNG': '40',
  'BANGKA-BELITUNG': '40',
  'BANGKA': '40',
  'PANGKAL PINANG': '40',
  'PANGKAL-PINANG': '40',
  'KCK BANGKA': '40',
  'KCK-BANGKA': '40',
  'KCK': '40',
  'KCK-BD': '40',
  'KCK BD': '40',
  '40 - BANGKA BELITUNG': '40',

  // 41 Medan
  'MEDAN': '41',
  'MEDAN BUKIT BARISAN': '41',
  'MEDAN-BUKIT-BARISAN': '41',
  '41 - MEDAN': '41',

  // 42 Palembang
  'PALEMBANG': '42',
  '42 - PALEMBANG': '42',

  // 43 Lampung
  'LAMPUNG': '43',
  'BANDAR LAMPUNG': '43',
  '43 - LAMPUNG': '43',

  // 44 Batam
  'BATAM': '44',
  '44 - BATAM': '44',

  // 45 Pekanbaru
  'PEKANBARU': '45',
  '45 - PEKANBARU': '45',

  // 46 Padang
  'PADANG': '46',
  '46 - PADANG': '46',

  // 49 Jambi
  'JAMBI': '49',
  '49 - JAMBI': '49',

  // 51 Pontianak
  'PONTIANAK': '51',
  'POTIANAK': '51',
  '51 - PONTIANAK': '51',

  // 52 Banjarmasin
  'BANJARMASIN': '52',
  '52 - BANJARMASIN': '52',

  // 53 Samarinda
  'SAMARINDA': '53',
  '53 - SAMARINDA': '53',

  // 54 Balikpapan
  'BALIKPAPAN': '54',
  '54 - BALIKPAPAN': '54',

  // 55 Sampit
  'SAMPIT': '55',
  '55 - SAMPIT': '55',

  // 61 Makasar
  'MAKASAR': '61',
  'MAKASSAR': '61',
  'UJUNG PANDANG': '61',
  'KENDARI': '61',
  '61 - MAKASAR': '61',

  // 62 Manado
  'MANADO': '62',
  '62 - MANADO': '62',

  // 64 Medan Kisaran
  'MEDAN KISARAN': '64',
  'MEDAN-KISARAN': '64',
  'KISARAN': '64',
  '64 - MEDAN KISARAN': '64',

  // 65 Aceh
  'ACEH': '65',
  'BANDA ACEH': '65',
  '65 - ACEH': '65',

  // 66 Pematang Siantar
  'PEMATANGSIANTAR': '66',
  'PEMATANG SIANTAR': '66',
  'PEMATANG-SIANTAR': '66',
  'SIANTAR': '66',
  '66 - PEMATANG SIANTAR': '66',

  // 67 Medan Serdang
  'MEDAN SERDANG': '67',
  'MEDAN-SERDANG': '67',
  'SERDANG': '67',
  '67 - MEDAN SERDANG': '67',

  // 81 Kelapa Gading
  'KELAPA GADING': '81',
  'KELAPA-GADING': '81',
  'KLP GADING': '81',
  '81 - KELAPA GADING': '81',

  // 82 Puri Indah
  'PURI INDAH': '82',
  'PURI-INDAH': '82',
  '82 - PURI INDAH': '82',

  // 83 Bintaro
  'BINTARO': '83',
  '83 - BINTARO': '83',

  // 84 Pondok Indah
  'PONDOK INDAH': '84',
  'PONDOK-INDAH': '84',
  '84 - PONDOK INDAH': '84',

  // 88 Pusat
  'PUSAT': '88',
  'JAKARTA PUSAT': '88',
  'JAKARTA SELATAN': '88',
  'JAKARTA-SELATAN': '88',
  'AMBASADOR': '88',
  '88 - PUSAT': '88',

  // 91 Cikini
  'CIKINI': '91',
  '91 - CIKINI': '91',

  // 93 Jatinegara
  'JATINEGARA': '93',
  '93 - JATINEGARA': '93',
  '93---JATINEGARA': '93',
};
