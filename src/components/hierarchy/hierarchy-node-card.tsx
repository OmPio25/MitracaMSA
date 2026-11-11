'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, User, ShieldAlert, Award, Building, DollarSign, FileText, ArrowRight } from 'lucide-react';
import { HierarchyNode } from '@/app/api/hierarchy/route';

interface HierarchyNodeCardProps {
  node: HierarchyNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectAgent: (agentCode: string) => void;
  level: number;
}

export function HierarchyNodeCard({
  node,
  isExpanded,
  onToggleExpand,
  onSelectAgent,
  level,
}: HierarchyNodeCardProps) {
  const hasChildren = node.children && node.children.length > 0;

  // Format currency IDR
  const formatIDR = (valStr: string) => {
    const num = parseFloat(valStr || '0');
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusBadge = () => {
    switch (node.uplineStatus) {
      case 'ROOT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Root Agensi
          </span>
        );
      case 'LINKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Terhubung
          </span>
        );
      case 'PENDING_UPLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Pending Upline: {node.uplineAgentCode || 'N/A'}
          </span>
        );
      case 'UNREGISTERED_IN_MASTER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            Unregistered in Master
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusKeagenanBadge = () => {
    if (!node.statusKeagenan) return null;
    const s = node.statusKeagenan.trim().toUpperCase();

    if (s === 'AKTIF') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Aktif
        </span>
      );
    }

    if (s === 'CUT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          Cut
        </span>
      );
    }

    if (s === 'TIDAK AKTIF') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Tidak Aktif
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {node.statusKeagenan}
      </span>
    );
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-150 shadow-sm ${
        node.uplineStatus === 'PENDING_UPLINE'
          ? 'bg-amber-50/40 border-amber-300'
          : node.uplineStatus === 'UNREGISTERED_IN_MASTER'
          ? 'bg-rose-50/40 border-rose-300'
          : level === 0
          ? 'bg-white border-blue-300 ring-1 ring-blue-200'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-4">
        {/* Top Header: Status, Collapse Trigger, Drilldown */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge()}
            {getStatusKeagenanBadge()}
            {node.peringkat && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                <Award className="w-3 h-3 text-slate-500" />
                {node.peringkat}
              </span>
            )}
            {node.rawBranchName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                <Building className="w-3 h-3 text-slate-500" />
                {node.rawBranchName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasChildren && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title={isExpanded ? 'Tutup Cabang' : 'Buka Cabang'}
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                    <span>Tutup</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <span>Buka ({node.children.length})</span>
                  </>
                )}
              </button>
            )}

            {level > 0 && (
              <button
                type="button"
                onClick={() => onSelectAgent(node.agentCode)}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition"
                title="Jadikan Root Hirarki"
              >
                <span>Fokus</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Agent Info: Code & Name */}
        <div className="mt-2.5 flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              node.uplineStatus === 'PENDING_UPLINE'
                ? 'bg-amber-100 text-amber-800'
                : node.uplineStatus === 'UNREGISTERED_IN_MASTER'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            <User className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
                {node.agentCode}
              </span>
              <span className="text-slate-400">·</span>
              <h3 className="text-sm font-semibold text-slate-900 truncate">
                {node.name}
              </h3>
            </div>

            {/* Metrics Row */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Status Keagenan
                </span>
                <span
                  className={`font-bold ${
                    node.statusKeagenan?.trim().toUpperCase() === 'CUT'
                      ? 'text-rose-600'
                      : node.statusKeagenan?.trim().toUpperCase() === 'AKTIF'
                      ? 'text-emerald-700'
                      : 'text-slate-800'
                  }`}
                >
                  {node.statusKeagenan || '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Total Produksi
                </span>
                <span className="font-bold text-slate-900">
                  {formatIDR(node.totalProduction)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Polis Aktif
                </span>
                <span className="font-bold text-slate-900">
                  {node.policyCount} polis
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Total Downline
                </span>
                <span className="font-bold text-blue-600">
                  {node.downlinesCount} agen
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Callout for Problematic status */}
        {node.uplineStatus === 'PENDING_UPLINE' && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-100/70 border border-amber-200 text-xs text-amber-900">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Menunggu Pendaftaran Upline ({node.uplineAgentCode})
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Agen ini telah tersimpan aman dengan referensi upline{' '}
              <span className="font-mono font-bold">{node.uplineAgentCode}</span>. Saat upline
              diunggah pada batch selanjutnya, sistem self-healing akan otomatis menautkan
              hirarkinya tanpa perlu upload ulang.
            </p>
          </div>
        )}

        {node.uplineStatus === 'UNREGISTERED_IN_MASTER' && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-100/70 border border-rose-200 text-xs text-rose-900">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              Auto-Provisioned dari Unggahan Transaksi
            </p>
            <p className="text-[11px] text-rose-800 mt-0.5">
              Agen dibuat otomatis sebagai placeholder saat mengunggah Produksi/Klaim agar nominal
              premi atau klaim tidak hilang. Harap lengkapi profil melalui unggahan Data Master
              Agen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
