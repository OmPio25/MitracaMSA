'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Building,
  User,
  GitFork,
  Download,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface AnalyticsFilterProps {
  cutoffYear: string; // e.g. "2026", "2025", "ALL", "CUSTOM"
  setCutoffYear: (val: string) => void;
  availableCutoffs: Array<{ year: number; label: string; startDate: string; endDate: string }>;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  selectedBranchId: string;
  setSelectedBranchId: (val: string) => void;
  agentCodeInput: string;
  setAgentCodeInput: (val: string) => void;
  includeDownlines: boolean;
  setIncludeDownlines: (val: boolean) => void;
  selectedUwYear: string;
  setSelectedUwYear: (val: string) => void;
  availableUwYears: string[];
  maxDepth?: string;
  setMaxDepth?: (val: string) => void;
  userRole?: string;
  userBranchName?: string;
  onApplyFilter: () => void;
  onResetFilter: () => void;
  isLoading?: boolean;
  isExportingXlsx: boolean;
  onExportXlsx: () => void;
  isExportingPdf?: boolean;
  onExportPdf?: () => void;
  hasAppliedFilter?: boolean;
}

export function AnalyticsFilter({
  cutoffYear,
  setCutoffYear,
  availableCutoffs,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedBranchId,
  setSelectedBranchId,
  agentCodeInput,
  setAgentCodeInput,
  includeDownlines,
  setIncludeDownlines,
  selectedUwYear,
  setSelectedUwYear,
  availableUwYears,
  maxDepth = '4',
  setMaxDepth,
  userRole,
  userBranchName,
  onApplyFilter,
  onResetFilter,
  isLoading = false,
  isExportingXlsx,
  onExportXlsx,
  isExportingPdf = false,
  onExportPdf,
  hasAppliedFilter = false,
}: AnalyticsFilterProps) {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  useEffect(() => {
    async function loadBranches() {
      try {
        setIsLoadingBranches(true);
        const res = await fetch('/api/branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setIsLoadingBranches(false);
      }
    }
    loadBranches();
  }, []);

  // Ambil label cutoff aktif saat ini
  const activeCutoffInfo = availableCutoffs.find((c) => String(c.year) === cutoffYear);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 mb-8">
      {/* Header Filter & Keterangan Cutoff Otomatis */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Filter Periode & Parameter Underwriting</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sistem otomatis menerapkan filter <span className="font-semibold text-slate-700 dark:text-slate-300">Cutoff Year</span> (14 November tahun lalu s/d 13 November tahun ini).
          </p>
        </div>

        {/* Legend Indikator Loss Ratio Sesuai Aturan */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Standar Underwriting:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800/60">
            🟢 Sehat (&lt;35%)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800/60">
            🟡 Waspada (=35%)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 font-semibold border border-rose-300 dark:border-rose-800/60">
            🔴 Kritis (&gt;35%)
          </span>
        </div>
      </div>

      {/* Grid Kontrol Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {/* 1. Filter Cutoff Year */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Tahun Cutoff (Fixed Cycle)</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.5 rounded">Otomatis</span>
          </label>
          <select
            value={cutoffYear}
            onChange={(e) => setCutoffYear(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
          >
            {availableCutoffs.map((c) => (
              <option key={c.year} value={String(c.year)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {c.label}
              </option>
            ))}
            <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Semua Periode (All Time)</option>
            <option value="CUSTOM" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Kustom Tanggal Rentang</option>
          </select>
          {activeCutoffInfo && cutoffYear !== 'ALL' && cutoffYear !== 'CUSTOM' && (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Rentang: {activeCutoffInfo.startDate} s/d {activeCutoffInfo.endDate}
            </span>
          )}
        </div>

        {/* 2. Filter Cabang */}
        {userRole === 'KACAB' || userRole === 'PIC_CABANG' ? (
          <div>
            <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Cabang Penugasan
            </label>
            <div className="w-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-emerald-900 dark:text-emerald-200 truncate">
              {userBranchName || 'Cabang Terkunci'}
            </div>
            <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">Data terkunci khusus cabang Anda</span>
          </div>
        ) : (userRole === 'AGENT' || userRole === 'OFFICER_AGENT') ? (
          <div>
            <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Maks. Kedalaman Hirarki
              </span>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded">Testing Mode</span>
            </label>
            <select
              value={maxDepth}
              onChange={(e) => setMaxDepth && setMaxDepth(e.target.value)}
              className="w-full text-xs font-bold bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-lg px-3 py-2 text-amber-950 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition cursor-pointer"
            >
              <option value="1" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Maks. Level 1 (Direct Downline Saja)</option>
              <option value="2" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Maks. Level 2 (Direct + Level 2)</option>
              <option value="3" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Maks. Level 3 (Kedalaman 3 Tingkat)</option>
              <option value="4" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Maks. Level 4 (Default Maksimal)</option>
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Semua Level (Tanpa Batas)</option>
            </select>
            <span className="block text-[10px] text-amber-700 dark:text-amber-400 mt-1">Mengatur batas kedalaman level downline group</span>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Lingkup Cabang
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Semua Cabang (Nasional)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Filter Agen & Agensi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Kode / Nama Agen {userRole === 'AGENT' || userRole === 'OFFICER_AGENT' ? '(Akun Anda)' : ''}
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly={userRole === 'AGENT' || userRole === 'OFFICER_AGENT'}
              placeholder="Contoh: 871300 atau Nama Agen (Tekan Enter)"
              value={agentCodeInput}
              onChange={(e) => setAgentCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onApplyFilter();
                }
              }}
              className={`w-full text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 pl-8 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${
                userRole === 'AGENT' || userRole === 'OFFICER_AGENT' ? 'bg-amber-50/60 dark:bg-amber-950/30 font-bold text-amber-950 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-950'
              }`}
            />
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          {agentCodeInput.trim() && (
            <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
              <input
                type="checkbox"
                disabled={userRole === 'AGENT' || userRole === 'OFFICER_AGENT'}
                checked={includeDownlines}
                onChange={(e) => setIncludeDownlines(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <GitFork className="w-3 h-3 text-blue-600" />
                Sertakan seluruh downline agensi
              </span>
            </label>
          )}
        </div>

        {/* 4. Filter Underwriting Year (UW Year) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Underwriting Year (UW Year)
          </label>
          <select
            value={selectedUwYear}
            onChange={(e) => setSelectedUwYear(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Semua UW Year</option>
            {availableUwYears.map((uw) => (
              <option key={uw} value={uw} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                Tahun Underwriting {uw}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row Kustom Tanggal jika dipilih CUSTOM */}
      {cutoffYear === 'CUSTOM' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-blue-50/40 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Mulai (Kustom)
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Selesai (Kustom)
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      )}

      {/* Action Buttons: Terapkan Filter, Reset, Export Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onApplyFilter}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menghitung...
              </>
            ) : (
              <>
                <span>Terapkan Filter</span>
              </>
            )}
          </button>
          <button
            onClick={onResetFilter}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Tombol Ekspor PDF Ringkasan Eksekutif */}
          <button
            onClick={onExportPdf}
            disabled={!hasAppliedFilter || isExportingPdf || isLoading}
            title={!hasAppliedFilter ? 'Terapkan filter terlebih dahulu untuk mengekspor' : 'Ekspor Ringkasan Eksekutif ke PDF'}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {isExportingPdf ? 'Membuat PDF...' : 'Ekspor Ringkasan Eksekutif (.pdf)'}
          </button>

          {/* Tombol Ekspor Excel */}
          <button
            onClick={onExportXlsx}
            disabled={!hasAppliedFilter || isExportingXlsx || isLoading}
            title={!hasAppliedFilter ? 'Terapkan filter terlebih dahulu untuk mengekspor' : 'Ekspor Laporan ke Excel'}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isExportingXlsx ? 'Membuat Excel...' : 'Ekspor Laporan Analitik (.xlsx)'}
          </button>
        </div>
      </div>
    </div>
  );
}
