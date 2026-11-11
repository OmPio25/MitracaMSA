'use client';

import { useState, useRef, useEffect } from 'react';
import { HierarchyNode } from '@/app/api/hierarchy/route';
import {
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User,
  ShieldAlert,
  Award,
  Building,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface HierarchyOrgChartProps {
  tree: HierarchyNode[];
  onSelectAgent: (agentCode: string) => void;
  onExportXlsx?: () => void;
  onExportPdf?: () => void;
  isExportingXlsx?: boolean;
  isExportingPdf?: boolean;
}

export function HierarchyOrgChart({
  tree,
  onSelectAgent,
  onExportXlsx,
  onExportPdf,
  isExportingXlsx = false,
  isExportingPdf = false,
}: HierarchyOrgChartProps) {
  // Zoom state: 0.6 to 1.3
  const [zoom, setZoom] = useState(0.9);

  // Indeks root agensi yang sedang aktif ditampilkan (jika ada beberapa root di cabang / nasional)
  const [activeRootIndex, setActiveRootIndex] = useState(0);

  // Set of expanded agent codes.
  // CRITICAL REQUIREMENT: "tidak otomatis open full chart all level"
  // Default: only open root node (level 0), deeper levels remain closed until user clicks [+]
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree.length > 0) {
      initial.add(tree[0].agentCode);
    }
    return initial;
  });

  // Saat tree berganti, reset root aktif ke #0 dan hanya expand root pertama
  useEffect(() => {
    setActiveRootIndex(0);
    if (tree.length > 0) {
      setExpandedNodes(new Set([tree[0].agentCode]));
    }
  }, [tree]);

  const activeRoot = tree[activeRootIndex] || tree[0];

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const toggleNode = (code: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleOpenLevel1Only = () => {
    if (activeRoot) {
      setExpandedNodes(new Set([activeRoot.agentCode]));
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))));
  const handleZoomReset = () => setZoom(0.9);

  // Format currency IDR
  const formatIDR = (valStr: string) => {
    const num = parseFloat(valStr || '0');
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Status Keagenan Badge
  const renderStatusKeagenan = (node: HierarchyNode) => {
    if (!node.statusKeagenan) return null;
    const s = node.statusKeagenan.trim().toUpperCase();

    if (s === 'AKTIF') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Aktif
        </span>
      );
    }

    if (s === 'CUT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          Cut
        </span>
      );
    }

    if (s === 'TIDAK AKTIF') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Tidak Aktif
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {node.statusKeagenan}
      </span>
    );
  };

  // Org Chart Node Box
  const renderOrgCard = (node: HierarchyNode, level: number) => {
    const isExpanded = expandedNodes.has(node.agentCode);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div
        className={`w-64 bg-white dark:bg-slate-900 rounded-xl shadow-md border transition-all duration-150 text-left relative z-10 flex flex-col justify-between ${
          node.uplineStatus === 'PENDING_UPLINE'
            ? 'border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-300 dark:ring-amber-900/40 bg-amber-50/20 dark:bg-amber-950/20'
            : node.uplineStatus === 'UNREGISTERED_IN_MASTER'
            ? 'border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-300 dark:ring-rose-900/40 bg-rose-50/20 dark:bg-rose-950/20'
            : level === 0
            ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 dark:ring-blue-900/40 shadow-blue-100 dark:shadow-none'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="p-3.5 space-y-2">
          {/* Top badges: Upline Status & Status Keagenan */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {node.uplineStatus === 'ROOT' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Root Agensi
                </span>
              ) : node.uplineStatus === 'PENDING_UPLINE' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Pending Upline
                </span>
              ) : node.uplineStatus === 'UNREGISTERED_IN_MASTER' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  Unregistered
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Terhubung
                </span>
              )}

              {renderStatusKeagenan(node)}
            </div>

            {level > 0 && (
              <button
                type="button"
                onClick={() => onSelectAgent(node.agentCode)}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition"
                title="Pusatkan bagan ke agen ini"
              >
                <span>Fokus</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Agent Code & Name */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                {node.agentCode}
              </span>
              <span className="text-slate-400 dark:text-slate-600">·</span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {node.peringkat || 'Agen'}
              </span>
            </div>
            <h4
              className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate"
              title={node.name}
            >
              {node.name}
            </h4>
            {node.rawBranchName && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <Building className="w-2.5 h-2.5 shrink-0" />
                {node.rawBranchName}
              </p>
            )}
          </div>

          {/* Mini KPI row */}
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
            <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded">
              <span className="text-slate-500 dark:text-slate-400 block">Premi</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                {formatIDR(node.totalProduction)}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded">
              <span className="text-slate-500 dark:text-slate-400 block">Downlines</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 block">
                {node.downlinesCount} agen
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Trigger Footer */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggleNode(node.agentCode)}
            className={`w-full py-1.5 px-3 text-center text-[11px] font-bold rounded-b-xl border-t transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isExpanded
                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm'
            }`}
          >
            {isExpanded ? (
              <>
                <Minus className="w-3 h-3" />
                <span>Tutup Downline ({node.children.length})</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>Buka {node.children.length} Downline</span>
              </>
            )}
          </button>
        ) : (
          <div className="py-1 px-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-950/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800">
            Tanpa Downline
          </div>
        )}
      </div>
    );
  };

  // Recursive Tree Structure
  const renderSubtree = (node: HierarchyNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.agentCode);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <li key={node.id}>
        {renderOrgCard(node, level)}

        {/* Render children only when user has expanded this node */}
        {hasChildren && isExpanded && (
          <ul>
            {node.children.map((child) => renderSubtree(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (!tree || tree.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Tidak ada data agen yang dapat ditampilkan dalam bagan organisasi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Org Chart Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kontrol Bagan:</span>
          <button
            type="button"
            onClick={handleOpenLevel1Only}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
          >
            Level 1 Saja (Default)
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Tutup Semua
          </button>
        </div>

        {/* Zoom & Export Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Export buttons */}
          {(onExportXlsx || onExportPdf) && (
            <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
              {onExportXlsx && (
                <button
                  type="button"
                  onClick={onExportXlsx}
                  disabled={isExportingXlsx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer disabled:opacity-50"
                  title="Export Hirarki ke Excel (.xlsx)"
                >
                  {isExportingXlsx ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>Excel</span>
                </button>
              )}

              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  disabled={isExportingPdf}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition cursor-pointer disabled:opacity-50"
                  title="Export Hirarki ke PDF (.pdf)"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-rose-600 dark:text-rose-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>PDF</span>
                </button>
              )}
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Skala: {Math.round(zoom * 100)}%</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-1 text-[11px] font-bold hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Reset Skala 100%"
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                100%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multiple Roots Switcher Toolbar (saat melihat cabang atau daftar multi-root) */}
      {tree.length > 1 && activeRoot && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/90 dark:border-blue-800/80 rounded-xl p-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shrink-0">
                Pohon #{activeRootIndex + 1}
              </span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                  <span className="truncate">{activeRoot.name}</span>
                  <span className="font-mono text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-700 shrink-0">
                    {activeRoot.agentCode}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Menampilkan 1 dari {tree.length} pohon root di filter ini · <span className="font-semibold text-blue-700 dark:text-blue-400">{activeRoot.downlinesCount} downlines</span>
                </p>
              </div>
            </div>

            {/* Dropdown Selector & Navigation Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={activeRootIndex === 0}
                onClick={() => {
                  const newIdx = Math.max(0, activeRootIndex - 1);
                  setActiveRootIndex(newIdx);
                  setExpandedNodes(new Set([tree[newIdx].agentCode]));
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 transition cursor-pointer"
              >
                ← Sebelumnya
              </button>

              <select
                value={activeRootIndex}
                onChange={(e) => {
                  const newIdx = Number(e.target.value);
                  setActiveRootIndex(newIdx);
                  setExpandedNodes(new Set([tree[newIdx].agentCode]));
                }}
                className="px-2.5 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[220px] sm:max-w-[280px] truncate"
              >
                {tree.map((r, idx) => (
                  <option key={r.id || r.agentCode} value={idx}>
                    #{idx + 1} - {r.agentCode} {r.name} ({r.downlinesCount} dl)
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={activeRootIndex >= tree.length - 1}
                onClick={() => {
                  const newIdx = Math.min(tree.length - 1, activeRootIndex + 1);
                  setActiveRootIndex(newIdx);
                  setExpandedNodes(new Set([tree[newIdx].agentCode]));
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 transition cursor-pointer"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Org Chart Canvas (Scrollable Horizontal & Vertical) */}
      <div
        ref={chartContainerRef}
        className="w-full overflow-x-auto overflow-y-auto bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 min-h-[500px] shadow-inner bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]"
      >
        <div
          className="org-tree transition-transform duration-200 origin-top"
          style={{ transform: `scale(${zoom})` }}
        >
          <ul>
            {activeRoot ? renderSubtree(activeRoot, 0) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
