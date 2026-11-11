'use client';

import { useState } from 'react';
import {
  Building2,
  Users,
  AlertOctagon,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  CornerDownRight,
  ShieldCheck,
  ShieldAlert,
  Target,
  Sparkles,
} from 'lucide-react';
import { LossRatioBadgeInfo } from '@/lib/analytics/loss-ratio';

export interface BranchItem {
  branchId: string;
  branchCode: string;
  branchName: string;
  premi: number;
  policyCount: number;
  claim: number;
  claimCount: number;
  lossRatio: number | null;
  lossRatioEval: LossRatioBadgeInfo;
}

export interface AgentItem {
  agentId: string;
  agentCode: string;
  agentName: string;
  uplineAgentCode?: string | null;
  uplineAgentName?: string | null;
  peringkat: string;
  branchName: string;
  premi: number;
  policyCount: number;
  claim: number;
  claimCount: number;
  lossRatio: number | null;
  lossRatioEval: LossRatioBadgeInfo;
  relativeDepth?: number;
  isLeader?: boolean;
  materializedPath?: string;
  hasActivity?: boolean;
  isAncestorOfActive?: boolean;
}

export interface AllAgentItem {
  agentId: string;
  agentCode: string;
  agentName: string;
  peringkat: string;
  branchName: string;
  premi: number;
  policyCount: number;
  claim: number;
  claimCount: number;
  lossRatio: number | null;
  lossRatioEval: LossRatioBadgeInfo;
}

export interface AllAgentsSummary {
  totalAgents: number;
  totalPremi: number;
  totalPolicies: number;
  totalClaim: number;
  totalClaimsCount: number;
  lossRatio: number | null;
  lossRatioEval: LossRatioBadgeInfo;
}

export interface CauseItem {
  cause: string;
  claim: number;
  claimCount: number;
  pctOfTotal: number;
  averagePerClaim: number;
}

export type AnalyticsTableTab =
  | 'branch'
  | 'agent'
  | 'cause'
  | 'allAgents'
  | 'targetPersonal'
  | 'targetGroup';

export interface AnalyticsTablesProps {
  branchPerformance: BranchItem[];
  agentPerformance: AgentItem[];
  topCausesOfLoss: CauseItem[];
  userRole?: string;
  personalPerformance?: AgentItem | null;
  allAgentsPerformance?: AllAgentItem[];
  allAgentsSummary?: AllAgentsSummary | null;
  targetAgentInfo?: { id: string; agentCode: string; name: string } | null;
  userBranchName?: string;
  activeTab?: AnalyticsTableTab;
  onTabChange?: (tab: AnalyticsTableTab) => void;
}

export function AnalyticsTables({
  branchPerformance,
  agentPerformance,
  topCausesOfLoss,
  userRole,
  personalPerformance,
  allAgentsPerformance = [],
  allAgentsSummary = null,
  targetAgentInfo = null,
  userBranchName,
  activeTab: controlledTab,
  onTabChange,
}: AnalyticsTablesProps) {
  const isAgentRole = userRole === 'AGENT' || userRole === 'OFFICER_AGENT';
  const isBranchRole = userRole === 'KACAB' || userRole === 'PIC_CABANG';

  const [internalTab, setInternalTab] = useState<AnalyticsTableTab>('branch');
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;

  const [treeViewScope, setTreeViewScope] = useState<'active' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50; // Minimal 50 agen per halaman sesuai instruksi pengguna

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  // ── Tab 1: Filtered Branches ───────────────────────────────────────────────
  const filteredBranches = branchPerformance.filter(
    (b) =>
      b.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.branchCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Tab 2: Filtered All Agents (Role Non-Agent) ────────────────────────────
  const filteredAllAgents = allAgentsPerformance.filter(
    (a) =>
      a.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.agentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.peringkat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Tab Group: Filtered TreeView Group Agents (Agent Role & Non-Agent Tab 4)
  const filteredGroupAgents = agentPerformance.filter((a) => {
    const matchesSearch =
      a.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.agentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.uplineAgentName && a.uplineAgentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.uplineAgentCode && a.uplineAgentCode.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter Cakupan Pohon: Hanya yang aktif atau ancestor dari yang aktif
    if (treeViewScope === 'active' && !searchQuery.trim()) {
      return a.isLeader || a.hasActivity || a.isAncestorOfActive;
    }

    return true;
  });

  // Mandatory: Leader selalu di baris pertama (index 0)
  const orderedGroupAgents = [
    ...filteredGroupAgents.filter(
      (a) => a.isLeader || (personalPerformance && a.agentCode === personalPerformance.agentCode)
    ),
    ...filteredGroupAgents.filter(
      (a) => !a.isLeader && (!personalPerformance || a.agentCode !== personalPerformance.agentCode)
    ),
  ];

  // ── Tab Causes: Filtered Top Causes of Loss ────────────────────────────────
  const filteredCauses = topCausesOfLoss.filter((c) =>
    c.cause.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Helper Pagination ──────────────────────────────────────────────────────
  const getPagedData = <T,>(items: T[]): T[] => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const handleTabChange = (tab: AnalyticsTableTab) => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Hitung jumlah data untuk pagination
  let activeItemCount = 0;
  if (isAgentRole) {
    if (activeTab === 'branch') activeItemCount = personalPerformance ? 1 : 0;
    else if (activeTab === 'agent') activeItemCount = orderedGroupAgents.length;
    else if (activeTab === 'cause') activeItemCount = filteredCauses.length;
  } else {
    if (activeTab === 'branch') activeItemCount = filteredBranches.length;
    else if (activeTab === 'allAgents') activeItemCount = filteredAllAgents.length;
    else if (activeTab === 'targetPersonal') activeItemCount = personalPerformance ? 1 : 0;
    else if (activeTab === 'targetGroup') activeItemCount = orderedGroupAgents.length;
    else if (activeTab === 'cause') activeItemCount = filteredCauses.length;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden mb-12">
      {/* ── HEADER TABS NAVIGATION ─────────────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* TAB 1: Kinerja Personal (Agent) ATAU Kinerja Cabang (Non-Agent) */}
          {isAgentRole ? (
            <button
              onClick={() => handleTabChange('branch')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'branch'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              1. Kinerja Personal
            </button>
          ) : (
            <button
              onClick={() => handleTabChange('branch')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'branch'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              1. Kinerja Cabang {isBranchRole && userBranchName ? `(${userBranchName})` : `(${branchPerformance.length})`}
            </button>
          )}

          {/* TAB 2: Kinerja Group (Agent) ATAU Kinerja Agen All (Non-Agent) */}
          {isAgentRole ? (
            <button
              onClick={() => handleTabChange('agent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'agent'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              2. Kinerja Group ({agentPerformance.length})
            </button>
          ) : (
            <button
              onClick={() => handleTabChange('allAgents')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'allAgents'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              2. Kinerja Agen {isBranchRole ? `Cabang (${allAgentsPerformance.length})` : `(${allAgentsPerformance.length})`}
            </button>
          )}

          {/* NON-AGENT TAB 3: Kinerja Agen Target (Muncul jika ada filter agen) */}
          {!isAgentRole && targetAgentInfo && (
            <button
              onClick={() => handleTabChange('targetPersonal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'targetPersonal'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800'
              }`}
            >
              <Target className="w-4 h-4" />
              3. Kinerja Agen: {targetAgentInfo.name} [{targetAgentInfo.agentCode}]
            </button>
          )}

          {/* NON-AGENT TAB 4: Kinerja Group Agent Target (Muncul jika ada filter agen) */}
          {!isAgentRole && targetAgentInfo && (
            <button
              onClick={() => handleTabChange('targetGroup')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'targetGroup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              4. Kinerja Group: {targetAgentInfo.name} ({agentPerformance.length})
            </button>
          )}

          {/* TAB PENYEBAB KLAIM */}
          <button
            onClick={() => handleTabChange('cause')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'cause'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            Top Penyebab Klaim ({topCausesOfLoss.length})
          </button>
        </div>

        {/* Input Pencarian Cepat di Tabel */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder={
              activeTab === 'targetGroup' || (isAgentRole && activeTab === 'agent')
                ? 'Cari nama/kode downline...'
                : 'Cari dalam tabel...'
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 pl-8 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL 1: KINERJA PERSONAL (ROLE AGENT) ATAU KINERJA CABANG (ROLE LAIN)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'branch' && (
        isAgentRole ? (
          /* Role Agent: Tampilan Ringkas Kinerja Pribadi */
          <div className="p-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-5 mb-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-white shadow-xs">
                      <User className="w-3 h-3" />
                      KINERJA PRIBADI
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {personalPerformance?.agentCode || '-'} • {personalPerformance?.branchName || '-'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {personalPerformance?.agentName || 'Portofolio Agen'} ({personalPerformance?.peringkat || 'Partner'})
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Tabel ini menampilkan kinerja khusus atas nama pribadi akun Anda (tidak menggabungkan produksi downline).
                    Untuk melihat akumulasi portofolio seluruh tim keagenan, silakan klik tab <strong>Kinerja Group</strong> di atas.
                  </p>
                </div>

                {personalPerformance && (
                  <div className="flex items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl px-4 py-3 border border-amber-200/80 dark:border-amber-900/50 shadow-xs shrink-0">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Personal Loss Ratio</span>
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border inline-block mt-0.5 ${personalPerformance.lossRatioEval.badgeClass}`}>
                        {personalPerformance.lossRatioEval.ratioFormatted}
                      </span>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Status Underwriting</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {personalPerformance.lossRatioEval.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabel Baris Personal (Ringkas 5 Kolom) */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">Profil Agen Pribadi</th>
                    <th className="py-3.5 px-4">Peringkat & Cabang</th>
                    <th className="py-3.5 px-5 text-right">Total Premi Pribadi (Polis)</th>
                    <th className="py-3.5 px-5 text-right">Total Klaim Pribadi (Kasus)</th>
                    <th className="py-3.5 px-5 text-center">Loss Ratio & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {personalPerformance ? (
                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 transition">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                            <Crown className="w-4 h-4 fill-white" />
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                              {personalPerformance.agentName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              Kode: <strong className="text-amber-900 dark:text-amber-300">{personalPerformance.agentCode}</strong> • Akun Pribadi Anda
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {personalPerformance.peringkat}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {personalPerformance.branchName}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {formatIDR(personalPerformance.premi)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {personalPerformance.policyCount} Polis Aktif
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className={`font-extrabold text-sm ${personalPerformance.claim > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {formatIDR(personalPerformance.claim)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {personalPerformance.claimCount} Kasus Klaim
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs ${personalPerformance.lossRatioEval.badgeClass}`}>
                          <span>{personalPerformance.lossRatioEval.ratioFormatted}</span>
                          <span className="opacity-50">•</span>
                          <span>{personalPerformance.lossRatioEval.label}</span>
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        Tidak ada data portofolio pribadi pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Role Non-Agent: Kinerja Cabang (Ringkas 4 Kolom Konsisten) */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Cabang & Wilayah</th>
                  <th className="py-3.5 px-5 text-right">Total Premi (Polis)</th>
                  <th className="py-3.5 px-5 text-right">Total Klaim (Kasus)</th>
                  <th className="py-3.5 px-5 text-center">Loss Ratio & Status Underwriting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      Tidak ada data cabang yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  getPagedData(filteredBranches).map((b) => (
                    <tr key={b.branchId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                            <Building2 className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                              {b.branchName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              Kode Cabang: <strong>{b.branchCode}</strong>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {formatIDR(b.premi)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {b.policyCount} Polis
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className={`font-bold text-xs ${b.claim > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {formatIDR(b.claim)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {b.claimCount} Kasus
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs ${b.lossRatioEval.badgeClass}`}>
                          <span>{b.lossRatioEval.ratioFormatted}</span>
                          <span className="opacity-50">•</span>
                          <span>{b.lossRatioEval.label}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL 2: KINERJA AGEN SELURUHNYA (ROLE NON-AGENT)
          Summary Total Agen di Atas + Tabel 50 Agen per Halaman Ringkas
         ═══════════════════════════════════════════════════════════════════════ */}
      {!isAgentRole && activeTab === 'allAgents' && (
        <div className="p-6">
          {/* Summary Total Agen Banner */}
          {allAgentsSummary && (
            <div className="bg-gradient-to-r from-blue-500/10 via-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:via-slate-900/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-5 mb-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-600 text-white shadow-xs">
                      <Users className="w-3 h-3" />
                      {isBranchRole ? `KINERJA AGEN CABANG (${userBranchName || 'CABANG'})` : 'SUMMARY KINERJA SELURUH AGEN NASIONAL'}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {allAgentsSummary.totalAgents} Agen Aktif Terdaftar
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {isBranchRole
                      ? `Portofolio Agen Terdaftar di Cabang ${userBranchName || ''}`
                      : 'Akumulasi Portofolio Produksi & Klaim Seluruh Agen'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Daftar di bawah menyajikan rincian portofolio per agen dengan format ringkas 5 kolom (minimal 50 agen per halaman).
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl px-3.5 py-2.5 border border-blue-100 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Premi (Polis)</span>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs mt-0.5">
                      {formatIDR(allAgentsSummary.totalPremi)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {allAgentsSummary.totalPolicies} Polis Aktif
                    </div>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl px-3.5 py-2.5 border border-blue-100 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Klaim (Kasus)</span>
                    <div className="font-extrabold text-rose-700 dark:text-rose-400 text-xs mt-0.5">
                      {formatIDR(allAgentsSummary.totalClaim)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {allAgentsSummary.totalClaimsCount} Kasus Klaim
                    </div>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl px-3.5 py-2.5 border border-blue-100 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Agregat Loss Ratio</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold border inline-block mt-0.5 ${allAgentsSummary.lossRatioEval.badgeClass}`}>
                      {allAgentsSummary.lossRatioEval.ratioFormatted}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabel All Agents (Ringkas 5 Kolom, 50 Rows Per Page) */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Profil Agen</th>
                  <th className="py-3.5 px-4">Peringkat & Cabang</th>
                  <th className="py-3.5 px-5 text-right">Total Premi (Polis)</th>
                  <th className="py-3.5 px-5 text-right">Total Klaim (Kasus)</th>
                  <th className="py-3.5 px-5 text-center">Loss Ratio & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAllAgents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      Tidak ada data agen yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  getPagedData(filteredAllAgents).map((ag) => (
                    <tr key={ag.agentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <User className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                              {ag.agentName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              Kode: <strong className="text-slate-700 dark:text-slate-300">{ag.agentCode}</strong>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {ag.peringkat}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {ag.branchName}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {formatIDR(ag.premi)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {ag.policyCount} Polis
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className={`font-bold text-xs ${ag.claim > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatIDR(ag.claim)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {ag.claimCount} Kasus
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs ${ag.lossRatioEval.badgeClass}`}>
                          <span>{ag.lossRatioEval.ratioFormatted}</span>
                          <span className="opacity-50">•</span>
                          <span>{ag.lossRatioEval.label}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL 3: KINERJA AGEN TARGET PERSONAL (ROLE NON-AGENT, CONDITIONAL)
         ═══════════════════════════════════════════════════════════════════════ */}
      {!isAgentRole && activeTab === 'targetPersonal' && (
        <div className="p-6">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-5 mb-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-white shadow-xs">
                    <Target className="w-3 h-3" />
                    TARGET FILTER PERSONAL
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {personalPerformance?.agentCode || targetAgentInfo?.agentCode || '-'} • {personalPerformance?.branchName || '-'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {personalPerformance?.agentName || targetAgentInfo?.name || 'Agen Terpilih'} ({personalPerformance?.peringkat || '-'})
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Tabel ini menyajikan portofolio transaksi atas nama <strong>pribadi</strong> agen ini (tidak termasuk polis downline).
                  Untuk melihat akumulasi portofolio tim keagenan yang dipimpinnya, silakan klik tab <strong>4. Kinerja Group Agent</strong> di atas.
                </p>
              </div>

              {personalPerformance && (
                <div className="flex items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl px-4 py-3 border border-amber-200/80 dark:border-amber-900/50 shadow-xs shrink-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Personal Loss Ratio</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border inline-block mt-0.5 ${personalPerformance.lossRatioEval.badgeClass}`}>
                      {personalPerformance.lossRatioEval.ratioFormatted}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Status Underwriting</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {personalPerformance.lossRatioEval.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabel Personal Agen Target (5 Kolom Ringkas) */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Profil Agen Pribadi</th>
                  <th className="py-3.5 px-4">Peringkat & Cabang</th>
                  <th className="py-3.5 px-5 text-right">Total Premi Pribadi (Polis)</th>
                  <th className="py-3.5 px-5 text-right">Total Klaim Pribadi (Kasus)</th>
                  <th className="py-3.5 px-5 text-center">Loss Ratio & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {personalPerformance ? (
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                          <Crown className="w-4 h-4 fill-white" />
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                            {personalPerformance.agentName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            Kode: <strong className="text-amber-900 dark:text-amber-300">{personalPerformance.agentCode}</strong> • Portofolio Pribadi
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {personalPerformance.peringkat}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {personalPerformance.branchName}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                        {formatIDR(personalPerformance.premi)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {personalPerformance.policyCount} Polis Aktif
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className={`font-extrabold text-sm ${personalPerformance.claim > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {formatIDR(personalPerformance.claim)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {personalPerformance.claimCount} Kasus Klaim
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs ${personalPerformance.lossRatioEval.badgeClass}`}>
                        <span>{personalPerformance.lossRatioEval.ratioFormatted}</span>
                        <span className="opacity-50">•</span>
                        <span>{personalPerformance.lossRatioEval.label}</span>
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      Tidak ada data transaksi pribadi untuk agen ini pada periode yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL 4: KINERJA GROUP AGENT (TREEVIEW HIRARKI)
          Untuk Role Agent (Tab 'agent') ATAU Non-Agent (Tab 'targetGroup')
         ═══════════════════════════════════════════════════════════════════════ */}
      {(isAgentRole ? activeTab === 'agent' : activeTab === 'targetGroup') && (
        <div className="overflow-x-auto">
          {/* Baris Kontrol TreeView & Info Leader */}
          <div className="bg-gradient-to-r from-blue-50/90 via-blue-50/50 to-slate-50 dark:from-blue-950/40 dark:via-slate-900/40 dark:to-slate-900 border-b border-blue-100 dark:border-slate-800 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
              <span>
                Tampilan <strong>Hierarki TreeView</strong>: Menampilkan urutan jaringan dari{' '}
                <strong>👑 Root Leader</strong> hingga downline bertingkat beserta <strong>Upline Langsungnya</strong>.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Cakupan Pohon:</span>
              <div className="inline-flex rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTreeViewScope('active');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                    treeViewScope === 'active'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  Pohon Beraktivitas / Terkait ({agentPerformance.filter((a) => a.isLeader || a.hasActivity || a.isAncestorOfActive).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTreeViewScope('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                    treeViewScope === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  Seluruh Jaringan Tim ({agentPerformance.length})
                </button>
              </div>
            </div>
          </div>

          {/* Tabel TreeView (Ringkas 5 Kolom, Opsi 1 Panah ↳) */}
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Agen & Silsilah Jaringan</th>
                <th className="py-3.5 px-4">Peringkat & Cabang</th>
                <th className="py-3.5 px-5 text-right">Total Premi (Polis)</th>
                <th className="py-3.5 px-5 text-right">Total Klaim (Kasus)</th>
                <th className="py-3.5 px-5 text-center">Loss Ratio & Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {orderedGroupAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data jaringan agen yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                getPagedData(orderedGroupAgents).map((ag) => {
                  const isCurrentLeader =
                    ag.isLeader ||
                    (personalPerformance && ag.agentCode === personalPerformance.agentCode) ||
                    (targetAgentInfo && ag.agentCode === targetAgentInfo.agentCode);

                  return (
                    <tr
                      key={ag.agentId}
                      className={`transition ${
                        isCurrentLeader ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/30 font-medium' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* 1. Agen & Silsilah Jaringan */}
                      <td className="py-3.5 px-5">
                        <div
                          className="flex flex-col"
                          style={{ paddingLeft: `${(ag.relativeDepth || 0) * 16}px` }}
                        >
                          <div className="flex items-center gap-2">
                            {ag.relativeDepth === 0 || isCurrentLeader ? (
                              <Crown className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                            ) : (
                              <CornerDownRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 stroke-[2.2]" />
                            )}
                            <span
                              className={`font-bold text-xs ${
                                isCurrentLeader ? 'text-amber-950 dark:text-amber-200 font-black' : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {ag.agentName}
                            </span>

                            {/* Badge Level atau Leader */}
                            {isCurrentLeader ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs">
                                👑 Leader {isAgentRole ? '(Anda)' : `[${ag.agentCode}]`}
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  ag.relativeDepth === 1
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : ag.relativeDepth === 2
                                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                    : ag.relativeDepth === 3
                                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                Level {ag.relativeDepth ?? 1} {ag.relativeDepth === 1 ? '(Direct)' : ''}
                              </span>
                            )}

                            {!ag.hasActivity && !isCurrentLeader && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                                Jembatan Hirarki • Rp 0
                              </span>
                            )}
                          </div>

                          {/* Sub-line: Kode Agen & Upline Langsung */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                            {isCurrentLeader ? (
                              <span className="font-mono">
                                Kode: <strong className="text-slate-700 dark:text-slate-300">{ag.agentCode}</strong> • Root Leader Jaringan
                              </span>
                            ) : (
                              <span>
                                <span className="font-mono">
                                  Kode: <strong className="text-slate-700 dark:text-slate-300">{ag.agentCode}</strong>
                                </span>
                                <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                                <span>
                                  Upline Langsung: <strong className="text-slate-700 dark:text-slate-300">{ag.uplineAgentName || 'Upline Terdaftar'}</strong> ({ag.uplineAgentCode || '-'})
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Peringkat & Cabang */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {ag.peringkat}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {ag.branchName}
                        </div>
                      </td>

                      {/* 3. Total Premi (Polis) */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {formatIDR(ag.premi)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {ag.policyCount} Polis
                        </div>
                      </td>

                      {/* 4. Total Klaim (Kasus) */}
                      <td className="py-3.5 px-5 text-right">
                        <div className={`font-bold text-xs ${ag.claim > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatIDR(ag.claim)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {ag.claimCount} Kasus
                        </div>
                      </td>

                      {/* 5. Loss Ratio & Status */}
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs ${ag.lossRatioEval.badgeClass}`}>
                          <span>{ag.lossRatioEval.ratioFormatted}</span>
                          <span className="opacity-50">•</span>
                          <span>{ag.lossRatioEval.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL 5: TAB TOP PENYEBAB KLAIM (CAUSE OF LOSS)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'cause' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Penyebab Klaim (Cause of Loss)</th>
                <th className="py-3 px-4 text-center">Kasus Klaim</th>
                <th className="py-3 px-4 text-right">Total Klaim (IDR)</th>
                <th className="py-3 px-4 text-right">Kontribusi (%)</th>
                <th className="py-3 px-4 text-right">Rata-rata per Kasus (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCauses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data penyebab klaim yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredCauses.map((c) => (
                  <tr key={c.cause} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{c.cause}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">{c.claimCount}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700 dark:text-rose-400">
                      {formatIDR(c.claim)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {c.pctOfTotal}%
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 font-medium">
                      {formatIDR(c.averagePerClaim)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PAGINATION FOOTER (MINIMAL 50 ENTRI PER HALAMAN) ────────────────── */}
      {activeItemCount > pageSize && (
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div>
            Menampilkan data {(currentPage - 1) * pageSize + 1} s/d{' '}
            {Math.min(currentPage * pageSize, activeItemCount)} dari {activeItemCount} entri (Halaman {pageSize} entri)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Halaman {currentPage} dari {Math.ceil(activeItemCount / pageSize)}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(p + 1, Math.ceil(activeItemCount / pageSize))
                )
              }
              disabled={currentPage >= Math.ceil(activeItemCount / pageSize)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}