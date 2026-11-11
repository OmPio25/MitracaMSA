'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Download, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Info,
  Sparkles,
} from 'lucide-react';

interface UploadResult {
  detectedType: string;
  totalRows: number;
  successRows: number;
  warningRows: number;
  failedRows: number;
  status: string;
  batchId: string;
  smartMapping?: {
    mappedCount: number;
    fallbackCount: number;
    unmappedCount: number;
    columnMapping: Record<string, string>;
    fallbackColumns: Record<string, string>;
    unmappedColumns: string[];
  };
  warningDetails?: {
    pendingUplinesCount: number;
    unregisteredAgentsCount: number;
    sampleCodes: string[];
    explanation: string;
  };
}

interface ProgressInfo {
  totalRows: number;
  processedRows: number;
  successRows: number;
  skippedRows: number;
  warningRows: number;
  failedRows: number;
}

export function UploadZoneWithTemplates() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template download trigger
  const handleDownloadTemplate = (type: 'DATA_AGENT' | 'MASTER_PRODUKSI' | 'MASTER_CLAIM') => {
    window.open(`/api/upload/template?type=${type}`, '_blank');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    setIsUploading(true);
    setProgress(null);
    setResult(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    // Live progress polling while uploading
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/upload');
        if (res.ok) {
          const data = await res.json();
          if (data.batch && data.active) {
            setProgress({
              totalRows: data.batch.totalRows,
              processedRows: data.batch.processedRows,
              successRows: data.batch.successRows,
              skippedRows: data.batch.skippedRows,
              warningRows: data.batch.warningRows,
              failedRows: data.batch.failedRows,
            });
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 800);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses file.');
      }

      setResult(json.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat upload.');
    } finally {
      clearInterval(pollInterval);
      setIsUploading(false);
      setProgress(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-6">
      {/* ── Section 1: Template Downloads ────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Format Upload Sesuai Data Sumber
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Unduh format file Excel dengan nama kolom fixed yang telah distandarisasi untuk sistem.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Card 1: DataAgent */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                <FileSpreadsheet className="h-5 w-5" />
                <span>1. DataAgent.xlsx</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                Header: KODEAGEN, NAMAAGEN, NAMACABANG, PROFID, STATUSKEAGENAN, KodeUpline, PERINGKAT.
              </p>
            </div>
            <button
              onClick={() => handleDownloadTemplate('DATA_AGENT')}
              className="mt-4 inline-flex items-center justify-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 py-2 px-3 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>

          {/* Card 2: MasterProduksi */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <FileSpreadsheet className="h-5 w-5" />
                <span>2. MasterProduksi.xlsx</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                Header: Bulan, Policy No, Nilai Premi, TSI, Object Information 1..15, dll.
              </p>
            </div>
            <button
              onClick={() => handleDownloadTemplate('MASTER_PRODUKSI')}
              className="mt-4 inline-flex items-center justify-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 py-2 px-3 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>

          {/* Card 3: MasterClaim */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm">
                <FileSpreadsheet className="h-5 w-5" />
                <span>3. MasterClaim.xlsx</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                Header: Agent ID, Claim No, Policy No, Gross Claim, Date Of Settlement, dll.
              </p>
            </div>
            <button
              onClick={() => handleDownloadTemplate('MASTER_CLAIM')}
              className="mt-4 inline-flex items-center justify-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 py-2 px-3 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: Drag & Drop Ingestion ─────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
          Upload File (Auto-Detect & Auto-Mapping Database)
        </h3>
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40'
          } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto py-2">
              <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="w-full text-center space-y-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {progress && progress.processedRows > 0
                    ? `Memproses data: ${progress.processedRows.toLocaleString('id-ID')} baris...`
                    : 'Mempersiapkan data dan memuat validasi sistem...'}
                </p>

                {/* Live Progress Bar with Animated Pulse */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: progress && progress.totalRows > 0
                        ? `${Math.max(5, Math.min(100, Math.round((progress.processedRows / progress.totalRows) * 100)))}%`
                        : '30%',
                    }}
                  />
                </div>

                {progress && progress.processedRows > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      Sukses: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{progress.successRows.toLocaleString('id-ID')}</strong>
                    </span>
                    {progress.skippedRows > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                        Duplikat: <strong className="text-amber-700 dark:text-amber-400 font-semibold">{progress.skippedRows.toLocaleString('id-ID')}</strong>
                      </span>
                    )}
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {progress.processedRows.toLocaleString('id-ID')} baris
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                <UploadCloud className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Tarik & lepas file Excel di sini, atau klik untuk memilih
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sistem otomatis mendeteksi apakah file adalah DataAgent, MasterProduksi, atau MasterClaim.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Result & Contextual Feedback ──────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-800 dark:text-red-300 text-sm">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Upload Ditolak:</span> {errorMessage}
          </div>
        </div>
      )}

      {result && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Auto-Mapping Berhasil: {result.detectedType}
              </span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              result.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
            }`}>
              Status: {result.status}
            </span>
          </div>

          {/* Smart Dynamic Mapping Highlights */}
          {result.smartMapping && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Smart Dynamic Mapping:</strong> {result.smartMapping.mappedCount} kolom berhasil dipetakan secara otomatis.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-blue-800 dark:text-blue-300">
                {result.smartMapping.fallbackCount > 0 && (
                  <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-semibold">
                    Fallback Periode Aktif
                  </span>
                )}
                {result.smartMapping.unmappedCount > 0 && (
                  <span
                    className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-semibold"
                    title={`Kolom ekstra tersimpan ke metadata: ${result.smartMapping.unmappedColumns.join(', ')}`}
                  >
                    +{result.smartMapping.unmappedCount} Kolom Ekstra Diamankan di JSONB
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Baris</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{result.totalRows}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Berhasil Utuh</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{result.successRows}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50">
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {result.detectedType === 'DATA_AGENT' ? 'Pending Upline' : 'Auto-Provision Agent'}
              </div>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{result.warningRows}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
              <div className="text-xs text-red-600 dark:text-red-400">Gagal Validasi</div>
              <div className="text-lg font-bold text-red-700 dark:text-red-300">{result.failedRows}</div>
            </div>
          </div>

          {/* Contextual Explanation Card based on exact Template Type */}
          {result.warningRows > 0 && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {result.detectedType === 'DATA_AGENT'
                    ? 'Pemberitahuan Self-Healing (Kode Upline Belum Ada):'
                    : 'Pemberitahuan Auto-Provisioning (Agent ID Belum Terdaftar di Master):'}
                </span>
              </div>
              
              <p className="leading-relaxed">
                {result.warningDetails?.explanation || (
                  result.detectedType === 'DATA_AGENT'
                    ? `Terdapat ${result.warningRows} agen dengan Kode Upline yang belum terdaftar di database. Data agen tetap tersimpan aman (PENDING_UPLINE) dan akan otomatis terhubung saat file upline diunggah.`
                    : `Terdapat ${result.warningRows} baris transaksi dengan Agent ID yang belum terdaftar di Master Agen. Sesuai Core Business Rule, sistem otomatis membuatkan agen placeholder (UNREGISTERED_IN_MASTER) agar SELURUH PREMI DAN NOMOR POLIS TIDAK HILANG.`
                )}
              </p>

              {result.warningDetails?.sampleCodes && result.warningDetails.sampleCodes.length > 0 && (
                <div className="pt-1 flex items-center gap-2 text-slate-700">
                  <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>
                    Contoh ID terkait: <strong>{result.warningDetails.sampleCodes.join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
