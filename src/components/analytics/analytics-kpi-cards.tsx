'use client';

import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Scale,
  Percent,
} from 'lucide-react';
import { LossRatioBadgeInfo } from '@/lib/analytics/loss-ratio';

interface AnalyticsKpiProps {
  scopeMode?: 'personal' | 'group' | 'all';
  kpi: {
    totalPremi: number;
    totalClaim: number;
    lossRatio: number | null;
    lossRatioEval: LossRatioBadgeInfo;
    netMargin: number;
    totalKomisi: number;
    totalPolicies: number;
    totalClaimsCount: number;
    totalClaimAll?: number;
    allLossRatio?: number | null;
    allLossRatioEval?: LossRatioBadgeInfo;
  };
}

export function AnalyticsKpiCards({ kpi, scopeMode = 'all' }: AnalyticsKpiProps) {
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const lr = kpi.lossRatioEval;

  const isPersonal = scopeMode === 'personal';
  const isGroup = scopeMode === 'group';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* 1. Total Premi MM (Gross Written Premium) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isPersonal ? 'Premi MM Personal' : isGroup ? 'Premi MM Group (Tim)' : 'Premi MM (GWP)'}
            </span>
            {isPersonal && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                Personal
              </span>
            )}
            {isGroup && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60">
                Group
              </span>
            )}
          </div>
          <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
            <DollarSign className="w-5 h-5" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {formatIDR(kpi.totalPremi)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {kpi.totalPolicies.toLocaleString('id-ID')}{' '}
              {isPersonal ? 'Polis Pribadi MM' : isGroup ? 'Polis Tim MM' : 'Total Polis MM'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Klaim MM Diselesaikan */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isPersonal ? 'Klaim MM Personal' : isGroup ? 'Klaim MM Group (Tim)' : 'Klaim MM (Gross Claim)'}
            </span>
            {isPersonal && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                Personal
              </span>
            )}
            {isGroup && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60">
                Group
              </span>
            )}
          </div>
          <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {formatIDR(kpi.totalClaim)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>
              {kpi.totalClaimsCount.toLocaleString('id-ID')}{' '}
              {isPersonal ? 'Kasus Klaim Pribadi' : isGroup ? 'Kasus Klaim Tim' : 'Kasus Klaim MM'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. LOSS RATIO MM (DENGAN ALL LR SUB-BADGE UNTUK MANAGEMENT) */}
      <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition ${lr.bgClass} dark:bg-slate-900 ${lr.borderClass} dark:border-slate-800`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              {isPersonal ? 'LR MM Personal' : isGroup ? 'LR MM Group (Tim)' : 'Loss Ratio MM (LR MM)'}
            </span>
            {isPersonal && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                Personal
              </span>
            )}
            {isGroup && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60">
                Group
              </span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${lr.badgeClass}`}>
            {lr.status === 'HEALTHY' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            {lr.status === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
            {lr.status === 'CRITICAL' && <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
            {lr.label}
          </span>
        </div>
        <div className="mt-3">
          <div className={`text-3xl font-extrabold tracking-tight ${lr.textClass}`}>
            {lr.ratioFormatted}
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              Formula: (Klaim MM / Premi MM) × 100%. Batas aman: <span className="font-bold text-emerald-700 dark:text-emerald-400">&lt;35%</span>.
            </p>
            {kpi.allLossRatio !== undefined && kpi.allLossRatio !== null && (
              <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 font-semibold" title="Rasio seluruh klaim (MM + Non-MM) terhadap premi MM saat ini">
                  ALL LR (MM + Non-MM):
                </span>
                <span className="font-mono font-black text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300/80 dark:border-slate-700">
                  {kpi.allLossRatio.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Net Underwriting Margin MM */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isPersonal ? 'Net Margin Personal' : isGroup ? 'Net Margin Group' : 'Net Margin Underwriting MM'}
            </span>
            {isPersonal && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                Personal
              </span>
            )}
            {isGroup && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60">
                Group
              </span>
            )}
          </div>
          <span className={`p-2 rounded-xl ${kpi.netMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'}`}>
            <Scale className="w-5 h-5" />
          </span>
        </div>
        <div className="mt-3">
          <div className={`text-2xl font-extrabold tracking-tight ${kpi.netMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {formatIDR(kpi.netMargin)}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Komisi: {formatIDR(kpi.totalKomisi)}</span>
            <span className={kpi.netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
              {kpi.netMargin >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
