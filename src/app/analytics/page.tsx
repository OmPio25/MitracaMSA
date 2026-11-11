'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  BarChart2,
  Filter,
  ArrowRight,
  Info,
  User,
  Users,
} from 'lucide-react';
import { AnalyticsFilter } from '@/components/analytics/analytics-filter';
import { AnalyticsKpiCards } from '@/components/analytics/analytics-kpi-cards';
import { AnalyticsCharts } from '@/components/analytics/analytics-charts';
import { AnalyticsTables, AnalyticsTableTab } from '@/components/analytics/analytics-tables';
import { getAvailableCutoffYears } from '@/lib/analytics/loss-ratio';
import { UserSessionPayload } from '@/lib/auth/session';

export default function AnalyticsPage() {
  // Parameter Filter State (Form Inputs)
  const [cutoffYear, setCutoffYear] = useState('2026'); // Default Cutoff Year 2026 (14 Nov 2025 - 13 Nov 2026)
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [agentCodeInput, setAgentCodeInput] = useState('');
  const [includeDownlines, setIncludeDownlines] = useState(true);
  const [maxDepth, setMaxDepth] = useState('4');
  const [selectedUwYear, setSelectedUwYear] = useState('');

  // Status Filter Applied, Session & Data State
  const [userSession, setUserSession] = useState<UserSessionPayload | null>(null);
  const [activeTableTab, setActiveTableTab] = useState<AnalyticsTableTab>('branch');
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Filter Metadata State
  const [availableCutoffs, setAvailableCutoffs] = useState(getAvailableCutoffYears(6));
  const [availableUwYears, setAvailableUwYears] = useState<string[]>([]);

  // Load metadata opsi filter & sesi pengguna saat pertama kali dibuka
  useEffect(() => {
    async function loadInitial() {
      try {
        const [metaRes, sessionRes] = await Promise.all([
          fetch('/api/analytics?metaOnly=true'),
          fetch('/api/auth/me'),
        ]);

        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          if (metaJson.availableCutoffs) setAvailableCutoffs(metaJson.availableCutoffs);
          if (metaJson.availableUwYears) setAvailableUwYears(metaJson.availableUwYears);
        }

        if (sessionRes.ok) {
          const sJson = await sessionRes.json();
          if (sJson.authenticated && sJson.user) {
            setUserSession(sJson.user);
            if (sJson.user.role !== 'AGENT' && sJson.user.role !== 'OFFICER_AGENT') {
              if (sJson.user.branchId) {
                setSelectedBranchId(sJson.user.branchId);
              }
            } else {
              setSelectedBranchId(''); // Peran Agen melihat seluruh jaringannya lintas cabang
            }
            if (sJson.user.agentCode || sJson.user.parentAgentCode) {
              setAgentCodeInput(sJson.user.agentCode || sJson.user.parentAgentCode);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load initial metadata or session:', err);
      }
    }
    loadInitial();
  }, []);

  // Fungsi Terapkan Filter
  const handleApplyFilter = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setHasAppliedFilter(true);

      const params = new URLSearchParams();
      if (cutoffYear) params.set('cutoffYear', cutoffYear);
      if (cutoffYear === 'CUSTOM') {
        if (customStartDate) params.set('startDate', customStartDate);
        if (customEndDate) params.set('endDate', customEndDate);
      }
      if (selectedBranchId) params.set('branchId', selectedBranchId);
      if (agentCodeInput.trim()) params.set('agentCode', agentCodeInput.trim());
      params.set('includeDownlines', String(includeDownlines));
      if (maxDepth) params.set('maxDepth', maxDepth);
      if (selectedUwYear) params.set('uwYear', selectedUwYear);

      const res = await fetch(`/api/analytics?${params.toString()}`);
      const resJson = await res.json().catch(() => null);

      if (!res.ok || !resJson?.success) {
        let friendly = resJson?.friendlyMessage;
        if (!friendly || res.status === 500) {
          if (userSession?.role === 'KACAB' || userSession?.role === 'PIC_CABANG') {
            friendly = `Belum ada data produksi maupun klaim yang tercatat untuk Cabang ${userSession.branchName || ''} pada periode Cutoff ini.`;
          } else if (userSession?.role === 'AGENT' || userSession?.role === 'OFFICER_AGENT') {
            friendly = `Belum ada data produksi maupun klaim yang tercatat untuk jaringan keagenan Anda (${userSession.agentCode || userSession.parentAgentCode || ''}) pada periode Cutoff ini.`;
          } else {
            friendly = resJson?.error || 'Belum ada data transaksi yang dapat diolah pada parameter filter ini.';
          }
        }
        throw new Error(friendly);
      }

      setData(resJson);
      if (resJson.filter?.targetAgent && userSession?.role !== 'AGENT' && userSession?.role !== 'OFFICER_AGENT') {
        setActiveTableTab('targetPersonal');
      } else if (!resJson.filter?.targetAgent && (activeTableTab === 'targetPersonal' || activeTableTab === 'targetGroup')) {
        setActiveTableTab('branch');
      }
    } catch (err: any) {
      console.error('Fetch analytics error:', err);
      setError(err.message || 'Gagal memuat data analitik');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilter = () => {
    setCutoffYear('2026');
    setCustomStartDate('');
    setCustomEndDate('');
    if (userSession?.role !== 'AGENT' && userSession?.role !== 'OFFICER_AGENT' && userSession?.branchId) {
      setSelectedBranchId(userSession.branchId);
    } else {
      setSelectedBranchId('');
    }
    if (userSession?.agentCode || userSession?.parentAgentCode) {
      setAgentCodeInput(userSession.agentCode || userSession.parentAgentCode || '');
    } else {
      setAgentCodeInput('');
    }
    setIncludeDownlines(true);
    setMaxDepth('4');
    setSelectedUwYear('');
    setActiveTableTab('branch');
    setHasAppliedFilter(false);
    setData(null);
    setError(null);
  };

  const handleExportXlsx = async () => {
    if (!hasAppliedFilter) return;

    try {
      setIsExportingXlsx(true);
      const params = new URLSearchParams();
      if (cutoffYear) params.set('cutoffYear', cutoffYear);
      if (cutoffYear === 'CUSTOM') {
        if (customStartDate) params.set('startDate', customStartDate);
        if (customEndDate) params.set('endDate', customEndDate);
      }
      if (selectedBranchId) params.set('branchId', selectedBranchId);
      if (agentCodeInput.trim()) params.set('agentCode', agentCodeInput.trim());
      params.set('includeDownlines', String(includeDownlines));
      if (maxDepth) params.set('maxDepth', maxDepth);
      if (selectedUwYear) params.set('uwYear', selectedUwYear);

      const url = `/api/analytics/export/xlsx?${params.toString()}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Analitik_Loss_Ratio_${cutoffYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setTimeout(() => setIsExportingXlsx(false), 1500);
    }
  };

  const handleExportPdf = async () => {
    if (!hasAppliedFilter) return;

    try {
      setIsExportingPdf(true);
      const params = new URLSearchParams();
      if (cutoffYear) params.set('cutoffYear', cutoffYear);
      if (cutoffYear === 'CUSTOM') {
        if (customStartDate) params.set('startDate', customStartDate);
        if (customEndDate) params.set('endDate', customEndDate);
      }
      if (selectedBranchId) params.set('branchId', selectedBranchId);
      if (agentCodeInput.trim()) params.set('agentCode', agentCodeInput.trim());
      params.set('includeDownlines', String(includeDownlines));
      if (maxDepth) params.set('maxDepth', maxDepth);
      if (selectedUwYear) params.set('uwYear', selectedUwYear);

      const url = `/api/analytics/export/pdf?${params.toString()}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Eksekutif_Analitik_Loss_Ratio_${cutoffYear}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setTimeout(() => setIsExportingPdf(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <BarChart2 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Analitik Produksi & Loss Ratio
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring risiko underwriting, rasio klaim, dan portofolio keagenan
              </p>
            </div>
          </div>
        </div>

        {hasAppliedFilter && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleApplyFilter()}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
          </div>
        )}
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <AnalyticsFilter
        cutoffYear={cutoffYear}
        setCutoffYear={setCutoffYear}
        availableCutoffs={availableCutoffs}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        agentCodeInput={agentCodeInput}
        setAgentCodeInput={setAgentCodeInput}
        includeDownlines={includeDownlines}
        setIncludeDownlines={setIncludeDownlines}
        maxDepth={maxDepth}
        setMaxDepth={setMaxDepth}
        selectedUwYear={selectedUwYear}
        setSelectedUwYear={setSelectedUwYear}
        availableUwYears={availableUwYears}
        userRole={userSession?.role}
        userBranchName={userSession?.branchName || undefined}
        onApplyFilter={handleApplyFilter}
        onResetFilter={handleResetFilter}
        isLoading={isLoading}
        isExportingXlsx={isExportingXlsx}
        onExportXlsx={handleExportXlsx}
        isExportingPdf={isExportingPdf}
        onExportPdf={handleExportPdf}
        hasAppliedFilter={hasAppliedFilter}
      />

      {/* ── Konten Dashboard ─────────────────────────────────────────────────── */}
      {!hasAppliedFilter ? (
        /* Tampilan Awal: Data Belum Ditampilkan */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Data Belum Ditampilkan
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Silakan atur parameter filter pada panel di atas (Tahun Cutoff, Cabang, Kode Agen, atau UW Year), kemudian klik tombol <strong className="text-blue-600 font-semibold">Terapkan Filter</strong> (atau tekan tombol Enter saat memasukkan kode agen) untuk menghitung dan menampilkan laporan.
          </p>
          <div className="mt-6">
            <button
              onClick={handleApplyFilter}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition inline-flex items-center gap-2"
            >
              <span>Terapkan Filter Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : isLoading ? (
        /* Loading Spinner */
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Menghitung Agregasi Data & Loss Ratio...</h3>
          <p className="text-xs text-slate-500 mt-1">Memproses transaksi polis dan klaim sesuai filter yang diterapkan</p>
        </div>
      ) : data ? (
        /* Data Analitik & Loss Ratio */
        <>
          {/* Target Agen Banner jika filter agen aktif */}
          {data.filter?.targetAgent && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-900">
                  Agen Target: [{data.filter.targetAgent.agentCode}] {data.filter.targetAgent.name}
                </span>
                <span className="text-blue-700">
                  {data.filter.includeDownlines ? '(Termasuk Seluruh Downline Agensi)' : '(Hanya Agen Ini / Direct)'}
                </span>
              </div>
            </div>
          )}

          {/* Banner Informasi Jika Belum Ada Data Transaksi (Produksi / Klaim) */}
          {(data.kpi.totalPremi === 0 || data.kpi.totalClaim === 0) && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  Status Data Transaksi
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  {data.diagnostics?.emptyReason ||
                    (userSession?.role === 'KACAB' || userSession?.role === 'PIC_CABANG'
                      ? `Belum ada data transaksi produksi maupun klaim untuk Cabang ${userSession.branchName || ''} pada periode Cutoff ini.`
                      : userSession?.role === 'AGENT' || userSession?.role === 'OFFICER_AGENT'
                      ? `Belum ada data produksi maupun klaim untuk jaringan agen Anda (${userSession.agentCode || userSession.parentAgentCode || ''}) pada periode Cutoff ini.`
                      : 'Belum ada transaksi produksi maupun klaim yang tercatat pada filter ini.')}
                </p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Data analitik dan rasio klaim akan otomatis terbarui begitu file transaksi diunggah oleh Administrator.
                </p>
              </div>
            </div>
          )}

          {/* ── Mode Konteks KPI & Grafik (Personal vs Group untuk Agen / Target Agen) ── */}
          {(() => {
            const isAgent = userSession?.role === 'AGENT' || userSession?.role === 'OFFICER_AGENT';
            if (isAgent) {
              const isPersonal = activeTableTab === 'branch';
              return (
                <div
                  className={`mb-6 p-4 rounded-2xl border shadow-xs transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isPersonal
                      ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-orange-50/40 border-amber-200/90 text-amber-950'
                      : 'bg-gradient-to-r from-blue-500/10 via-blue-50/70 to-indigo-50/40 border-blue-200/90 text-blue-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl text-white shadow-xs ${
                        isPersonal ? 'bg-amber-600' : 'bg-blue-600'
                      }`}
                    >
                      {isPersonal ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        {isPersonal
                          ? 'Ringkasan Portofolio Personal (Pribadi Agen)'
                          : 'Ringkasan Portofolio Group (Leader + Downline)'}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isPersonal
                          ? `Metrik KPI dan grafik di bawah khusus menampilkan transaksi atas nama akun pribadi Anda [${userSession?.agentCode || userSession?.parentAgentCode || '-'}] ${userSession?.name || ''}.`
                          : `Metrik KPI dan grafik di bawah menampilkan akumulasi transaksi gabungan seluruh jaringan tim keagenan Anda.`}
                      </p>
                    </div>
                  </div>

                  {/* Quick Switcher Personal vs Group Tab */}
                  <div className="flex items-center gap-1.5 p-1 bg-white/90 rounded-xl border border-slate-200/80 shadow-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTableTab('branch')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        isPersonal
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Kinerja Personal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTableTab('agent')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        !isPersonal
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Kinerja Group (Tim)</span>
                    </button>
                  </div>
                </div>
              );
            } else if (
              data.filter?.targetAgent &&
              (activeTableTab === 'targetPersonal' || activeTableTab === 'targetGroup')
            ) {
              const isTargetPersonal = activeTableTab === 'targetPersonal';
              return (
                <div
                  className={`mb-6 p-4 rounded-2xl border shadow-xs transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isTargetPersonal
                      ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-orange-50/40 border-amber-200/90 text-amber-950'
                      : 'bg-gradient-to-r from-indigo-500/10 via-indigo-50/70 to-purple-50/40 border-indigo-200/90 text-indigo-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl text-white shadow-xs ${
                        isTargetPersonal ? 'bg-amber-600' : 'bg-indigo-600'
                      }`}
                    >
                      {isTargetPersonal ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        {isTargetPersonal
                          ? `Ringkasan Portofolio Personal Target: [${data.filter.targetAgent.agentCode}] ${data.filter.targetAgent.name}`
                          : `Ringkasan Portofolio Group Target: [${data.filter.targetAgent.agentCode}] ${data.filter.targetAgent.name}`}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isTargetPersonal
                          ? `Metrik KPI dan grafik di bawah khusus menampilkan transaksi pribadi agen target (tanpa downline).`
                          : `Metrik KPI dan grafik di bawah menampilkan akumulasi transaksi tim keagenan (leader + downline).`}
                      </p>
                    </div>
                  </div>

                  {/* Quick Switcher Target Personal vs Group Tab */}
                  <div className="flex items-center gap-1.5 p-1 bg-white/90 rounded-xl border border-slate-200/80 shadow-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTableTab('targetPersonal')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        isTargetPersonal
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Target Personal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTableTab('targetGroup')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        !isTargetPersonal
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Target Group TreeView</span>
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* 1. Kartu Ringkasan KPI Finansial */}
          <AnalyticsKpiCards
            scopeMode={(() => {
              const isAgent = userSession?.role === 'AGENT' || userSession?.role === 'OFFICER_AGENT';
              if (isAgent) {
                return activeTableTab === 'branch' ? 'personal' : 'group';
              }
              if (activeTableTab === 'targetPersonal') return 'personal';
              if (activeTableTab === 'targetGroup') return 'group';
              return 'all';
            })()}
            kpi={(() => {
              const isAgent = userSession?.role === 'AGENT' || userSession?.role === 'OFFICER_AGENT';
              if (isAgent) {
                return activeTableTab === 'branch' && data.personalKpi ? data.personalKpi : data.kpi;
              }
              if (activeTableTab === 'targetPersonal' && data.personalKpi) {
                return data.personalKpi;
              }
              if (activeTableTab === 'targetGroup' && data.groupKpi) {
                return data.groupKpi;
              }
              return data.kpi;
            })()}
          />

          {/* 2. Visualisasi Grafik Tren & Distribusi */}
          <AnalyticsCharts
            monthlyTrend={(() => {
              const isAgent = userSession?.role === 'AGENT' || userSession?.role === 'OFFICER_AGENT';
              if (isAgent) {
                return activeTableTab === 'branch' && data.personalMonthlyTrend ? data.personalMonthlyTrend : data.monthlyTrend;
              }
              if (activeTableTab === 'targetPersonal' && data.personalMonthlyTrend) {
                return data.personalMonthlyTrend;
              }
              if (activeTableTab === 'targetGroup' && data.groupMonthlyTrend) {
                return data.groupMonthlyTrend;
              }
              return data.monthlyTrend;
            })()}
            productBreakdown={(() => {
              const isAgent = userSession?.role === 'AGENT' || userSession?.role === 'OFFICER_AGENT';
              if (isAgent) {
                return activeTableTab === 'branch' && data.personalProductBreakdown ? data.personalProductBreakdown : data.productBreakdown;
              }
              if (activeTableTab === 'targetPersonal' && data.personalProductBreakdown) {
                return data.personalProductBreakdown;
              }
              if (activeTableTab === 'targetGroup' && data.groupProductBreakdown) {
                return data.groupProductBreakdown;
              }
              return data.productBreakdown;
            })()}
          />

          {/* 3. Tabel Detail Kinerja */}
          <AnalyticsTables
            branchPerformance={data.branchPerformance}
            agentPerformance={data.agentPerformance}
            topCausesOfLoss={data.topCausesOfLoss}
            userRole={userSession?.role}
            personalPerformance={data.personalPerformance}
            allAgentsPerformance={data.allAgentsPerformance}
            allAgentsSummary={data.allAgentsSummary}
            targetAgentInfo={data.filter?.targetAgent}
            userBranchName={userSession?.branchName || undefined}
            activeTab={activeTableTab}
            onTabChange={setActiveTableTab}
          />
        </>
      ) : null}
    </main>
  );
}
