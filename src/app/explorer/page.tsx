'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  X,
  FileText,
  ShieldAlert,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Layers,
  CheckCircle2,
  Car,
  Clock,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  Info,
  UserCheck,
  Check,
} from 'lucide-react';
import { useAppBranding } from '@/context/branding-context';

export default function ExplorerPage() {
  const { branding } = useAppBranding();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'POLICIES' | 'CLAIMS'>('POLICIES');

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPolicyCategory, setSelectedPolicyCategory] = useState<'ALL' | 'MM' | 'NON_MM'>('ALL');
  const [selectedUwYear, setSelectedUwYear] = useState('ALL');
  const [selectedClaimCategory, setSelectedClaimCategory] = useState<'ALL' | 'MM' | 'NON_MM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortField, setSortField] = useState('period');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Data states
  const [policiesData, setPoliciesData] = useState<{
    items: any[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
    summary: {
      totalItems: number;
      totalPremi: number;
      totalPremiMm?: number;
      totalPremiNonMm?: number;
      totalTsi: number;
    };
  } | null>(null);

  const [claimsData, setClaimsData] = useState<{
    items: any[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
    summary: {
      totalItems: number;
      totalGrossClaim: number;
      totalGrossClaimMm?: number;
      totalGrossClaimNonMm?: number;
      totalIndemnity: number;
    };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Metadata dropdowns
  const [branches, setBranches] = useState<{ id: string; code: string; name: string }[]>([]);
  const [policyProducts, setPolicyProducts] = useState<string[]>([]);
  const [policyStatuses, setPolicyStatuses] = useState<string[]>([]);
  const [claimProducts, setClaimProducts] = useState<string[]>([]);
  const [claimUwYears, setClaimUwYears] = useState<string[]>([]);

  // User Session & Reassignment states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<{
    type: 'POLICY' | 'CLAIM';
    id: string;
    number: string;
    currentAgentCode?: string;
    currentAgentName?: string;
    currentBranchName?: string;
  } | null>(null);
  const [reassignSearchQuery, setReassignSearchQuery] = useState('');
  const [reassignSearchResults, setReassignSearchResults] = useState<any[]>([]);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  const [selectedTargetAgent, setSelectedTargetAgent] = useState<any | null>(null);
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const canReassign = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';

  // Detail Modal states
  const [selectedPolicyDetail, setSelectedPolicyDetail] = useState<any | null>(null);
  const [relatedClaims, setRelatedClaims] = useState<any[]>([]);
  const [selectedClaimDetail, setSelectedClaimDetail] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1); // Reset page on search
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Search agents for reassignment
  useEffect(() => {
    if (!reassignSearchQuery || reassignSearchQuery.trim().length < 1) {
      setReassignSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingAgent(true);
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(reassignSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setReassignSearchResults(data.agents || []);
        }
      } catch (err) {
        console.error('Failed to search agent:', err);
      } finally {
        setIsSearchingAgent(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [reassignSearchQuery]);

  // Load branches, metadata & user session
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [branchRes, policyMetaRes, claimMetaRes, meRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/explorer/policies?metaOnly=true'),
          fetch('/api/explorer/claims?metaOnly=true'),
          fetch('/api/auth/me'),
        ]);

        if (branchRes.ok) {
          const bData = await branchRes.json();
          if (bData.branches) setBranches(bData.branches);
        }

        if (policyMetaRes.ok) {
          const pData = await policyMetaRes.json();
          if (pData.products) setPolicyProducts(pData.products);
          if (pData.statuses) setPolicyStatuses(pData.statuses);
        }

        if (claimMetaRes.ok) {
          const cData = await claimMetaRes.json();
          if (cData.products) setClaimProducts(cData.products);
          if (cData.uwYears) setClaimUwYears(cData.uwYears);
        }

        if (meRes.ok) {
          const mData = await meRes.json();
          if (mData.user) setCurrentUser(mData.user);
        }
      } catch (err) {
        console.error('Failed to load explorer metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch Policies Data
  const fetchPolicies = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortField,
        sortOrder,
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (selectedProduct !== 'ALL') params.set('product', selectedProduct);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedPolicyCategory !== 'ALL') params.set('category', selectedPolicyCategory);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/explorer/policies?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memuat data polis');
      }

      const data = await res.json();
      setPoliciesData(data);
    } catch (err: any) {
      console.error('Error fetching policies:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mengambil data polis');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, sortField, sortOrder, debouncedSearch, selectedBranchId, selectedProduct, selectedStatus, selectedPolicyCategory, startDate, endDate]);

  // Fetch Claims Data
  const fetchClaims = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortField: sortField === 'period' ? 'dateOfSettlement' : sortField,
        sortOrder,
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (selectedProduct !== 'ALL') params.set('product', selectedProduct);
      if (selectedUwYear !== 'ALL') params.set('uwYear', selectedUwYear);
      if (selectedClaimCategory !== 'ALL') params.set('category', selectedClaimCategory);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/explorer/claims?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memuat data klaim');
      }

      const data = await res.json();
      setClaimsData(data);
    } catch (err: any) {
      console.error('Error fetching claims:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mengambil data klaim');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, sortField, sortOrder, debouncedSearch, selectedBranchId, selectedProduct, selectedUwYear, selectedClaimCategory, startDate, endDate]);

  // Trigger fetch on tab or dependency change
  useEffect(() => {
    if (activeTab === 'POLICIES') {
      fetchPolicies();
    } else {
      fetchClaims();
    }
  }, [activeTab, fetchPolicies, fetchClaims]);

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedBranchId('ALL');
    setSelectedProduct('ALL');
    setSelectedStatus('ALL');
    setSelectedPolicyCategory('ALL');
    setSelectedUwYear('ALL');
    setSelectedClaimCategory('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Open Policy Detail Modal
  const handleOpenPolicyDetail = async (policyId: string) => {
    try {
      setIsDetailLoading(true);
      setIsDetailModalOpen(true);
      setSelectedClaimDetail(null);

      const res = await fetch(`/api/explorer/policies/${policyId}`);
      if (!res.ok) {
        throw new Error('Gagal memuat rincian polis');
      }
      const data = await res.json();
      setSelectedPolicyDetail(data.policy);
      setRelatedClaims(data.relatedClaims || []);
    } catch (err: any) {
      console.error('Error loading policy detail:', err);
      alert(err.message || 'Gagal membuka rincian polis');
      setIsDetailModalOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Open Claim Detail Modal
  const handleOpenClaimDetail = (claim: any) => {
    setSelectedPolicyDetail(null);
    setRelatedClaims([]);
    setSelectedClaimDetail(claim);
    setIsDetailModalOpen(true);
  };

  // Open Reassign Modal
  const handleOpenReassignModal = (
    type: 'POLICY' | 'CLAIM',
    item: any
  ) => {
    setReassignTarget({
      type,
      id: item.id,
      number: type === 'POLICY' ? item.policyNo : item.claimNo,
      currentAgentCode: item.sourceAgentId || item.agentRealCode,
      currentAgentName: item.agentName || item.agentRealName || item.sourceAgentId,
      currentBranchName: item.branchName || item.rawBranch,
    });
    setSelectedTargetAgent(null);
    setReassignSearchQuery('');
    setReassignSearchResults([]);
    setIsReassignModalOpen(true);
  };

  // Submit Reassign
  const handleExecuteReassign = async () => {
    if (!reassignTarget || !selectedTargetAgent) return;
    try {
      setIsSubmittingReassign(true);
      const endpoint = reassignTarget.type === 'POLICY'
        ? `/api/explorer/policies/${reassignTarget.id}`
        : `/api/explorer/claims/${reassignTarget.id}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAgentId: selectedTargetAgent.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengalihkan agen');
      }

      setActionSuccessMessage(data.message || 'Agen berhasil dialihkan.');
      setIsReassignModalOpen(false);

      // Refresh opened modal if matches
      if (selectedPolicyDetail && selectedPolicyDetail.id === reassignTarget.id) {
        handleOpenPolicyDetail(reassignTarget.id);
      }
      if (selectedClaimDetail && selectedClaimDetail.id === reassignTarget.id) {
        setSelectedClaimDetail((prev: any) => ({
          ...prev,
          sourceAgentId: selectedTargetAgent.agentCode,
          agentRealName: selectedTargetAgent.name,
          agentRealCode: selectedTargetAgent.agentCode,
          branchName: selectedTargetAgent.rawBranchName,
        }));
      }

      // Refresh list table
      if (activeTab === 'POLICIES') {
        fetchPolicies();
      } else {
        fetchClaims();
      }

      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat mengalihkan agen');
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  // Handle Export to Excel
  const handleExportXlsx = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        type: activeTab === 'POLICIES' ? 'policies' : 'claims',
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (selectedProduct !== 'ALL') params.set('product', selectedProduct);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      if (activeTab === 'POLICIES') {
        if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
        if (selectedPolicyCategory !== 'ALL') params.set('category', selectedPolicyCategory);
      }
      if (activeTab === 'CLAIMS') {
        if (selectedUwYear !== 'ALL') params.set('uwYear', selectedUwYear);
        if (selectedClaimCategory !== 'ALL') params.set('category', selectedClaimCategory);
      }

      window.open(`/api/explorer/export/xlsx?${params.toString()}`, '_blank');
    } catch (err: any) {
      alert('Gagal mengekspor file Excel: ' + err.message);
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  };

  // Format IDR Currency
  const formatIdr = (val: number | string | undefined | null) => {
    const num = typeof val === 'string' ? parseFloat(val) : val || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0b0f19] pb-16">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  <Layers className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Eksplorasi Detail Polis & Klaim
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-850">
                  Data Individual
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Pencarian baris transaksi riil hasil ingestion Excel, termasuk 15 kolom dinamis objek pertanggungan (*JSONB*) dan riwayat klaim terkait.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-center">
              <button
                type="button"
                onClick={handleExportXlsx}
                disabled={isExporting || isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExporting ? 'Menyiapkan Excel...' : 'Ekspor Excel (.xlsx)'}</span>
              </button>

              <button
                type="button"
                onClick={() => (activeTab === 'POLICIES' ? fetchPolicies() : fetchClaims())}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition disabled:opacity-50"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Navigation Tab Switcher */}
          <div className="flex items-center gap-3 mt-6 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('POLICIES');
                setPage(1);
                setSortField('period');
              }}
              className={`flex items-center gap-2.5 pb-3 px-2 border-b-2 font-bold text-sm transition cursor-pointer ${
                activeTab === 'POLICIES'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Daftar Polis Asuransi</span>
              {policiesData && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {policiesData.summary.totalItems.toLocaleString('id-ID')}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('CLAIMS');
                setPage(1);
                setSortField('dateOfSettlement');
              }}
              className={`flex items-center gap-2.5 pb-3 px-2 border-b-2 font-bold text-sm transition cursor-pointer ${
                activeTab === 'CLAIMS'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Daftar Klaim Asuransi</span>
              {claimsData && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {claimsData.summary.totalItems.toLocaleString('id-ID')}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        {activeTab === 'POLICIES' && policiesData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Polis Terfilter</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {policiesData.summary.totalItems.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Premi Bruto</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                  {formatIdr(policiesData.summary.totalPremi)}
                </h3>
                {policiesData.summary.totalPremiMm !== undefined && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">MM: {formatIdr(policiesData.summary.totalPremiMm)}</span>
                    <span className="mx-1">•</span>
                    <span className="text-slate-500 dark:text-slate-400">Non-MM: {formatIdr(policiesData.summary.totalPremiNonMm || 0)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total TSI (IDR)</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {formatIdr(policiesData.summary.totalTsi)}
                </h3>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CLAIMS' && claimsData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Klaim Terfilter</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {claimsData.summary.totalItems.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Gross Claim</p>
                <h3 className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5 truncate">
                  {formatIdr(claimsData.summary.totalGrossClaim)}
                </h3>
                {claimsData.summary.totalGrossClaimMm !== undefined && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">MM: {formatIdr(claimsData.summary.totalGrossClaimMm)}</span>
                    <span className="mx-1">•</span>
                    <span className="text-slate-500 dark:text-slate-400">Non-MM: {formatIdr(claimsData.summary.totalGrossClaimNonMm || 0)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'POLICIES'
                    ? 'Cari No. Polis, Nama Tertanggung, Kode Agen, Nama Agen, atau No. SPAU...'
                    : 'Cari No. Klaim, No. Polis Terkait, Sebab Klaim, atau Nama Produk...'
                }
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Dropdown: Cabang */}
            <div className="w-full md:w-56">
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
              >
                <option value="ALL">Semua Cabang (Nasional)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                showAdvancedFilters
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter Lengkap</span>
              {(selectedProduct !== 'ALL' ||
                selectedStatus !== 'ALL' ||
                selectedUwYear !== 'ALL' ||
                (activeTab === 'POLICIES' && selectedPolicyCategory !== 'ALL') ||
                (activeTab === 'CLAIMS' && selectedClaimCategory !== 'ALL') ||
                startDate ||
                endDate) && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
          </div>

          {/* Advanced Filter Collapse Box */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-in fade-in duration-200">
              {/* Product Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Nama Produk
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                >
                  <option value="ALL">Semua Produk</option>
                  {(activeTab === 'POLICIES' ? policyProducts : claimProducts).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter (Policies) OR UW Year Filter (Claims) */}
              {activeTab === 'POLICIES' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Status Polis
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setPage(1);
                      }}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    >
                      <option value="ALL">Semua Status</option>
                      {policyStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Kategori Polis
                    </label>
                    <select
                      value={selectedPolicyCategory}
                      onChange={(e) => {
                        setSelectedPolicyCategory(e.target.value as any);
                        setPage(1);
                      }}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    >
                      <option value="ALL">Semua (MM & Non-MM)</option>
                      <option value="MM">Polis MM (Lengkap)</option>
                      <option value="NON_MM">Polis Non-MM (Tanpa Agen)</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Underwriting Year (UW)
                    </label>
                    <select
                      value={selectedUwYear}
                      onChange={(e) => {
                        setSelectedUwYear(e.target.value);
                        setPage(1);
                      }}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    >
                      <option value="ALL">Semua UW Year</option>
                      {claimUwYears.map((y) => (
                        <option key={y} value={y}>
                          Tahun {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Kategori Klaim
                    </label>
                    <select
                      value={selectedClaimCategory}
                      onChange={(e) => {
                        setSelectedClaimCategory(e.target.value as any);
                        setPage(1);
                      }}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                    >
                      <option value="ALL">Semua (MM & Non-MM)</option>
                      <option value="MM">Klaim MM (Lengkap)</option>
                      <option value="NON_MM">Klaim Non-MM (Tanpa Agen)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {activeTab === 'POLICIES' ? 'Mulai Polis Dari' : 'Settlement Klaim Dari'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Sampai Dengan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 transition shrink-0"
                    title="Reset Filter"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Alert */}
        {actionSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="font-semibold">{actionSuccessMessage}</p>
            </div>
            <button
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="flex-1 font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Main Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {activeTab === 'POLICIES' ? (
            /* TAB POLIS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">No. Polis & SPAU</th>
                    <th className="py-3.5 px-4">Masa Berlaku</th>
                    <th className="py-3.5 px-4">Nama Tertanggung</th>
                    <th className="py-3.5 px-4">Produk & Coverage</th>
                    <th className="py-3.5 px-4">Agen & Cabang</th>
                    <th className="py-3.5 px-4 text-right">Premi Bruto (IDR)</th>
                    <th className="py-3.5 px-4 text-right">TSI (IDR)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Memuat data polis dari database...</span>
                      </td>
                    </tr>
                  ) : !policiesData || policiesData.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada data polis ditemukan</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Coba sesuaikan kata kunci pencarian atau ubah filter cabang Anda.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    policiesData.items.map((row) => {
                      const isNew = row.policyStatus?.toLowerCase() === 'new';
                      const isEndorse = row.policyStatus?.toLowerCase().includes('endorse');
                      return (
                        <tr key={row.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 font-mono">
                            <div className="flex items-center gap-1.5 mb-1">
                              {row.isMm ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  Polis MM
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                  Non-MM
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[170px]" title={row.policyNo}>
                              {row.policyNo}
                            </span>
                            {row.spauNo && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate max-w-[170px]">
                                SPAU: {row.spauNo}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <span className="block font-medium text-slate-800 dark:text-slate-200">{row.startPeriod || '-'}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">s/d {row.endPeriod || '-'}</span>
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            <span className="truncate block max-w-[180px]" title={row.insuredName || '-'}>
                              {row.insuredName || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[160px]" title={row.product}>
                              {row.product || '-'}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[160px]" title={row.coverage}>
                              {row.coverage || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {row.isMm ? (
                              <>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[160px]">
                                  {row.agentName || row.agentRealName || row.sourceAgentId}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[160px]">
                                  {row.branchName || row.rawBranch || 'Cabang -'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium text-slate-400 dark:text-slate-500 italic block truncate max-w-[160px]">
                                  Non-MM (Tanpa Agen)
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[160px]">
                                  {row.branchName || row.rawBranch || 'Cabang -'}
                                </span>
                              </>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            {formatIdr(row.nilaiPremi)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatIdr(row.tsiInIdr || row.tsi)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                isNew
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : isEndorse
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {row.policyStatus || 'Aktif'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPolicyDetail(row.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[11px] font-bold transition cursor-pointer"
                                title="Lihat Detail Polis & Objek"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                              {canReassign && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReassignModal('POLICY', row)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[11px] font-bold transition cursor-pointer"
                                  title="Alihkan Agen Polis Ini"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">Alihkan</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* TAB KLAIM TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">No. Klaim & No. Polis</th>
                    <th className="py-3.5 px-4">Tgl Settlement</th>
                    <th className="py-3.5 px-4">UW Year</th>
                    <th className="py-3.5 px-4">Sebab Klaim (Cause of Loss)</th>
                    <th className="py-3.5 px-4">Produk</th>
                    <th className="py-3.5 px-4">Agen & Cabang</th>
                    <th className="py-3.5 px-4 text-right">Gross Claim (IDR)</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                        <span>Memuat data klaim dari database...</span>
                      </td>
                    </tr>
                  ) : !claimsData || claimsData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada data klaim ditemukan</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Coba sesuaikan kata kunci pencarian atau ganti filter underwriting year.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    claimsData.items.map((row) => (
                      <tr key={row.id} className="hover:bg-rose-50/30 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5 mb-1">
                            {row.isMm ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Klaim MM
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                Non-MM
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[170px]" title={row.claimNo}>
                            {row.claimNo}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[170px]" title={row.policyNo}>
                            Polis: {row.policyNo}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {row.dateOfSettlement || '-'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {row.uwYear || '-'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate max-w-[180px]" title={row.causeOfLoss}>
                            {row.causeOfLoss || '-'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-800 dark:text-slate-200 block truncate max-w-[150px]" title={row.namaProduk}>
                            {row.namaProduk && row.namaProduk !== '[object Object]' ? row.namaProduk : '-'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {row.isMm ? (
                            <>
                              <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[160px]">
                                {row.agentRealName || row.sourceAgentId || '-'}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[160px]">
                                {row.branchName || row.rawBranch || 'Cabang -'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-slate-400 dark:text-slate-500 italic block truncate max-w-[160px]">
                                Non-MM (Tanpa Agen)
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[160px]">
                                {row.branchName || row.rawBranch || 'Cabang -'}
                              </span>
                            </>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                          {formatIdr(row.grossClaim)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenClaimDetail(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-[11px] font-bold transition cursor-pointer"
                              title="Lihat Detail Klaim"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                            {canReassign && (
                              <button
                                type="button"
                                onClick={() => handleOpenReassignModal('CLAIM', row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[11px] font-bold transition cursor-pointer"
                                title="Alihkan Agen Klaim Ini"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Alihkan</span>
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
          )}

          {/* Pagination Controls */}
          <div className="bg-slate-50/80 dark:bg-slate-950/80 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span>Baris per halaman:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span>
                Halaman <strong className="text-slate-800 dark:text-slate-200">{page}</strong> dari{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {activeTab === 'POLICIES'
                    ? policiesData?.pagination.totalPages || 1
                    : claimsData?.pagination.totalPages || 1}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                {page}
              </span>

              <button
                type="button"
                onClick={() => {
                  const maxPage =
                    activeTab === 'POLICIES'
                      ? policiesData?.pagination.totalPages || 1
                      : claimsData?.pagination.totalPages || 1;
                  setPage((prev) => Math.min(maxPage, prev + 1));
                }}
                disabled={
                  isLoading ||
                  page >=
                    (activeTab === 'POLICIES'
                      ? policiesData?.pagination.totalPages || 1
                      : claimsData?.pagination.totalPages || 1)
                }
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DETAIL MODAL / DRAWER ──────────────────────────────────────────────── */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <span
                  className={`p-2.5 rounded-xl ${
                    selectedPolicyDetail
                      ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {selectedPolicyDetail ? <FileText className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                      {selectedPolicyDetail ? selectedPolicyDetail.policyNo : selectedClaimDetail?.claimNo}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        selectedPolicyDetail
                          ? selectedPolicyDetail.isMm
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : selectedClaimDetail?.isMm
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selectedPolicyDetail
                        ? selectedPolicyDetail.isMm
                          ? 'DETAIL POLIS ASURANSI (MM)'
                          : 'DETAIL POLIS ASURANSI (NON-MM)'
                        : selectedClaimDetail?.isMm
                        ? 'DETAIL KLAIM ASURANSI (MM)'
                        : 'DETAIL KLAIM ASURANSI (NON-MM)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedPolicyDetail
                      ? `Tertanggung: ${selectedPolicyDetail.insuredName || '-'}`
                      : `Polis Terkait: ${selectedClaimDetail?.policyNo || '-'}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isDetailLoading ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold text-sm">Mengambil detail lengkap dari server...</p>
                </div>
              ) : selectedPolicyDetail ? (
                /* DETAIL POLIS CONTENT */
                <>
                  {/* 1. Header Information Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Status Polis</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {selectedPolicyDetail.policyStatus || 'Aktif'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">SPAU No</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {selectedPolicyDetail.spauNo || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Masa Pertanggungan</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {selectedPolicyDetail.startPeriod || '-'}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">s/d {selectedPolicyDetail.endPeriod || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Bulan / Periode</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {selectedPolicyDetail.bulan} ({selectedPolicyDetail.period})
                      </span>
                    </div>
                  </div>

                  {/* 2. Rincian Finansial Card */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Rincian Finansial & Nilai Pertanggungan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">Nilai Premi Bruto</span>
                        <span className="text-base font-black text-emerald-800 dark:text-emerald-300 font-mono mt-0.5 block">
                          {formatIdr(selectedPolicyDetail.nilaiPremi)}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Sum Insured (TSI IDR)</span>
                        <span className="text-base font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                          {formatIdr(selectedPolicyDetail.tsiInIdr || selectedPolicyDetail.tsi)}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Nilai Komisi Agensi</span>
                        <span className="text-base font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5 block">
                          {formatIdr(selectedPolicyDetail.nilaiKomisi)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Dinamis: Objek Pertanggungan (JSONB Object Information 1 - 15) */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-gradient-to-br from-white dark:from-slate-900 to-slate-50/80 dark:to-slate-950/60">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Rincian Objek Pertanggungan (Object Information 1 s/d 15)
                      </h4>
                      <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        PostgreSQL JSONB Engine
                      </span>
                    </div>

                    {selectedPolicyDetail.objectDetails &&
                    Object.keys(selectedPolicyDetail.objectDetails).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        {Object.entries(selectedPolicyDetail.objectDetails).map(([key, val]) => {
                          const formattedKey = key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (char) => char.toUpperCase());
                          return (
                            <div
                              key={key}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-blue-300 dark:hover:border-blue-600 transition"
                            >
                              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 block truncate">
                                {formattedKey}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                                {String(val || '-')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                        Tidak ada metadata rincian objek tersimpan untuk polis ini.
                      </p>
                    )}
                  </div>

                  {/* 4. Profil Agen & Cabang Penanggung */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Profil Agen & Kantor Cabang
                      </h4>
                      {canReassign && (
                        <button
                          type="button"
                          onClick={() => handleOpenReassignModal('POLICY', selectedPolicyDetail)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Alihkan Agen</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Nama Agen:</span>
                          <strong className="text-slate-900 dark:text-slate-100">
                            {selectedPolicyDetail.isMm
                              ? (selectedPolicyDetail.agentName || selectedPolicyDetail.agentRealName || '-')
                              : 'Non-MM (Tanpa Agen)'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Kode Agen:</span>
                          <strong className="font-mono text-purple-700 dark:text-purple-400">
                            {selectedPolicyDetail.isMm
                              ? (selectedPolicyDetail.sourceAgentId || selectedPolicyDetail.agentRealCode || '-')
                              : 'NON-MM'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Peringkat:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {selectedPolicyDetail.isMm
                              ? (selectedPolicyDetail.agentPeringkat || 'Agent')
                              : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Cabang Resmi:</span>
                          <strong className="text-slate-900 dark:text-slate-100">
                            {selectedPolicyDetail.branchName || selectedPolicyDetail.rawBranch || '-'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Representative:</span>
                          <span className="text-slate-700 dark:text-slate-300">{selectedPolicyDetail.representative || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Hierarchy Path:</span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                            {selectedPolicyDetail.agentMaterializedPath || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Riwayat Klaim Terkait pada Polis Ini */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        Riwayat Klaim Terkait Polis Ini ({relatedClaims.length})
                      </h4>
                      {relatedClaims.length > 0 && (
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                          Polis Pernah Klaim
                        </span>
                      )}
                    </div>

                    {relatedClaims.length > 0 ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        {relatedClaims.map((claim) => (
                          <div key={claim.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{claim.claimNo}</span>
                                {claim.isMm ? (
                                  <span className="text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded">
                                    Klaim MM
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-1.5 py-0.2 rounded">
                                    Non-MM
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                  Settled: {claim.dateOfSettlement || '-'}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">Sebab: {claim.causeOfLoss || '-'}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-rose-700 dark:text-rose-400 block">
                                {formatIdr(claim.grossClaim)}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                Indemnity: {formatIdr(claim.indemnity)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Polis ini bersih tanpa riwayat klaim terdaftar (Loss Ratio: 0%).</span>
                      </div>
                    )}
                  </div>
                </>
              ) : selectedClaimDetail ? (
                /* DETAIL KLAIM CONTENT */
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">No. Klaim</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 block truncate">
                        {selectedClaimDetail.claimNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">No. Polis Terkait</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
                        {selectedClaimDetail.policyNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Tgl Settlement</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {selectedClaimDetail.dateOfSettlement || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Underwriting Year</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                        Tahun {selectedClaimDetail.uwYear || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      Rincian Finansial Klaim
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-rose-50/60 dark:bg-rose-950/40 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/50">
                        <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block">Gross Claim (Beban Klaim)</span>
                        <span className="text-lg font-black text-rose-800 dark:text-rose-300 font-mono mt-0.5 block">
                          {formatIdr(selectedClaimDetail.grossClaim)}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">Indemnity Paid</span>
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                          {formatIdr(selectedClaimDetail.indemnity)}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">Deductible Applied</span>
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                          {formatIdr(selectedClaimDetail.deductible)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cause of Loss */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                      Penyebab Kerugian (Cause of Loss)
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {selectedClaimDetail.causeOfLoss || 'Tidak disebutkan'}
                    </p>
                  </div>

                  {/* Agent & Branch */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                        Agen & Cabang Pelapor
                      </span>
                      {canReassign && (
                        <button
                          type="button"
                          onClick={() => handleOpenReassignModal('CLAIM', selectedClaimDetail)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Alihkan Agen</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Agen: </span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {selectedClaimDetail.isMm
                            ? (selectedClaimDetail.agentRealName || selectedClaimDetail.sourceAgentId || '-')
                            : 'Non-MM (Tanpa Kode Agen)'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Cabang: </span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {selectedClaimDetail.branchName || selectedClaimDetail.rawBranch || '-'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ALIH KAN AGEN ──────────────────────────────────────────────── */}
      {isReassignModalOpen && reassignTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Alihkan Agen {reassignTarget.type === 'POLICY' ? 'Polis' : 'Klaim'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {reassignTarget.type === 'POLICY' ? 'Nomor Polis: ' : 'Nomor Klaim: '}
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{reassignTarget.number}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Info Agen Saat Ini */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Agen Saat Ini (Terdaftar)
                </span>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {reassignTarget.currentAgentName || 'Tanpa Nama'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cabang: {reassignTarget.currentBranchName || '-'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-mono font-bold text-xs">
                    {reassignTarget.currentAgentCode || '-'}
                  </span>
                </div>
              </div>

              {/* Cari Agen Baru */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cari & Pilih Agen Pengganti (Target) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reassignSearchQuery}
                    onChange={(e) => setReassignSearchQuery(e.target.value)}
                    placeholder="Ketik Kode Agen atau Nama Agen..."
                    className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                    autoFocus
                  />
                  {isSearchingAgent && (
                    <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                  {reassignSearchQuery && !isSearchingAgent && (
                    <button
                      type="button"
                      onClick={() => {
                        setReassignSearchQuery('');
                        setReassignSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown List */}
                {reassignSearchResults.length > 0 && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-lg">
                    {reassignSearchResults.map((agent: any) => {
                      const isSelected = selectedTargetAgent?.id === agent.id;
                      return (
                        <div
                          key={agent.id}
                          onClick={() => {
                            setSelectedTargetAgent(agent);
                            setReassignSearchResults([]);
                            setReassignSearchQuery(`${agent.agentCode} - ${agent.name}`);
                          }}
                          className={`p-3 text-xs flex items-center justify-between hover:bg-purple-50/60 dark:hover:bg-purple-950/40 cursor-pointer transition ${
                            isSelected ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/60 px-1.5 py-0.5 rounded text-[10px]">
                                {agent.agentCode}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{agent.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {agent.peringkat || 'Agent'} &bull; {agent.rawBranchName || 'Semua Cabang'}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                        </div>
                      );
                    })}
                  </div>
                )}
                {reassignSearchQuery && !isSearchingAgent && reassignSearchResults.length === 0 && !selectedTargetAgent && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 italic">
                    Tidak ditemukan agen dengan kata kunci tersebut.
                  </p>
                )}
              </div>

              {/* Selected Target Preview */}
              {selectedTargetAgent && (
                <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                      Agen Target Terpilih
                    </span>
                    <p className="text-xs font-black text-purple-900 dark:text-purple-200 mt-0.5">
                      {selectedTargetAgent.name}
                    </p>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      Peringkat: {selectedTargetAgent.peringkat || 'Agent'} &bull; {selectedTargetAgent.rawBranchName || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-mono font-bold text-xs shadow-xs">
                      {selectedTargetAgent.agentCode}
                    </span>
                  </div>
                </div>
              )}

              {/* Notice */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Perubahan ini akan langsung memperbarui kepemilikan produksi/klaim, cabang terkait, serta tercatat secara permanen di riwayat <strong>Audit Log</strong> sistem.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                disabled={isSubmittingReassign}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReassign}
                disabled={!selectedTargetAgent || isSubmittingReassign}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmittingReassign ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Konfirmasi & Alihkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
