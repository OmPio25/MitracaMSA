'use client';

import { useState, useMemo, useEffect } from 'react';
import { HierarchyNode } from '@/app/api/hierarchy/route';
import { HierarchyNodeCard } from './hierarchy-node-card';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface HierarchyTreeViewProps {
  tree: HierarchyNode[];
  onSelectAgent: (agentCode: string) => void;
  onExportXlsx?: () => void;
  onExportPdf?: () => void;
  isExportingXlsx?: boolean;
  isExportingPdf?: boolean;
}

export function HierarchyTreeView({
  tree,
  onSelectAgent,
  onExportXlsx,
  onExportPdf,
  isExportingXlsx = false,
  isExportingPdf = false,
}: HierarchyTreeViewProps) {
  // Set of node codes that are expanded
  // Hanya buka root pertama secara default agar halaman tetap ringan dan cepat
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree.length > 0) {
      initial.add(tree[0].agentCode);
    }
    return initial;
  });

  useEffect(() => {
    if (tree.length > 0) {
      setExpandedNodes(new Set([tree[0].agentCode]));
    }
  }, [tree]);

  const [localSearch, setLocalSearch] = useState('');

  // Collect all agent codes recursively for Expand All
  const allNodeCodes = useMemo(() => {
    const codes: string[] = [];
    function collect(node: HierarchyNode) {
      codes.push(node.agentCode);
      if (node.children) {
        node.children.forEach(collect);
      }
    }
    tree.forEach(collect);
    return codes;
  }, [tree]);

  const handleExpandAll = () => {
    setExpandedNodes(new Set(allNodeCodes));
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

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

  // Recursive Tree Node Renderer
  const renderNode = (node: HierarchyNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.agentCode);
    const hasChildren = node.children && node.children.length > 0;

    // Filter check for local search
    const matchesSearch =
      !localSearch ||
      node.agentCode.toLowerCase().includes(localSearch.toLowerCase()) ||
      node.name.toLowerCase().includes(localSearch.toLowerCase()) ||
      (node.peringkat && node.peringkat.toLowerCase().includes(localSearch.toLowerCase()));

    return (
      <div key={node.id} className="relative mt-3">
        <div className={matchesSearch ? '' : 'opacity-40'}>
          <HierarchyNodeCard
            node={node}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleNode(node.agentCode)}
            onSelectAgent={onSelectAgent}
            level={level}
          />
        </div>

        {/* Children Subtree */}
        {hasChildren && isExpanded && (
          <div className="relative pl-6 sm:pl-8 ml-4 sm:ml-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-3 mt-3 before:absolute before:top-0 before:bottom-0 before:left-[-2px] before:w-0.5 before:bg-blue-300 dark:before:bg-blue-600">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!tree || tree.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Tidak ada data agen yang sesuai dengan kriteria filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-toolbar: Search & Expand/Collapse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Cari dalam hasil (kode/nama/jabatan)..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExpandAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            Buka Semua Cabang
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
            Tutup Semua Cabang
          </button>

          {(onExportXlsx || onExportPdf) && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 ml-1">
              {onExportXlsx && (
                <button
                  type="button"
                  onClick={onExportXlsx}
                  disabled={isExportingXlsx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition cursor-pointer disabled:opacity-50"
                  title="Export Hirarki ke Excel (.xlsx)"
                >
                  {isExportingXlsx ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Excel</span>
                </button>
              )}

              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  disabled={isExportingPdf}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition cursor-pointer disabled:opacity-50"
                  title="Export Hirarki ke PDF (.pdf)"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>PDF</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nodes List */}
      <div className="space-y-3">
        {tree.map((rootNode) => renderNode(rootNode, 0))}
      </div>
    </div>
  );
}
