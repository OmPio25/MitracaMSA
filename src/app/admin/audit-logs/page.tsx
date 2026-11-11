'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Activity,
  Calendar,
  Layers,
  Globe,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  category: string;
  status: string;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

interface AuditStats {
  totalAll: number;
  todayCount: number;
  authCount: number;
  uploadCount: number;
  failedCount: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalAll: 0,
    todayCount: 0,
    authCount: 0,
    uploadCount: 0,
    failedCount: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1,
  });

  // Filter States
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set('page', String(pageToLoad));
        params.set('limit', String(pagination.limit));
        if (searchInput.trim()) params.set('search', searchInput.trim());
        if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
        if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
        if (!res.ok) throw new Error('Gagal memuat log audit');

        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
          if (data.pagination) setPagination(data.pagination);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, searchInput, selectedCategory, selectedStatus, startDate, endDate]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleReset = () => {
    setSearchInput('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (searchInput.trim()) params.set('search', searchInput.trim());
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const url = `/api/admin/audit-logs/export/xlsx?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengekspor data');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Log_Aktivitas_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Gagal mengekspor file Excel. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'AUTH':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'UPLOAD':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'USER_MANAGEMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SETTINGS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'EXPORT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Sukses
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Gagal
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Peringatan
          </span>
        );
      default:
        return <span>{st}</span>;
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── HEADER MODUL ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Log Aktivitas & Audit Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Audit & Kepatuhan
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Pemantauan kepatuhan sistem, rekam jejak autentikasi, mutasi data pengguna, dan aktivitas operasional secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition disabled:opacity-50"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting || logs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isExporting ? 'Mengekspor...' : 'Ekspor Excel (.xlsx)'}
          </button>
        </div>
      </div>

      {/* ── 4 KPI METRIC CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Seluruh Aktivitas
            </span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {stats.totalAll.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Rekam jejak sistem aktif</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Aktivitas Hari Ini
            </span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {stats.todayCount.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Sejak 00:00 WIB</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Aktivitas Autentikasi
            </span>
            <div className="text-xl font-black text-blue-700 mt-1">
              {stats.authCount.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Login, Logout & Password</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Percobaan Gagal / Waspada
            </span>
            <div className={`text-xl font-black mt-1 ${stats.failedCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {stats.failedCount.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Perlu atensi audit</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── FILTER & PENCARIAN ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, aksi, deskripsi, IP..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
            />
          </div>

          {/* Kategori Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="AUTH">Autentikasi (AUTH)</option>
              <option value="UPLOAD">Unggah Data (UPLOAD)</option>
              <option value="USER_MANAGEMENT">Manajemen User</option>
              <option value="SETTINGS">Pengaturan Sistem</option>
              <option value="EXPORT">Ekspor Dokumen</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUCCESS">Hanya Sukses</option>
              <option value="FAILED">Hanya Gagal</option>
              <option value="WARNING">Peringatan</option>
            </select>
          </div>

          {/* Tanggal Mulai */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
            />
          </div>

          {/* Tanggal Selesai */}
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
            />
            <button
              onClick={handleReset}
              title="Reset Filter"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── TABEL LOG AKTIVITAS AUDIT ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-40">Waktu (WIB)</th>
                <th className="py-3.5 px-4 w-52">Aktor / Pengguna</th>
                <th className="py-3.5 px-4 w-48">Kategori & Aksi</th>
                <th className="py-3.5 px-4">Deskripsi Aktivitas</th>
                <th className="py-3.5 px-4 w-36">Klien & IP</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                <th className="py-3.5 px-4 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Memuat log aktivitas...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada log aktivitas yang sesuai dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    {/* Waktu */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                      <div className="font-semibold text-slate-900">{formatDate(item.createdAt)}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.id.slice(0, 8)}...</div>
                    </td>

                    {/* Aktor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.userName ? item.userName.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {item.userName || 'Sistem / Anonim'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.userEmail || '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kategori & Aksi */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${getCategoryBadge(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-600 truncate">
                          {item.action}
                        </span>
                      </div>
                    </td>

                    {/* Deskripsi */}
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      <p className="line-clamp-2">{item.description}</p>
                    </td>

                    {/* IP & Klien */}
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="font-mono text-[11px] font-semibold text-slate-700">
                        {item.ipAddress || '127.0.0.1'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]" title={item.userAgent || ''}>
                        {item.userAgent || '-'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(item.status)}</td>

                    {/* Tombol Detail */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition"
                        title="Lihat Detail Log"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ────────────────────────────────────────────── */}
        <div className="border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Menampilkan{' '}
            <strong className="text-slate-800">
              {logs.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </strong>{' '}
            sampai{' '}
            <strong className="text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
            </strong>{' '}
            dari <strong className="text-slate-800">{pagination.totalCount}</strong> entri aktivitas
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-700 px-3 py-1 bg-white border border-slate-200 rounded-xl">
              Halaman {pagination.page} dari {pagination.totalPages || 1}
            </span>

            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DETAIL AUDIT LOG ─────────────────────────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Rincian Log Aktivitas</h3>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedLog.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Status & Waktu Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Waktu Kejadian</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {formatDate(selectedLog.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status</span>
                  {getStatusBadge(selectedLog.status)}
                </div>
              </div>

              {/* Data Aktor */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Aktor / Pengguna</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedLog.userName || 'Sistem'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{selectedLog.userEmail || '-'}</div>
                  <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit mt-1.5 border border-blue-200">
                    Role: {selectedLog.userRole || 'SYSTEM'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Kategori & Aksi</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedLog.category}</div>
                  <div className="text-xs font-mono text-slate-600 mt-0.5">{selectedLog.action}</div>
                  <div className="text-[10px] text-slate-500 mt-1.5">
                    IP: <strong>{selectedLog.ipAddress || '127.0.0.1'}</strong>
                  </div>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">Deskripsi Lengkap</span>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                  {selectedLog.description}
                </div>
              </div>

              {/* Client User Agent */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">Client User-Agent</span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono break-all">
                  {selectedLog.userAgent || '-'}
                </div>
              </div>

              {/* Metadata JSON Viewer */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">
                    Metadata Ekstra (Payload JSON)
                  </span>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
