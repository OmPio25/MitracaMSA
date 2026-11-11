'use client';

import React, { useState } from 'react';
import { TrendingUp, PieChart as PieChartIcon, Layers, Info } from 'lucide-react';
import { LossRatioBadgeInfo, formatMonthYearLabel } from '@/lib/analytics/loss-ratio';

interface MonthlyItem {
  month: string;
  premi: number;
  claim: number;
  lossRatio: number | null;
  lossRatioEval: LossRatioBadgeInfo;
}

interface ProductItem {
  product: string;
  premi: number;
  policyCount: number;
  claim: number;
  claimCount: number;
  lossRatio: number | null;
  lossRatioEval: LossRatioBadgeInfo;
}

interface AnalyticsChartsProps {
  monthlyTrend: MonthlyItem[];
  productBreakdown: ProductItem[];
}

const PALETTE = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Blue-violet
  '#64748b', // Slate
];

export function AnalyticsCharts({ monthlyTrend, productBreakdown }: AnalyticsChartsProps) {
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [hoveredProductIndex, setHoveredProductIndex] = useState<number | null>(null);

  const formatIDRCompact = (val: number) => {
    if (val >= 1_000_000_000_000) return `Rp ${(val / 1_000_000_000_000).toFixed(1)} T`;
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)} M`;
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)} Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const formatIDRFull = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Dual Line Chart Calculations (SVG)
  // ───────────────────────────────────────────────────────────────────────────
  const chartW = 600;
  const chartH = 240;
  const padLeft = 65;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxVal = Math.max(
    ...monthlyTrend.map((m) => Math.max(m.premi, m.claim)),
    1_000_000
  );

  const getY = (val: number) => padTop + plotH - (val / maxVal) * plotH;
  const getX = (index: number) => {
    if (monthlyTrend.length <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (monthlyTrend.length - 1)) * plotW;
  };

  const premiPoints = monthlyTrend.map((m, i) => `${getX(i)},${getY(m.premi)}`).join(' ');
  const claimPoints = monthlyTrend.map((m, i) => `${getX(i)},${getY(m.claim)}`).join(' ');

  // Gradient area closed paths
  const premiAreaPath =
    monthlyTrend.length > 0
      ? `M ${getX(0)},${padTop + plotH} ` +
        monthlyTrend.map((m, i) => `L ${getX(i)},${getY(m.premi)}`).join(' ') +
        ` L ${getX(monthlyTrend.length - 1)},${padTop + plotH} Z`
      : '';

  const claimAreaPath =
    monthlyTrend.length > 0
      ? `M ${getX(0)},${padTop + plotH} ` +
        monthlyTrend.map((m, i) => `L ${getX(i)},${getY(m.claim)}`).join(' ') +
        ` L ${getX(monthlyTrend.length - 1)},${padTop + plotH} Z`
      : '';

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Pie / Donut Chart Calculations (SVG)
  // ───────────────────────────────────────────────────────────────────────────
  const totalProductPremi = productBreakdown.reduce((sum, p) => sum + p.premi, 0);
  const pieCx = 120;
  const pieCy = 120;
  const pieRadius = 90;
  const donutInner = 52;

  let currentAngle = -Math.PI / 2;
  const pieSlices = productBreakdown.map((prod, index) => {
    const fraction = totalProductPremi > 0 ? prod.premi / totalProductPremi : 1 / (productBreakdown.length || 1);
    const angleSize = fraction * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSize;
    currentAngle = endAngle;

    const x1 = pieCx + pieRadius * Math.cos(startAngle);
    const y1 = pieCy + pieRadius * Math.sin(startAngle);
    const x2 = pieCx + pieRadius * Math.cos(endAngle);
    const y2 = pieCy + pieRadius * Math.sin(endAngle);

    const ix1 = pieCx + donutInner * Math.cos(endAngle);
    const iy1 = pieCy + donutInner * Math.sin(endAngle);
    const ix2 = pieCx + donutInner * Math.cos(startAngle);
    const iy2 = pieCy + donutInner * Math.sin(startAngle);

    const largeArcFlag = angleSize > Math.PI ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${pieRadius} ${pieRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${donutInner} ${donutInner} 0 ${largeArcFlag} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    const color = PALETTE[index % PALETTE.length];
    const pctShare = (fraction * 100).toFixed(1);

    return {
      index,
      product: prod,
      pathData,
      color,
      pctShare,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* ─────────────────────────────────────────────────────────────────────
          1. Grafik Tren Bulanan: Dual Line Chart (Premi MM vs Klaim MM)
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm relative flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Tren Bulanan: Premi MM vs Klaim MM</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Dual Line Chart pergerakan transaksi MM (Non-MM dikecualikan)</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                <span className="w-3 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                Premi MM
              </span>
              <span className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                <span className="w-3 h-1 bg-rose-600 dark:bg-rose-400 rounded-full" />
                Klaim MM
              </span>
            </div>
          </div>

          {monthlyTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Tidak ada data transaksi bulanan pada rentang filter ini.
            </div>
          ) : (
            <div className="mt-4 relative">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible select-none">
                <defs>
                  {/* Gradient Fill Premi */}
                  <linearGradient id="premiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
                  </linearGradient>
                  {/* Gradient Fill Klaim */}
                  <linearGradient id="claimGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines & Y-Axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const val = maxVal * ratio;
                  const y = padTop + plotH - ratio * plotH;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={padLeft + plotW}
                        y2={y}
                        stroke="currentColor"
                        className="stroke-slate-200 dark:stroke-slate-800"
                        strokeDasharray={ratio === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill="currentColor"
                        className="font-mono fill-slate-500 dark:fill-slate-400"
                      >
                        {formatIDRCompact(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area Fills */}
                <path d={premiAreaPath} fill="url(#premiGrad)" />
                <path d={claimAreaPath} fill="url(#claimGrad)" />

                {/* Lines */}
                <polyline
                  points={premiPoints}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={claimPoints}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points on Line */}
                {monthlyTrend.map((m, i) => {
                  const x = getX(i);
                  const yPremi = getY(m.premi);
                  const yClaim = getY(m.claim);
                  const isHovered = hoveredMonthIndex === i;

                  return (
                    <g key={m.month}>
                      {/* Vertical indicator guideline when hovered */}
                      {isHovered && (
                        <line
                          x1={x}
                          y1={padTop}
                          x2={x}
                          y2={padTop + plotH}
                          stroke="#94a3b8"
                          strokeDasharray="2 2"
                          strokeWidth="1"
                        />
                      )}

                      {/* Premi Point */}
                      <circle
                        cx={x}
                        cy={yPremi}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredMonthIndex(i)}
                      />

                      {/* Claim Point */}
                      <circle
                        cx={x}
                        cy={yClaim}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#e11d48"
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredMonthIndex(i)}
                      />

                      {/* X Axis Month Label */}
                      <text
                        x={x}
                        y={padTop + plotH + 16}
                        textAnchor="middle"
                        fontSize="9"
                        fill="currentColor"
                        className={`cursor-pointer font-medium ${
                          isHovered
                            ? 'fill-slate-900 dark:fill-slate-100 font-bold'
                            : 'fill-slate-500 dark:fill-slate-400'
                        }`}
                        onMouseEnter={() => setHoveredMonthIndex(i)}
                      >
                        {formatMonthYearLabel(m.month)}
                      </text>

                      {/* Transparent Hover Target Bar */}
                      <rect
                        x={x - plotW / (monthlyTrend.length * 2)}
                        y={padTop}
                        width={plotW / monthlyTrend.length}
                        height={plotH + padBottom}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredMonthIndex(i)}
                        onMouseLeave={() => setHoveredMonthIndex(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip when Hovering a Month */}
              {hoveredMonthIndex !== null && monthlyTrend[hoveredMonthIndex] && (
                <div
                  className="absolute pointer-events-none bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs z-30 transition-all border border-slate-700 backdrop-blur-xs min-w-[200px]"
                  style={{
                    left: `${Math.min(
                      Math.max(getX(hoveredMonthIndex) / (chartW / 100), 20),
                      80
                    )}%`,
                    top: '10px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="font-extrabold text-sm pb-1.5 border-b border-slate-700/80 mb-2 flex items-center justify-between">
                    <span>Periode {formatMonthYearLabel(monthlyTrend[hoveredMonthIndex].month)}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${monthlyTrend[hoveredMonthIndex].lossRatioEval.badgeClass}`}
                    >
                      LR: {monthlyTrend[hoveredMonthIndex].lossRatioEval.ratioFormatted}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-blue-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Premi MM:
                      </span>
                      <strong className="font-mono text-white">
                        {formatIDRFull(monthlyTrend[hoveredMonthIndex].premi)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        Klaim MM:
                      </span>
                      <strong className="font-mono text-rose-200">
                        {formatIDRFull(monthlyTrend[hoveredMonthIndex].claim)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-2">
          <span>Arahkan kursor pada titik grafik untuk rincian bulan.</span>
          <span className="font-medium text-slate-500 dark:text-slate-400">Mitraca Ingestion Engine</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          2. Distribusi Kinerja Produk: Donut / Pie Chart Interaktif
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm relative flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                <PieChartIcon className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Distribusi Kinerja Lini Produk (Donut Chart)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pangsa premi & perbandingan loss ratio produk MM</p>
              </div>
            </div>
          </div>

          {productBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
              Tidak ada data produk pada periode ini.
            </div>
          ) : (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
              {/* SVG Donut */}
              <div className="relative shrink-0 w-[240px] h-[240px] flex items-center justify-center">
                <svg
                  viewBox="0 0 240 240"
                  className="w-full h-full transform -rotate-90 select-none overflow-visible"
                >
                  {pieSlices.map((slice) => {
                    const isHovered = hoveredProductIndex === slice.index;
                    return (
                      <path
                        key={slice.index}
                        d={slice.pathData}
                        fill={slice.color}
                        stroke="currentColor"
                        className="text-white dark:text-slate-900 transition-all duration-200 cursor-pointer hover:opacity-90"
                        strokeWidth={isHovered ? 3 : 1.5}
                        style={{
                          transformOrigin: `${pieCx}px ${pieCy}px`,
                          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        }}
                        onMouseEnter={() => setHoveredProductIndex(slice.index)}
                        onMouseLeave={() => setHoveredProductIndex(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Premi MM</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                    {formatIDRCompact(totalProductPremi)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {productBreakdown.length} Lini Produk
                  </span>
                </div>

                {/* Floating Tooltip for Hovered Slice */}
                {hoveredProductIndex !== null && productBreakdown[hoveredProductIndex] && (
                  <div className="absolute -bottom-2 sm:bottom-auto sm:-right-4 pointer-events-none bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs z-30 transition-all border border-slate-700 min-w-[210px] backdrop-blur-xs">
                    <div className="font-bold text-xs pb-1.5 border-b border-slate-700 mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate max-w-[140px]">
                        {productBreakdown[hoveredProductIndex].product}
                      </span>
                      <span className="font-mono text-cyan-300">
                        {pieSlices[hoveredProductIndex]?.pctShare}%
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Premi MM:</span>
                        <span className="font-mono font-bold text-white">
                          {formatIDRFull(productBreakdown[hoveredProductIndex].premi)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Klaim MM:</span>
                        <span className="font-mono font-bold text-rose-300">
                          {formatIDRFull(productBreakdown[hoveredProductIndex].claim)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Loss Ratio:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[10px] border ${productBreakdown[hoveredProductIndex].lossRatioEval.badgeClass}`}
                        >
                          {productBreakdown[hoveredProductIndex].lossRatioEval.ratioFormatted}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Legend List */}
              <div className="flex-1 w-full max-h-60 overflow-y-auto pr-1 space-y-1.5 text-xs">
                {productBreakdown.map((prod, idx) => {
                  const slice = pieSlices[idx];
                  const isHovered = hoveredProductIndex === idx;

                  return (
                    <div
                      key={prod.product}
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isHovered
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-xs'
                          : 'bg-white dark:bg-slate-950/60 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                      onMouseEnter={() => setHoveredProductIndex(idx)}
                      onMouseLeave={() => setHoveredProductIndex(null)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: slice?.color || '#94a3b8' }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={prod.product}>
                            {prod.product}
                          </p>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {formatIDRCompact(prod.premi)} ({slice?.pctShare}%)
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${prod.lossRatioEval.badgeClass}`}
                        >
                          LR: {prod.lossRatioEval.ratioFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-2">
          <span>Arahkan kursor pada lingkaran pie untuk detail rincian produk.</span>
          <span className="font-medium text-slate-500 dark:text-slate-400">Mitraca Analytics</span>
        </div>
      </div>
    </div>
  );
}
