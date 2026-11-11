'use client';

import { useState, useEffect } from 'react';
import { HierarchyFilter, HierarchyMode } from '@/components/hierarchy/hierarchy-filter';
import { HierarchyTreeView } from '@/components/hierarchy/hierarchy-tree-view';
import { HierarchyOrgChart } from '@/components/hierarchy/hierarchy-org-chart';
import { HierarchyNode } from '@/app/api/hierarchy/route';
import { exportHierarchyToPDF } from '@/lib/export/pdf-hierarchy-generator';
import { UserSessionPayload } from '@/lib/auth/session';
import {
  GitFork,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Network,
  ListTree,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';

export default function HierarchyPage() {
  const [mode, setMode] = useState<HierarchyMode>('SPECIFIC');
  const [agentCode, setAgentCode] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [treeData, setTreeData] = useState<HierarchyNode[]>([]);
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'TREE' | 'ORG_CHART'>('TREE');
  const [userSession, setUserSession] = useState<UserSessionPayload | null>(null);

  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUserSession(data.user);
            if (data.user.branchName) {
              setBranch(data.user.branchName);
            }
            if (data.user.agentCode || data.user.parentAgentCode) {
              setAgentCode(data.user.agentCode || data.user.parentAgentCode);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      }
    }
    loadSession();
  }, []);

  const fetchHierarchy = async (
    selectedMode: HierarchyMode,
    selectedCode: string,
    selectedBranch: string = branch
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const url = new URL('/api/hierarchy', window.location.origin);
      url.searchParams.set('mode', selectedMode);
      if (selectedMode === 'SPECIFIC') {
        url.searchParams.set('agentCode', selectedCode);
      }
      if (selectedBranch && selectedBranch !== 'ALL') {
        url.searchParams.set('branch', selectedBranch);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat struktur hirarki.');
      }

      setTreeData(data.tree || []);
      setHasAppliedFilter(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
      setTreeData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterApply = (params: {
    mode: HierarchyMode;
    agentCode: string;
    branch: string;
  }) => {
    setMode(params.mode);
    setAgentCode(params.agentCode);
    setBranch(params.branch);
    fetchHierarchy(params.mode, params.agentCode, params.branch);
  };

  const handleReset = () => {
    setHasAppliedFilter(false);
    setTreeData([]);
    setErrorMessage(null);
    setAgentCode('');
    setBranch('ALL');
    setMode('SPECIFIC');
  };

  const handleDrilldown = (targetCode: string) => {
    setMode('SPECIFIC');
    setAgentCode(targetCode);
    fetchHierarchy('SPECIFIC', targetCode, branch);
  };

  const handleExportXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const url = new URL('/api/hierarchy/export/xlsx', window.location.origin);
      url.searchParams.set('mode', mode);
      if (mode === 'SPECIFIC') {
        url.searchParams.set('agentCode', agentCode);
      }
      if (branch && branch !== 'ALL') {
        url.searchParams.set('branch', branch);
      }
      const a = document.createElement('a');
      a.href = url.toString();
      a.download = `Hirarki_Agen_${agentCode || (branch !== 'ALL' ? branch : mode)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setTimeout(() => setIsExportingXlsx(false), 1200);
    }
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      exportHierarchyToPDF(treeData, {
        mode,
        agentCode,
        branch: branch !== 'ALL' ? branch : undefined,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setTimeout(() => setIsExportingPdf(false), 800);
    }
  };

  return (
    <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Title */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <GitFork className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Pohon Hirarki Agensi
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Visualisasi struktur upline-downline agensi, kalkulasi akumulasi produksi premi, dan pelacakan status self-healing real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <HierarchyFilter
        mode={mode}
        agentCode={agentCode}
        branch={branch}
        userRole={userSession?.role}
        userBranchName={userSession?.branchName || undefined}
        onFilterApply={handleFilterApply}
        onReset={handleReset}
        isLoading={isLoading}
        hasAppliedFilter={hasAppliedFilter}
        totalLoaded={treeData.length}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Gagal Memuat Hirarki</p>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      {!hasAppliedFilter && !isLoading ? (
        /* Responsive Empty State Placeholder */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
            <GitFork className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Pohon Hirarki Belum Diterapkan
          </h3>
          <p className="text-slate-600 text-sm max-w-xl mx-auto mt-2 leading-relaxed">
            Untuk menjaga halaman tetap responsif dan menghindari beban berlebih pada browser terhadap{' '}
            <span className="font-semibold text-slate-900">14.000+ data agen</span>, visualisasi pohon hirarki baru akan dimuat setelah Anda menentukan parameter dan menekan tombol{' '}
            <span className="font-semibold text-blue-600">"Terapkan Filter"</span> di atas.
          </p>

          {/* Quick Action Shortcuts */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Atau Mulai Langsung Dengan Shortcut Cepat:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {/* Shortcut 1: Ahmad Dahlan */}
              {(!userSession || userSession.role === 'SUPERADMIN' || userSession.role === 'ADMIN' || userSession.role === 'AUDIT') && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('SPECIFIC');
                    setAgentCode('DIR001');
                    fetchHierarchy('SPECIFIC', 'DIR001', branch);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      DIR001
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-2">Pohon Ahmad Dahlan</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">3 node bertingkat (Director)</p>
                </button>
              )}

              {/* Shortcut 2: Ekasurya Halim */}
              <button
                type="button"
                onClick={() => {
                  const targetCode = userSession?.agentCode || userSession?.parentAgentCode || '871300';
                  setMode('SPECIFIC');
                  setAgentCode(targetCode);
                  fetchHierarchy('SPECIFIC', targetCode, branch);
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {userSession?.agentCode || userSession?.parentAgentCode || '871300'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-xs font-semibold text-slate-900 mt-2">
                  {userSession?.agentName || 'Pohon Ekasurya Halim'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pohon downline berjenjang lengkap</p>
              </button>

              {/* Shortcut 3: Cabang (Hanya untuk Superadmin/Admin/Audit atau Cabang yang bersangkutan) */}
              {(!userSession || userSession.role === 'SUPERADMIN' || userSession.role === 'ADMIN' || userSession.role === 'AUDIT' || userSession.role === 'KACAB' || userSession.role === 'PIC_CABANG') && (
                <button
                  type="button"
                  onClick={() => {
                    const targetBranch = userSession?.branchName || 'Jatinegara';
                    setMode('ALL_ROOT');
                    setAgentCode('');
                    setBranch(targetBranch);
                    fetchHierarchy('ALL_ROOT', '', targetBranch);
                  }}
                  className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50/60 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                      {userSession?.branchCode ? `CABANG [${userSession.branchCode}]` : 'JATINEGARA'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-2">
                    Cabang {userSession?.branchName || 'Jatinegara'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Semua root & downline lengkap</p>
                </button>
              )}

              {/* Shortcut 4: Agen Bermasalah (Hanya SUPERADMIN, ADMIN, AUDIT) */}
              {(!userSession || userSession.role === 'SUPERADMIN' || userSession.role === 'ADMIN' || userSession.role === 'AUDIT') && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('PROBLEMATIC');
                    fetchHierarchy('PROBLEMATIC', '', branch);
                  }}
                  className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      Pending & Unregistered
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-xs font-semibold text-amber-900 mt-2">Agen Bermasalah</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">Self-healing & auto-provision</p>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Loaded Hierarchy with View Switcher & Export Toolbar */
        <div className="space-y-4">
          {/* Top Bar: View Switcher and Export Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            {/* View Switcher Tabs: Tab 1 -> Tree View, Tab 2 -> Bagan Organisasi */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewType('TREE')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewType === 'TREE'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListTree className="w-4 h-4" />
                Pohon Berjenjang (Tree View)
              </button>

              <button
                type="button"
                onClick={() => setViewType('ORG_CHART')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewType === 'ORG_CHART'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Network className="w-4 h-4" />
                Bagan Organisasi (Org Chart)
              </button>
            </div>

            {/* Export Toolbar Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold hidden md:inline">Ekspor:</span>

              <button
                type="button"
                onClick={handleExportXlsx}
                disabled={isExportingXlsx}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition cursor-pointer disabled:opacity-50 shadow-xs"
                title="Unduh seluruh struktur hirarki agen ke format Excel (.xlsx)"
              >
                {isExportingXlsx ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Mengunduh...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel (.xlsx)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition cursor-pointer disabled:opacity-50 shadow-xs"
                title="Cetak & simpan laporan hirarki agen ke format PDF (.pdf)"
              >
                {isExportingPdf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    <span>Membuat PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Export PDF (.pdf)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active View */}
          {viewType === 'TREE' ? (
            <HierarchyTreeView
              tree={treeData}
              onSelectAgent={handleDrilldown}
              onExportXlsx={handleExportXlsx}
              onExportPdf={handleExportPdf}
              isExportingXlsx={isExportingXlsx}
              isExportingPdf={isExportingPdf}
            />
          ) : (
            <HierarchyOrgChart
              tree={treeData}
              onSelectAgent={handleDrilldown}
              onExportXlsx={handleExportXlsx}
              onExportPdf={handleExportPdf}
              isExportingXlsx={isExportingXlsx}
              isExportingPdf={isExportingPdf}
            />
          )}
        </div>
      )}
    </main>
  );
}
