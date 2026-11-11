'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  GitFork,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit2,
  Eye,
  Power,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layers,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  Award,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react';

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface AgentListItem {
  id: string;
  agentCode: string;
  name: string;
  profId: string | null;
  statusKeagenan: string | null;
  uplineAgentCode: string | null;
  uplineName: string | null;
  peringkat: string | null;
  rawBranchName: string | null;
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  parentId: string | null;
  uplineStatus: string;
  materializedPath: string | null;
  depth: number;
  email: string | null;
  phone: string | null;
  isPlaceholder: boolean;
  isActive: boolean;
  downlinesCount: number;
  prodCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AgentDetailData extends AgentListItem {
  branch: BranchOption | null;
  upline: {
    id: string;
    agentCode: string;
    name: string;
    peringkat: string | null;
    rawBranchName: string | null;
  } | null;
  ancestorCodes: string[];
  directDownlines: {
    id: string;
    agentCode: string;
    name: string;
    peringkat: string | null;
    statusKeagenan: string | null;
    rawBranchName: string | null;
    depth: number;
  }[];
  productionSummary: {
    totalPolicies: number;
    totalPremi: string | number;
    totalTsi: string | number;
  };
  claimSummary: {
    totalClaims: number;
    totalClaimAmount: string | number;
  };
}

interface AgentStats {
  totalAgents: number;
  activeCount: number;
  inactiveCount: number;
  cutCount: number;
  placeholderAgents: number;
  pendingUplineAgents: number;
}

const RANK_OPTIONS = [
  'Partner',
  'Senior Partner',
  'Executive Partner',
  'Managing Partner',
];

const STATUS_KEAGENAN_OPTIONS = [
  'Aktif',
  'Non Aktif',
  'Cut',
];

export default function MasterAgentsPage() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    totalAgents: 0,
    activeCount: 0,
    inactiveCount: 0,
    cutCount: 0,
    placeholderAgents: 0,
    pendingUplineAgents: 0,
  });
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [uplineStatusFilter, setUplineStatusFilter] = useState('ALL');
  const [placeholderFilter, setPlaceholderFilter] = useState('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedAgent, setSelectedAgent] = useState<AgentListItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<AgentDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [agentToDeactivate, setAgentToDeactivate] = useState<AgentListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending Upline Inspector Modal States
  const [isPendingUplineModalOpen, setIsPendingUplineModalOpen] = useState(false);
  const [pendingUplineAgentsList, setPendingUplineAgentsList] = useState<AgentListItem[]>([]);
  const [isLoadingPendingUplineList, setIsLoadingPendingUplineList] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    agentCode: '',
    name: '',
    profId: '',
    peringkat: 'Partner',
    branchId: '',
    uplineMode: 'NONE' as 'NONE' | 'SELECT',
    uplineAgentCode: '',
    statusKeagenan: 'Aktif',
    email: '',
    phone: '',
    isActive: true,
  });

  // Autocomplete Upline Picker State
  const [uplineSearchQuery, setUplineSearchQuery] = useState('');
  const [uplineSearchResults, setUplineSearchResults] = useState<any[]>([]);
  const [isSearchingUpline, setIsSearchingUpline] = useState(false);
  const [isUplineDropdownOpen, setIsUplineDropdownOpen] = useState(false);
  const [selectedUplineObj, setSelectedUplineObj] = useState<any | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load branches for filter & form
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    }
    fetchBranches();
  }, []);

  // Fetch agents data
  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      if (statusFilter !== 'ALL') params.set('statusKeagenan', statusFilter);
      if (uplineStatusFilter !== 'ALL') params.set('uplineStatus', uplineStatusFilter);
      if (placeholderFilter !== 'ALL') params.set('isPlaceholder', placeholderFilter);

      const res = await fetch(`/api/admin/agents?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memuat data master agen');
      }

      setAgents(data.agents || []);
      setStats(data.stats || {
        totalAgents: 0,
        activeAgents: 0,
        placeholderAgents: 0,
        pendingUplineAgents: 0,
      });
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, branchFilter, statusFilter, uplineStatusFilter, placeholderFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Search upline autocomplete
  useEffect(() => {
    if (!uplineSearchQuery || uplineSearchQuery.length < 1) {
      setUplineSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUpline(true);
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(uplineSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out self if editing
          const filtered = (data.agents || []).filter(
            (a: any) => formMode !== 'EDIT' || a.agentCode !== selectedAgent?.agentCode
          );
          setUplineSearchResults(filtered);
          setIsUplineDropdownOpen(true);
        }
      } catch (err) {
        console.error('Upline search error:', err);
      } finally {
        setIsSearchingUpline(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [uplineSearchQuery, formMode, selectedAgent]);

  // Helper render status keagenan (Aktif, Non Aktif, Cut)
  const renderStatusKeagenanBadge = (rawStatus?: string | null) => {
    const s = (rawStatus || '').trim().toUpperCase();
    if (s === 'AKTIF') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          Aktif
        </span>
      );
    } else if (s === 'CUT') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
          Cut
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
          Non Aktif
        </span>
      );
    }
  };

  // Open Create Form Modal
  const handleOpenCreateModal = () => {
    setFormMode('CREATE');
    setSelectedAgent(null);
    setFormData({
      agentCode: '',
      name: '',
      profId: '',
      peringkat: 'Partner',
      branchId: branches[0]?.id || '',
      uplineMode: 'NONE',
      uplineAgentCode: '',
      statusKeagenan: 'Aktif',
      email: '',
      phone: '',
      isActive: true,
    });
    setSelectedUplineObj(null);
    setUplineSearchQuery('');
    setErrorMessage(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Form Modal
  const handleOpenEditModal = (agent: AgentListItem) => {
    setFormMode('EDIT');
    setSelectedAgent(agent);
    
    // Normalisasi status keagenan ke 3 opsi: Aktif, Non Aktif, Cut
    const rawSt = (agent.statusKeagenan || '').trim().toUpperCase();
    let normalizedStatus = 'Aktif';
    if (rawSt === 'CUT') {
      normalizedStatus = 'Cut';
    } else if (rawSt === 'NON AKTIF' || rawSt === 'NONAKTIF' || rawSt === 'TIDAK AKTIF') {
      normalizedStatus = 'Non Aktif';
    } else {
      normalizedStatus = 'Aktif';
    }

    setFormData({
      agentCode: agent.agentCode,
      name: agent.name,
      profId: agent.profId || '',
      peringkat: RANK_OPTIONS.includes(agent.peringkat || '') ? agent.peringkat! : 'Partner',
      branchId: agent.branchId || '',
      uplineMode: agent.uplineAgentCode ? 'SELECT' : 'NONE',
      uplineAgentCode: agent.uplineAgentCode || '',
      statusKeagenan: normalizedStatus,
      email: agent.email || '',
      phone: agent.phone || '',
      isActive: normalizedStatus === 'Aktif',
    });
    setSelectedUplineObj(
      agent.uplineAgentCode
        ? { agentCode: agent.uplineAgentCode, name: agent.uplineName || agent.uplineAgentCode }
        : null
    );
    setUplineSearchQuery(agent.uplineAgentCode || '');
    setErrorMessage(null);
    setIsFormModalOpen(true);
  };

  // Open Detail Inspector Modal
  const handleOpenDetailModal = async (agent: AgentListItem) => {
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDetailData(data.agent);
      } else {
        throw new Error(data.error || 'Gagal memuat detail agen');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Open Pending Upline List Modal
  const handleOpenPendingUplineModal = async () => {
    setIsPendingUplineModalOpen(true);
    setIsLoadingPendingUplineList(true);
    try {
      const res = await fetch('/api/admin/agents?uplineStatus=PENDING_UPLINE&limit=100');
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingUplineAgentsList(data.agents || []);
      } else {
        throw new Error(data.error || 'Gagal memuat daftar pending upline');
      }
    } catch (err: any) {
      console.error('Error loading pending upline agents:', err);
    } finally {
      setIsLoadingPendingUplineList(false);
    }
  };

  // Handle Form Submit (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const finalRank = RANK_OPTIONS.includes(formData.peringkat) ? formData.peringkat : 'Partner';

      const finalUplineCode =
        formData.uplineMode === 'SELECT' ? formData.uplineAgentCode.trim() : null;

      const payload = {
        agentCode: formData.agentCode.trim().toUpperCase(),
        name: formData.name.trim(),
        profId: formData.profId.trim() || null,
        peringkat: finalRank,
        branchId: formData.branchId || null,
        uplineAgentCode: finalUplineCode,
        statusKeagenan: formData.statusKeagenan,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        isActive: formData.statusKeagenan === 'Aktif',
      };

      let res;
      if (formMode === 'CREATE') {
        res = await fetch('/api/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/agents/${selectedAgent?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan data agen');
      }

      setSuccessMessage(
        formMode === 'CREATE'
          ? `Agen '${payload.agentCode}' berhasil ditambahkan ke master!`
          : `Data agen '${payload.agentCode}' berhasil diperbarui!`
      );
      setIsFormModalOpen(false);
      fetchAgents();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Status (Aktifkan / Nonaktifkan)
  const handleToggleAgentStatus = async (agent: AgentListItem, targetStatus: 'Aktif' | 'Non Aktif') => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusKeagenan: targetStatus,
          isActive: targetStatus === 'Aktif',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah status agen');
      }

      setSuccessMessage(
        targetStatus === 'Aktif'
          ? `Agen '${agent.agentCode}' - ${agent.name} berhasil diaktifkan kembali!`
          : `Agen '${agent.agentCode}' - ${agent.name} telah diubah ke status Non Aktif.`
      );
      fetchAgents();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengubah status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Deactivate Confirm
  const handleConfirmDeactivate = async () => {
    if (!agentToDeactivate) return;
    await handleToggleAgentStatus(agentToDeactivate, 'Non Aktif');
    setIsDeactivateModalOpen(false);
    setAgentToDeactivate(null);
  };

  // Helper formatting numbers
  const formatIDR = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Master Agen
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola profil keagenan, mutasi upline, validasi struktur pohon hirarki, dan pemeliharaan status agen.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Agen Baru</span>
          </button>
        </div>
      </div>

      {/* ── ALERT MESSAGES ─────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 4 KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Agen */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Master Agen
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {stats.totalAgents.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Status Keagenan (3 Info: Aktif, Non Aktif, Cut) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Status Keagenan
            </p>
            <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="p-1 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100/90 dark:border-emerald-900/40">
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase truncate">Aktif</span>
              <span className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-300">
                {(stats.activeCount || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase truncate">Non Aktif</span>
              <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200">
                {(stats.inactiveCount || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-1 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100/90 dark:border-rose-900/40">
              <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 block uppercase truncate">Cut</span>
              <span className="text-sm sm:text-base font-black text-rose-800 dark:text-rose-300">
                {(stats.cutCount || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Placeholder Agents */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Agen Placeholder
            </p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.placeholderAgents.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Auto-provisioned</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Pending Upline */}
        <div
          onClick={handleOpenPendingUplineModal}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md cursor-pointer transition group"
          title="Klik untuk melihat rincian agen yang pending upline"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                Pending Upline
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-md">
                Lihat Detail
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {stats.pendingUplineAgents.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-0.5 flex items-center gap-1">
              <span>Buka daftar agen</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition flex items-center justify-center">
            <GitFork className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Kode Agen, Nama, PROF ID, Upline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Cabang */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Keagenan */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">Semua Status Keagenan</option>
              <option value="AKTIF">Aktif</option>
              <option value="NON_AKTIF">Non Aktif</option>
              <option value="CUT">Cut</option>
            </select>
          </div>

          {/* Filter Status Upline */}
          <div>
            <select
              value={uplineStatusFilter}
              onChange={(e) => {
                setUplineStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">Semua Status Pohon</option>
              <option value="LINKED">LINKED (Terhubung)</option>
              <option value="PENDING_UPLINE">PENDING_UPLINE</option>
              <option value="ROOT">ROOT (Leader Utama)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter & Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Filter Tambahan:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="placeholderFilter"
                checked={placeholderFilter === 'ALL'}
                onChange={() => {
                  setPlaceholderFilter('ALL');
                  setPage(1);
                }}
                className="w-3.5 h-3.5 text-blue-600"
              />
              <span>Semua</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="placeholderFilter"
                checked={placeholderFilter === 'true'}
                onChange={() => {
                  setPlaceholderFilter('true');
                  setPage(1);
                }}
                className="w-3.5 h-3.5 text-blue-600"
              />
              <span className="text-amber-700 dark:text-amber-400 font-medium">Hanya Placeholder</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="placeholderFilter"
                checked={placeholderFilter === 'false'}
                onChange={() => {
                  setPlaceholderFilter('false');
                  setPage(1);
                }}
                className="w-3.5 h-3.5 text-blue-600"
              />
              <span>Agen Resmi</span>
            </label>
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setDebouncedSearch('');
              setBranchFilter('ALL');
              setStatusFilter('ALL');
              setUplineStatusFilter('ALL');
              setPlaceholderFilter('ALL');
              setPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>

      {/* ── DATA TABLE ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Kode Agen</th>
                <th className="py-3 px-4">Nama Agen & Profile ID</th>
                <th className="py-3 px-4">Peringkat</th>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Upline Langsung</th>
                <th className="py-3 px-4">Status Pohon</th>
                <th className="py-3 px-4">Keagenan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span>Memuat data master agen...</span>
                    </div>
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <span className="font-medium text-slate-600 dark:text-slate-300">Tidak ada agen yang sesuai filter</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Coba sesuaikan kata kunci pencarian atau reset filter di atas.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition group"
                  >
                    {/* Kode Agen */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>{agent.agentCode}</span>
                        {agent.isPlaceholder && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-sans font-semibold"
                            title="Auto-provisioned dari produksi/klaim"
                          >
                            PH
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Nama Agen & Profile ID */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{agent.name}</div>
                      {agent.profId && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          Profile ID: {agent.profId}
                        </div>
                      )}
                    </td>

                    {/* Peringkat */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Award className="w-3 h-3 text-amber-500" />
                        <span>{agent.peringkat || 'Partner'}</span>
                      </span>
                    </td>

                    {/* Cabang */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{agent.branchName || agent.rawBranchName || '-'}</span>
                      </div>
                    </td>

                    {/* Upline Langsung */}
                    <td className="py-3 px-4">
                      {agent.uplineAgentCode ? (
                        <div className="text-slate-800 dark:text-slate-200">
                          <span className="font-mono font-bold text-[11px]">
                            {agent.uplineAgentCode}
                          </span>
                          {agent.uplineName && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate max-w-[140px]">
                              {agent.uplineName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">- ROOT -</span>
                      )}
                    </td>

                    {/* Status Pohon */}
                    <td className="py-3 px-4">
                      {agent.uplineStatus === 'LINKED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>LINKED</span>
                        </span>
                      )}
                      {agent.uplineStatus === 'PENDING_UPLINE' && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                          title="Menunggu upline terdaftar di master"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                          <span>PENDING</span>
                        </span>
                      )}
                      {agent.uplineStatus === 'ROOT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>ROOT</span>
                        </span>
                      )}
                    </td>

                    {/* Keagenan (Aktif, Non Aktif, Cut) */}
                    <td className="py-3 px-4">
                      {renderStatusKeagenanBadge(agent.statusKeagenan)}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(agent)}
                          title="Inspeksi Detail & Downline"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(agent)}
                          title="Edit Profil & Mutasi Upline"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {agent.statusKeagenan?.trim().toUpperCase() === 'AKTIF' ? (
                          <button
                            onClick={() => {
                              setAgentToDeactivate(agent);
                              setIsDeactivateModalOpen(true);
                            }}
                            title="Ubah Status ke Non Aktif"
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleAgentStatus(agent, 'Aktif')}
                            title="Aktifkan Kembali Agen"
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ───────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Menampilkan{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {agents.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{' '}
            -{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {Math.min(page * limit, totalCount)}
            </span>{' '}
            dari <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount}</span> agen
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300 px-2">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: TAMBAH / EDIT AGEN ───────────────────────────────────────── */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {formMode === 'CREATE' ? 'Tambah Agen Baru' : `Edit Agen: ${selectedAgent?.agentCode}`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formMode === 'CREATE'
                      ? 'Lengkapi data profil keagenan dan penempatan upline.'
                      : 'Perbarui profil agen, status keagenan, atau lakukan mutasi upline.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Row 1: Kode Agen & Nama */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Kode Agen <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={formMode === 'EDIT'}
                    placeholder="Contoh: 871300"
                    value={formData.agentCode}
                    onChange={(e) =>
                      setFormData({ ...formData, agentCode: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Nama Lengkap Agen <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap sesuai KTP / AAJI"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Profile ID & Cabang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Profile ID
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: M8BW00001"
                    value={formData.profId}
                    onChange={(e) => setFormData({ ...formData, profId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Kantor Cabang Resmi
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="dark:bg-slate-900">
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Peringkat & Status Keagenan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Peringkat / Jenjang Karir
                  </label>
                  <select
                    value={formData.peringkat}
                    onChange={(e) => setFormData({ ...formData, peringkat: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  >
                    {RANK_OPTIONS.map((r) => (
                      <option key={r} value={r} className="dark:bg-slate-900">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Status Keagenan
                  </label>
                  <select
                    value={formData.statusKeagenan}
                    onChange={(e) => setFormData({ ...formData, statusKeagenan: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                  >
                    {STATUS_KEAGENAN_OPTIONS.map((st) => (
                      <option key={st} value={st} className="dark:bg-slate-900">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Upline Selector & Picker */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <GitFork className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Penempatan Upline (Silsilah Pohon)</span>
                  </label>
                  <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="uplineMode"
                        checked={formData.uplineMode === 'NONE'}
                        onChange={() => {
                          setFormData({ ...formData, uplineMode: 'NONE', uplineAgentCode: '' });
                          setSelectedUplineObj(null);
                        }}
                        className="text-blue-600"
                      />
                      <span>Tanpa Upline (Root)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="uplineMode"
                        checked={formData.uplineMode === 'SELECT'}
                        onChange={() => setFormData({ ...formData, uplineMode: 'SELECT' })}
                        className="text-blue-600"
                      />
                      <span className="font-bold text-blue-700 dark:text-blue-400">Pilih Upline</span>
                    </label>
                  </div>
                </div>

                {formData.uplineMode === 'SELECT' && (
                  <div className="space-y-2">
                    {selectedUplineObj ? (
                      <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                            {selectedUplineObj.agentCode}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedUplineObj.name}
                          </span>
                          {selectedUplineObj.peringkat && (
                            <span className="text-[10px] text-slate-400">
                              ({selectedUplineObj.peringkat})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUplineObj(null);
                            setFormData({ ...formData, uplineAgentCode: '' });
                            setUplineSearchQuery('');
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ketik kode agen atau nama upline untuk mencari..."
                          value={uplineSearchQuery}
                          onChange={(e) => {
                            setUplineSearchQuery(e.target.value);
                            setFormData({ ...formData, uplineAgentCode: e.target.value.toUpperCase() });
                          }}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        {isSearchingUpline && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                            Mencari...
                          </div>
                        )}

                        {/* Autocomplete Dropdown */}
                        {isUplineDropdownOpen && uplineSearchResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {uplineSearchResults.map((up) => (
                              <div
                                key={up.id}
                                onClick={() => {
                                  setSelectedUplineObj(up);
                                  setFormData({ ...formData, uplineAgentCode: up.agentCode });
                                  setIsUplineDropdownOpen(false);
                                }}
                                className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-between text-xs transition"
                              >
                                <div>
                                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                                    {up.agentCode}
                                  </span>{' '}
                                  - <span className="font-semibold text-slate-800 dark:text-slate-200">{up.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {up.peringkat || 'AGENT'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {formMode === 'EDIT' && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>
                          Perhatian: Mengubah upline akan otomatis menghitung ulang jalur hirarki (materialized path) seluruh downline di bawahnya.
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 5: Kontak Email & Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@agen.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{formMode === 'CREATE' ? 'Simpan Agen' : 'Perbarui Agen'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DETAIL & DOWNLINE INSPECTOR ───────────────────────────────── */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Inspeksi Profil & Silsilah Agen
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rincian silsilah upline ke atas, jalur materialized path, dan daftar downline langsung.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail || !detailData ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span>Memuat detail profil agen...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header Profil */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100/80 dark:border-blue-900/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-xs">
                        {detailData.agentCode}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{detailData.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1">
                      <span>Peringkat: <strong>{detailData.peringkat || 'Partner'}</strong></span>
                      <span>•</span>
                      <span>Profile ID: <strong className="font-mono">{detailData.profId || '-'}</strong></span>
                      <span>•</span>
                      <span>Cabang: <strong>{detailData.branch?.name || detailData.rawBranchName || '-'}</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    {renderStatusKeagenanBadge(detailData.statusKeagenan)}
                  </div>
                </div>

                {/* Silsilah Jalur Upline (Ancestor Chain) */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <GitFork className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Jalur Hirarki Keagenan (Materialized Path)</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {detailData.ancestorCodes.length === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-mono font-bold">
                        ROOT LEADER (Level 0)
                      </span>
                    ) : (
                      <>
                        {detailData.ancestorCodes.map((code, idx) => (
                          <span key={idx} className="flex items-center gap-1 font-mono">
                            <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                              {code}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          </span>
                        ))}
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold">
                          {detailData.agentCode} (Level {detailData.depth})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Ringkasan Portofolio Pribadi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Portofolio Produksi Polis
                    </p>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {detailData.productionSummary.totalPolicies} Polis
                    </p>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {formatIDR(detailData.productionSummary.totalPremi)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Riwayat Beban Klaim
                    </p>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {detailData.claimSummary.totalClaims} Kasus Klaim
                    </p>
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {formatIDR(detailData.claimSummary.totalClaimAmount)}
                    </p>
                  </div>
                </div>

                {/* Daftar Downline Langsung */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Downline Langsung (Tingkat 1)</span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Total: {detailData.directDownlines.length} Agen
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {detailData.directDownlines.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                        Belum memiliki bawahan / downline langsung.
                      </div>
                    ) : (
                      detailData.directDownlines.map((dl) => (
                        <div key={dl.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div>
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{dl.agentCode}</span>{' '}
                            - <span className="font-semibold text-slate-800 dark:text-slate-200">{dl.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{dl.peringkat || 'Partner'}</span>
                            {renderStatusKeagenanBadge(dl.statusKeagenan)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: KONFIRMASI NONAKTIFKAN AGEN ──────────────────────────────── */}
      {isDeactivateModalOpen && agentToDeactivate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Nonaktifkan Agen?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini akan mengubah status keagenan menjadi nonaktif.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div>
                Kode Agen: <strong className="text-slate-900 dark:text-slate-100">{agentToDeactivate.agentCode}</strong>
              </div>
              <div>
                Nama Agen: <strong className="text-slate-900 dark:text-slate-100">{agentToDeactivate.name}</strong>
              </div>
              <div>
                Cabang: <strong className="text-slate-900 dark:text-slate-100">{agentToDeactivate.branchName || agentToDeactivate.rawBranchName || '-'}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Catatan: Status keagenan akan diubah menjadi <strong>Non Aktif</strong>. Data agen tetap berada di direktori master, seluruh riwayat polis/klaim tetap tersimpan utuh, dan agen dapat diaktifkan kembali kapan saja.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeactivateModalOpen(false);
                  setAgentToDeactivate(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RINCIAN PENDING UPLINE ──────────────────────────────────── */}
      {isPendingUplineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Daftar Agen Berstatus Pending Upline</span>
                    <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[11px] font-extrabold rounded-full">
                      {pendingUplineAgentsList.length} Agen
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Agen berikut memiliki kode upline yang belum terdaftar di master data. Sistem self-healing akan otomatis menghubungkan saat data upline diimpor.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPendingUplineModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {isLoadingPendingUplineList ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                  <p className="font-semibold text-sm">Mengambil daftar agen pending upline...</p>
                </div>
              ) : pendingUplineAgentsList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Tidak ada agen berstatus Pending Upline!</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Seluruh hierarki agen telah terhubung sempurna.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Kode Agen</th>
                        <th className="py-2.5 px-3">Nama Agen</th>
                        <th className="py-2.5 px-3">Peringkat</th>
                        <th className="py-2.5 px-3">Cabang</th>
                        <th className="py-2.5 px-3">Kode Upline Dicari</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pendingUplineAgentsList.map((ag, idx) => (
                        <tr key={ag.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition">
                          <td className="py-2.5 px-3 text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {ag.agentCode}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {ag.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                              {ag.peringkat}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            {ag.branchName || ag.rawBranchName || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-mono font-bold text-[11px] border border-purple-200 dark:border-purple-800">
                              <AlertCircle className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              {ag.uplineAgentCode || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsPendingUplineModalOpen(false);
                                  handleOpenEditModal(ag);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-[10px] transition cursor-pointer"
                                title="Edit / Hubungkan Upline"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setUplineStatusFilter('PENDING_UPLINE');
                  setPage(1);
                  setIsPendingUplineModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/60 hover:bg-purple-200/70 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Terapkan Filter di Tabel Utama</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPendingUplineModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
