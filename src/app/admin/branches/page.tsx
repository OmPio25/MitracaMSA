'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Building,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
  Check,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  Power,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface BranchItem {
  id: string;
  code: string;
  name: string;
  rawAlias: string | null;
  isActive: boolean;
  isPortalActive: boolean;
  isAutoProvisioned: boolean;
  createdAt: string;
  updatedAt: string;
  agentsCount: number;
  prodCount: number;
}

export default function MasterBranchesPage() {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortField, setSortField] = useState<'code' | 'name' | 'agentsCount'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedBranch, setSelectedBranch] = useState<BranchItem | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formRawAlias, setFormRawAlias] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsPortalActive, setFormIsPortalActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingBranchId, setTogglingBranchId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<BranchItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load branches from API
  const loadBranches = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/branches');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat cabang.');
      setBranches(data.branches || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  // Filtered & Sorted branches
  const filteredBranches = useMemo(() => {
    return branches
      .filter((b) => {
        // Search filter
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          b.code.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q) ||
          (b.rawAlias && b.rawAlias.toLowerCase().includes(q));

        // Status filter
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && b.isActive) ||
          (statusFilter === 'INACTIVE' && !b.isActive);

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortField === 'agentsCount') {
          return sortOrder === 'asc'
            ? a.agentsCount - b.agentsCount
            : b.agentsCount - a.agentsCount;
        }
        if (sortField === 'code') {
          return sortOrder === 'asc'
            ? a.code.localeCompare(b.code, undefined, { numeric: true })
            : b.code.localeCompare(a.code, undefined, { numeric: true });
        }
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
  }, [branches, searchQuery, statusFilter, sortField, sortOrder]);

  // Stats calculation
  const totalBranches = branches.length;
  const activeCount = branches.filter((b) => b.isActive).length;
  const inactiveCount = branches.filter((b) => !b.isActive).length;
  const totalAgents = branches.reduce((sum, b) => sum + (Number(b.agentsCount) || 0), 0);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setSelectedBranch(null);
    setFormCode('');
    setFormName('');
    setFormRawAlias('');
    setFormIsActive(true);
    setFormIsPortalActive(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: BranchItem) => {
    setModalMode('EDIT');
    setSelectedBranch(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormRawAlias(item.rawAlias || '');
    setFormIsActive(item.isActive);
    setFormIsPortalActive(item.isPortalActive ?? false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Quick Toggle Portal Mandiri (Khusus SUPERADMIN)
  const handleTogglePortal = async (branch: BranchItem) => {
    if (userRole !== 'SUPERADMIN') return;
    setTogglingBranchId(branch.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const nextState = !branch.isPortalActive;
      const res = await fetch('/api/branches/toggle-portal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: branch.id, isPortalActive: nextState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah izin akses portal cabang');
      setSuccessMessage(data.message);
      setTimeout(() => setSuccessMessage(null), 4000);
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, isPortalActive: nextState } : b))
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setTogglingBranchId(null);
    }
  };

  // Form Submit (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formCode.trim().toUpperCase();
    const cleanName = formName.trim();
    if (!cleanCode) {
      setFormError('Kode cabang wajib diisi.');
      return;
    }
    if (!cleanName) {
      setFormError('Nama cabang wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = '/api/branches';
      const method = modalMode === 'CREATE' ? 'POST' : 'PUT';
      const payload: any = {
        code: cleanCode,
        name: cleanName,
        rawAlias: formRawAlias.trim() || `${cleanCode} - ${cleanName.toUpperCase()}`,
        isActive: formIsActive,
        isPortalActive: formIsPortalActive,
      };

      if (modalMode === 'EDIT' && selectedBranch) {
        payload.id = selectedBranch.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan cabang.');

      setSuccessMessage(data.message || 'Cabang berhasil disimpan.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsModalOpen(false);
      loadBranches();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Branch Action
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/branches?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus cabang.');

      setSuccessMessage(data.message || 'Cabang berhasil dihapus.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setDeleteTarget(null);
      loadBranches();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghapus cabang.');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (item: BranchItem) => {
    try {
      const res = await fetch('/api/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          code: item.code,
          name: item.name,
          rawAlias: item.rawAlias,
          isActive: !item.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status cabang.');

      loadBranches();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengubah status cabang.');
    }
  };

  return (
    <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <Building className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Kelola Master Cabang
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pusat manajemen master cabang resmi, normalisasi kode cabang, alias upload, dan status operasional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBranches}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Cabang Baru</span>
          </button>
        </div>
      </div>

      {/* ── Submenu Pengaturan ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm flex flex-wrap gap-1.5 items-center">
        {userRole === 'SUPERADMIN' && (
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Users className="w-3.5 h-3.5" />
            Kelola User Akses
            <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
              Superadmin
            </span>
          </Link>
        )}

        <Link
          href="/admin/branches"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
        >
          <Building2 className="w-3.5 h-3.5" />
          Master Cabang
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
            Admin
          </span>
        </Link>

        <Link
          href="/settings/change-password"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Ganti Password
        </Link>
      </div>

      {/* Toast Alert Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs font-bold">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="text-xs font-bold">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 dark:text-rose-300 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Cabang</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{totalBranches}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cabang Aktif</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cabang Non-Aktif</p>
            <p className="text-2xl font-extrabold text-slate-600 dark:text-slate-400 mt-1">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Agen Terhubung</p>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {new Intl.NumberFormat('id-ID').format(totalAgents)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Cari kode cabang (mis. 81) atau nama cabang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mr-1">Status:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Semua ({totalBranches})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
              statusFilter === 'INACTIVE'
                ? 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Non-Aktif ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  onClick={() => {
                    if (sortField === 'code') setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortField('code');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Kode Cabang</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  onClick={() => {
                    if (sortField === 'name') setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortField('name');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Cabang Resmi</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th scope="col" className="px-4 py-3">
                  Alias Penulisan / Legacy Format
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
                  onClick={() => {
                    if (sortField === 'agentsCount') setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortField('agentsCount');
                      setSortOrder('desc');
                    }
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Agen Terhubung</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Status Cabang
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Portal Mandiri (Role Cabang)
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                    <p className="text-xs font-semibold">Memuat master data cabang...</p>
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Building className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Tidak ada cabang ditemukan</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Coba ganti kata kunci pencarian atau filter status Anda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    {/* Kode Cabang */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                        {item.code}
                      </span>
                    </td>

                    {/* Nama Cabang */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
                    </td>

                    {/* Alias */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-xs">
                      {item.rawAlias || '-'}
                    </td>

                    {/* Agen Terhubung */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 rounded-full ${
                          item.agentsCount > 0
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        {new Intl.NumberFormat('id-ID').format(item.agentsCount)} agen
                      </span>
                    </td>

                    {/* Status Cabang Toggle */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition cursor-pointer ${
                          item.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Klik untuk mengubah status aktif/non-aktif operasional cabang"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {item.isActive ? 'Aktif' : 'Non-Aktif'}
                      </button>
                    </td>

                    {/* Portal Mandiri (Role Cabang) Toggle */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {userRole === 'SUPERADMIN' ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePortal(item)}
                          disabled={togglingBranchId === item.id}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition cursor-pointer shadow-2xs ${
                            item.isPortalActive
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          } disabled:opacity-50`}
                          title="Klik untuk mengaktifkan / menonaktifkan akses Direktori Keagenan untuk KACAB & PIC_CABANG"
                        >
                          {togglingBranchId === item.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ShieldCheck className={`w-3.5 h-3.5 ${item.isPortalActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                          )}
                          <span>{item.isPortalActive ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            item.isPortalActive
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Hanya Superadmin yang berwenang mengubah izin portal cabang"
                        >
                          <ShieldCheck className={`w-3 h-3 ${item.isPortalActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                          {item.isPortalActive ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition cursor-pointer"
                        title="Edit Cabang"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 transition cursor-pointer"
                        title="Hapus Cabang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] flex items-center justify-between">
          <span>
            Menampilkan <span className="font-bold text-slate-700 dark:text-slate-200">{filteredBranches.length}</span> dari {totalBranches} cabang master
          </span>
          <span className="text-slate-400 dark:text-slate-500">Database Engine: PostgreSQL Normalization</span>
        </div>
      </div>

      {/* Modal Form: Create / Edit Branch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-lg">
                  <Building className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {modalMode === 'CREATE' ? 'Tambah Cabang Baru' : 'Edit Data Cabang'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Kode Cabang */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kode Cabang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 70, 81, 00"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  required
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Kode numerik/alfanumerik 2 karakter standar (misal: 70 untuk Gorontalo).
                </p>
              </div>

              {/* Nama Cabang */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nama Cabang Resmi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gorontalo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Alias Penulisan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Alias Penulisan / Format Unggah (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 70 - GORONTALO"
                  value={formRawAlias}
                  onChange={(e) => setFormRawAlias(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Jika kosong, otomatis diset menjadi: [KODE] - [NAMA].
                </p>
              </div>

              {/* Status Aktif Cabang */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Status Cabang Aktif untuk Operasional
                  </span>
                </label>
              </div>

              {/* Status Akses Portal Mandiri (Role Cabang) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPortalActive}
                    onChange={(e) => setFormIsPortalActive(e.target.checked)}
                    disabled={userRole !== 'SUPERADMIN'}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Aktifkan Akses Portal Mandiri (Role Cabang)
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {userRole === 'SUPERADMIN'
                        ? 'Jika dicentang, KACAB dan PIC_CABANG cabang ini dapat mengakses menu Direktori Keagenan Cabang.'
                        : 'Hanya Superadmin yang berwenang mengubah izin akses portal cabang.'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Hapus Cabang [{deleteTarget.code}] {deleteTarget.name}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus cabang ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            {deleteTarget.agentsCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
                ⚠️ Cabang ini memiliki <strong>{deleteTarget.agentsCount} agen</strong> terhubung. Sistem akan menolak penghapusan untuk melindungi integritas relasi data. Silakan ubah status menjadi non-aktif.
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
