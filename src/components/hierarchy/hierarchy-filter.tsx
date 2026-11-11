'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Users,
  Building,
  ChevronDown,
  Check,
  AlertCircle,
  MapPin,
} from 'lucide-react';

export type HierarchyMode = 'SPECIFIC' | 'ALL_ROOT' | 'PROBLEMATIC';

interface HierarchyFilterProps {
  mode: HierarchyMode;
  agentCode: string;
  branch: string;
  userRole?: string;
  userBranchName?: string;
  onFilterApply: (params: { mode: HierarchyMode; agentCode: string; branch: string }) => void;
  onReset: () => void;
  isLoading: boolean;
  hasAppliedFilter: boolean;
  totalLoaded: number | null;
}

interface AgentSearchResult {
  id: string;
  agentCode: string;
  name: string;
  uplineAgentCode: string | null;
  uplineStatus: string;
  statusKeagenan?: string | null;
  peringkat: string | null;
  rawBranchName: string | null;
}

interface BranchItem {
  id: string;
  code: string;
  name: string;
  rawAlias: string | null;
}

export function HierarchyFilter({
  mode: initialMode,
  agentCode: initialAgentCode,
  branch: initialBranch,
  userRole,
  userBranchName,
  onFilterApply,
  onReset,
  isLoading,
  hasAppliedFilter,
  totalLoaded,
}: HierarchyFilterProps) {
  // Aturan Hak Akses:
  // - Dropdown Cabang hanya untuk SUPERADMIN, ADMIN, AUDIT
  // - Mode "Agen Bermasalah" hanya untuk SUPERADMIN, ADMIN, AUDIT
  const isSuperOrAdminOrAudit = !userRole || userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'AUDIT';
  const canSelectBranch = isSuperOrAdminOrAudit;
  const canViewProblematic = isSuperOrAdminOrAudit;

  // Jika role tidak berhak melihat PROBLEMATIC tetapi initialMode = PROBLEMATIC, fallback ke ALL_ROOT
  const safeInitialMode = !canViewProblematic && initialMode === 'PROBLEMATIC' ? 'ALL_ROOT' : initialMode;

  const [mode, setMode] = useState<HierarchyMode>(safeInitialMode);
  const [agentCode, setAgentCode] = useState(initialAgentCode);
  const [branch, setBranch] = useState(initialBranch || 'ALL');
  const [branchesList, setBranchesList] = useState<BranchItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialAgentCode);
  const [suggestions, setSuggestions] = useState<AgentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load branches list on mount
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/branches');
        const data = await res.json();
        if (data.branches) {
          setBranchesList(data.branches);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    }
    loadBranches();
  }, []);

  // Sync internal state when initial props change
  useEffect(() => {
    if (initialAgentCode !== undefined) {
      setAgentCode(initialAgentCode);
      setSearchQuery(initialAgentCode);
    }
  }, [initialAgentCode]);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialBranch !== undefined) {
      setBranch(initialBranch || 'ALL');
    }
  }, [initialBranch]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for agent autocomplete
  useEffect(() => {
    if (mode !== 'SPECIFIC' || !searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const branchParam = branch !== 'ALL' ? `&branch=${encodeURIComponent(branch)}` : '';
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(searchQuery.trim())}${branchParam}`);
        const data = await res.json();
        setSuggestions(data.agents || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, mode, branch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    setInputError(null);

    const branchToUse = branch === 'ALL' ? '' : branch;

    if (mode === 'SPECIFIC') {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) {
        if (branch && branch !== 'ALL') {
          // User memilih cabang tanpa mengetik kode agen spesifik: otomatis muat seluruh jaringan root di cabang ini
          onFilterApply({
            mode: 'ALL_ROOT',
            agentCode: '',
            branch: branch,
          });
          return;
        }
        setInputError('Silakan ketik kode atau nama agen terlebih dahulu.');
        inputRef.current?.focus();
        return;
      }

      // If user selected "CODE - Name", extract the CODE
      let codeToUse = agentCode.trim() || trimmedQuery;
      if (codeToUse.includes(' - ')) {
        codeToUse = codeToUse.split(' - ')[0].trim();
      }

      onFilterApply({
        mode: 'SPECIFIC',
        agentCode: codeToUse,
        branch: branchToUse,
      });
    } else {
      onFilterApply({
        mode,
        agentCode: '',
        branch: branchToUse,
      });
    }
  };

  const handleSelectSuggestion = (item: AgentSearchResult) => {
    setAgentCode(item.agentCode);
    setSearchQuery(`${item.agentCode} - ${item.name}`);
    setInputError(null);
    setShowDropdown(false);
  };

  const quickAgentCodes = [
    { code: 'DIR001', label: 'DIR001 (Ahmad Dahlan)' },
    { code: 'BM001', label: 'BM001 (Budi Santoso)' },
    { code: '871300', label: '871300 (Ekasurya - Kelapa Gading)' },
    { code: '440800', label: '440800 (Lim Irvan - Kelapa Gading)' },
  ];

  const quickBranches = [
    { name: 'ALL', label: 'Semua Cabang' },
    { name: 'Kelapa Gading', label: 'Kelapa Gading (81)' },
    { name: 'KPO', label: 'KPO (00)' },
    { name: 'Pusat', label: 'Pusat (88)' },
    { name: 'Bandung', label: 'Bandung (11)' },
    { name: 'Surabaya', label: 'Surabaya (31)' },
    { name: 'Tangerang', label: 'Tangerang (07)' },
    { name: 'Medan', label: 'Medan (41)' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Parameter & Filter Hirarki
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filter berdasarkan Cabang, Kode Agen, atau Status untuk memuat pohon hirarki secara responsif.
          </p>
        </div>

        {hasAppliedFilter && totalLoaded !== null && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Users className="w-3.5 h-3.5" />
            {totalLoaded} node dimuat
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Branch Selector Dropdown — Hanya untuk SUPERADMIN, ADMIN, AUDIT */}
        {canSelectBranch ? (
          <div className="bg-slate-50/70 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Pilih Cabang Agensi
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Downline lintas cabang di bawah root agen tetap disertakan lengkap
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <select
                  value={branch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBranch(val);
                    if (val !== 'ALL' && (!searchQuery.trim() || mode === 'SPECIFIC')) {
                      setMode('ALL_ROOT');
                    }
                  }}
                  className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="ALL">Semua Cabang (Nasional)</option>
                  {branchesList.map((b) => (
                    <option key={b.id} value={b.name}>
                      [{b.code}] {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Quick Branch Shortcut Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Shortcut Cabang:</span>
              {quickBranches.map((qb) => (
                <button
                  key={qb.name}
                  type="button"
                  onClick={() => {
                    setBranch(qb.name);
                    if (qb.name !== 'ALL' && (!searchQuery.trim() || mode === 'SPECIFIC')) {
                      setMode('ALL_ROOT');
                    }
                  }}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium transition cursor-pointer border ${
                    branch.toUpperCase() === qb.name.toUpperCase()
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  {qb.label}
                </button>
              ))}
            </div>
          </div>
        ) : (userRole === 'KACAB' || userRole === 'PIC_CABANG') ? (
          /* Badge Read-Only Cabang untuk KACAB & PIC_CABANG */
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                <Building className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Cabang Penugasan: {userBranchName || branch}
                </span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Data hirarki otomatis terisolasi khusus untuk jaringan cabang ini
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Mode Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Pilih Mode Tampilan Hirarki
          </label>
          <div className={`grid grid-cols-1 ${canViewProblematic ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2.5`}>
            <button
              type="button"
              onClick={() => {
                setMode('SPECIFIC');
                setInputError(null);
              }}
              className={`flex items-start gap-3 p-3 text-left rounded-lg border transition cursor-pointer ${
                mode === 'SPECIFIC'
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                  mode === 'SPECIFIC' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {mode === 'SPECIFIC' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Spesifik Kode / Nama Agen</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Visualisasikan pohon downline lengkap mulai dari satu agen tertentu.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('ALL_ROOT');
                setInputError(null);
              }}
              className={`flex items-start gap-3 p-3 text-left rounded-lg border transition cursor-pointer ${
                mode === 'ALL_ROOT'
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                  mode === 'ALL_ROOT' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {mode === 'ALL_ROOT' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {branch && branch !== 'ALL'
                    ? `Root Agensi Cabang (${branch})`
                    : 'Semua Root Agensi (Top 100)'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {branch && branch !== 'ALL'
                    ? 'Menampilkan seluruh jaringan agen root di cabang ini beserta downline lintas cabang.'
                    : 'Daftar agen pucuk / Director tanpa upline beserta total downlinenya.'}
                </p>
              </div>
            </button>

            {/* Mode Agen Bermasalah: Eksklusif SUPERADMIN, ADMIN, AUDIT */}
            {canViewProblematic && (
              <button
                type="button"
                onClick={() => {
                  setMode('PROBLEMATIC');
                  setInputError(null);
                }}
                className={`flex items-start gap-3 p-3 text-left rounded-lg border transition cursor-pointer ${
                  mode === 'PROBLEMATIC'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                    mode === 'PROBLEMATIC' ? 'border-amber-600 bg-amber-600' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {mode === 'PROBLEMATIC' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Agen Bermasalah (Pending/Unregistered)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tinjau agen dengan status PENDING_UPLINE atau UNREGISTERED_IN_MASTER.
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Input for SPECIFIC Mode */}
        {mode === 'SPECIFIC' && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Masukkan Kode atau Nama Agen <span className="text-rose-500">*</span>
            </label>
            <div className="relative" ref={searchContainerRef}>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik kode (mis. DIR001, 871300) atau nama agen..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setAgentCode(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  className={`w-full pl-9 pr-9 py-2.5 rounded-lg border text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 transition font-medium ${
                    inputError
                      ? 'border-rose-400 ring-rose-200 dark:border-rose-800 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {isSearching && (
                  <RefreshCw className="w-4 h-4 absolute right-3 top-3 text-blue-500 animate-spin" />
                )}
              </div>

              {inputError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {inputError}
                </p>
              )}

              {/* Suggestions Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 z-50 py-1">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            {item.agentCode}
                          </span>
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{item.peringkat || 'N/A'}</span>
                          <span>·</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Cabang: {item.rawBranchName || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.statusKeagenan && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              item.statusKeagenan.toUpperCase() === 'AKTIF'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : item.statusKeagenan.toUpperCase() === 'CUT'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {item.statusKeagenan}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.uplineStatus === 'PENDING_UPLINE'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : item.uplineStatus === 'UNREGISTERED_IN_MASTER'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {item.uplineStatus}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Agent Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Contoh Cepat:</span>
              {quickAgentCodes.map((q) => (
                <button
                  key={q.code}
                  type="button"
                  onClick={() => {
                    setAgentCode(q.code);
                    setSearchQuery(q.code);
                    setInputError(null);
                    setShowDropdown(false);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition cursor-pointer ${
                    agentCode === q.code || searchQuery === q.code
                      ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-sm shadow-sm transition cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Memuat Data Hirarki...
              </>
            ) : (
              <>
                <Filter className="w-4 h-4" />
                Terapkan Filter
              </>
            )}
          </button>

          {hasAppliedFilter && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition cursor-pointer"
            >
              Reset Tampilan
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
