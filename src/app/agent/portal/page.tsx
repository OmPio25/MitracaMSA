'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { formatDate as normalizeDate, formatDateTime } from '@/lib/utils';
import { evaluateLossRatio } from '@/lib/analytics/loss-ratio';
import {
  UserCheck,
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Lock,
  Unlock,
  Power,
  Edit2,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Building2,
  Sparkles,
  TrendingUp,
  Layers,
  Search,
  X,
  Eye,
  EyeOff,
  Briefcase,
  Clock,
  Calendar,
  Award,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface AgentProfile {
  id: string;
  agentCode: string;
  name: string;
  profId?: string | null;
  peringkat: string;
  statusKeagenan: string;
  branchName: string;
  branchCode: string;
  uplineCode: string;
  uplineName: string;
  depth: number;
  createdAt: string;
}

interface AgentKPI {
  cutoffYear?: number;
  cutoffStartDate?: string;
  cutoffEndDate?: string;
  personalCutoffGrossPremium?: number;
  personalCutoffPolicyCount?: number;
  personalCutoffGrossClaim?: number;
  personalCutoffClaimCount?: number;
  personalCutoffLossRatio?: number;
  personalPolicyCount: number;
  personalGrossPremium: number;
  personalClaimCount: number;
  personalGrossClaim: number;
  personalLossRatio: number;
  directDownlinesCount: number;
  totalNetworkDownlinesCount: number;
  totalAssistants: number;
  activeAssistants: number;
}

interface AssistantItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  agentCode?: string | null;
  agentName?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
}

interface NationalKPI {
  totalAgents: number;
  activeAgents: number;
  totalAssistants: number;
  activeAssistants: number;
  agentsWithAssistants: number;
  nationalPolicyCount: number;
  nationalGrossPremium: number;
  nationalClaimCount: number;
  nationalGrossClaim: number;
  nationalLossRatio: number;
}

export default function AgentPortalPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [kpi, setKpi] = useState<AgentKPI | null>(null);
  const [nationalKPI, setNationalKPI] = useState<NationalKPI | null>(null);
  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [callerRole, setCallerRole] = useState<string>('');
  const [isNationalRole, setIsNationalRole] = useState(false);
  const [isBranchRole, setIsBranchRole] = useState(false);
  const [branchInfo, setBranchInfo] = useState<{ id: string; code: string; name: string } | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const isHubMode = isNationalRole || isBranchRole;

  // Tabs for National Scope (SUPERADMIN, ADMIN, AUDIT)
  const [activeTab, setActiveTab] = useState<'assistants' | 'inspect'>('assistants');

  // Agent Inspector State
  const [inspectedAgentId, setInspectedAgentId] = useState<string | null>(null);
  const [selectedAgentInfo, setSelectedAgentInfo] = useState<{
    id: string;
    agentCode: string;
    name: string;
    branchName: string;
  } | null>(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentSearchResults, setAgentSearchResults] = useState<Array<{
    id: string;
    agentCode: string;
    name: string;
    branchName: string;
    peringkat: string;
    statusKeagenan: string;
  }>>([]);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);

  // Parent Agent Picker (When Admin Adds Assistant)
  const [parentAgentSearchQuery, setParentAgentSearchQuery] = useState('');
  const [parentAgentResults, setParentAgentResults] = useState<Array<{
    id: string;
    agentCode: string;
    name: string;
    branchName: string;
  }>>([]);
  const [selectedParentAgent, setSelectedParentAgent] = useState<{
    id: string;
    agentCode: string;
    name: string;
    branchName: string;
  } | null>(null);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    isActive: true,
  });
  const [resetPwdData, setResetPwdData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const profileUrl = inspectedAgentId
        ? `/api/agent/profile?agentId=${inspectedAgentId}`
        : '/api/agent/profile';

      const assistantsUrl = inspectedAgentId && activeTab === 'inspect'
        ? `/api/agent/assistants?agentId=${inspectedAgentId}`
        : '/api/agent/assistants';

      const [resProfile, resAssistants] = await Promise.all([
        fetch(profileUrl),
        fetch(assistantsUrl),
      ]);

      const dataProfile = await resProfile.json();
      const dataAssistants = await resAssistants.json();

      if (!dataProfile.success) {
        throw new Error(dataProfile.error || 'Gagal memuat profil agen');
      }

      setCallerRole(dataProfile.callerRole);
      setIsNationalRole(Boolean(dataProfile.isNationalRole));
      setIsBranchRole(Boolean(dataProfile.isBranchRole));
      setIsReadOnly(Boolean(dataProfile.isReadOnly));
      setCanManage(Boolean(dataProfile.canManage));

      if (dataProfile.mode === 'NATIONAL_SUMMARY') {
        setNationalKPI(dataProfile.nationalKPI);
        setBranchInfo(null);
        setProfile(null);
        setKpi(null);
      } else if (dataProfile.mode === 'BRANCH_SUMMARY') {
        setBranchInfo(dataProfile.branch);
        setNationalKPI(dataProfile.branchKPI ? {
          totalAgents: dataProfile.branchKPI.totalAgents,
          activeAgents: dataProfile.branchKPI.activeAgents,
          totalAssistants: dataProfile.branchKPI.totalAssistants,
          activeAssistants: dataProfile.branchKPI.activeAssistants,
          agentsWithAssistants: dataProfile.branchKPI.agentsWithAssistants,
          nationalPolicyCount: dataProfile.branchKPI.branchPolicyCount,
          nationalGrossPremium: dataProfile.branchKPI.branchGrossPremium,
          nationalClaimCount: dataProfile.branchKPI.branchClaimCount,
          nationalGrossClaim: dataProfile.branchKPI.branchGrossClaim,
          nationalLossRatio: dataProfile.branchKPI.branchLossRatio,
        } : null);
        setProfile(null);
        setKpi(null);
      } else {
        setProfile(dataProfile.agent);
        setKpi(dataProfile.kpi);
      }

      if (dataAssistants.success) {
        setAssistants(dataAssistants.assistants || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [inspectedAgentId, activeTab]);

  // Helper copy to clipboard
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper format IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Helper format Date (Normalisasi dd-mm-yyyy)
  const formatDate = (dateStr?: string | null) => {
    return normalizeDate(dateStr);
  };

  // Helper render Peringkat Badge
  const renderPeringkatBadge = (rank?: string) => {
    const r = rank?.trim().toUpperCase();
    if (r === 'MANAGING PARTNER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-xs">
          <Award className="w-3 h-3 text-amber-400" />
          <span>Managing Partner</span>
        </span>
      );
    }
    if (r === 'EXECUTIVE PARTNER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-xs">
          <Sparkles className="w-3 h-3 text-purple-300" />
          <span>Executive Partner</span>
        </span>
      );
    }
    if (r === 'SENIOR PARTNER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-xs">
          <Award className="w-3 h-3 text-blue-300" />
          <span>Senior Partner</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs">
        <UserCheck className="w-3 h-3 text-teal-300" />
        <span>Partner</span>
      </span>
    );
  };

  // Helper render Status Keagenan Badge
  const renderStatusBadge = (status?: string) => {
    const s = status?.trim().toUpperCase();
    if (s === 'AKTIF') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>AKTIF</span>
        </span>
      );
    }
    if (s === 'CUT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/40">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>CUT</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>NON AKTIF</span>
      </span>
    );
  };

  // Handle Search Agent for Inspector
  const handleSearchAgent = async (val: string) => {
    setAgentSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setAgentSearchResults([]);
      return;
    }
    try {
      setIsSearchingAgent(true);
      const res = await fetch(`/api/agent/search?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      if (data.success) {
        setAgentSearchResults(data.agents || []);
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingAgent(false);
    }
  };

  const handleSelectAgentToInspect = (ag: { id: string; agentCode: string; name: string; branchName: string }) => {
    setSelectedAgentInfo(ag);
    setInspectedAgentId(ag.id);
    setAgentSearchResults([]);
    setAgentSearchQuery('');
  };

  const handleClearInspection = () => {
    setSelectedAgentInfo(null);
    setInspectedAgentId(null);
  };

  // Handle Search Parent Agent (for Modal Add Assistant by Admin)
  const handleSearchParentAgent = async (val: string) => {
    setParentAgentSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setParentAgentResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/agent/search?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      if (data.success) {
        setParentAgentResults(data.agents || []);
      }
    } catch {
      // ignore
    }
  };

  // Handle Add Assistant
  const handleAddAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('Konfirmasi password tidak cocok');
        setIsSubmitting(false);
        return;
      }

      if (isNationalRole && !selectedParentAgent && !profile?.id) {
        setErrorMsg('Pilih Agen Induk tempat asisten operasional ini ditugaskan.');
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, any> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      if (isNationalRole) {
        payload.parentAgentId = selectedParentAgent?.id || profile?.id;
      }

      const res = await fetch('/api/agent/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Gagal menambah asisten');
      }

      setSuccessMsg(resJson.message);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setSelectedParentAgent(null);
      setParentAgentSearchQuery('');
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menambah asisten');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Assistant
  const handleEditAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssistant) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/agent/assistants/${selectedAssistant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Gagal mengubah data asisten');
      }

      setSuccessMsg(resJson.message);
      setIsEditModalOpen(false);
      setSelectedAssistant(null);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengupdate asisten');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Password Assistant
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssistant) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (resetPwdData.password !== resetPwdData.confirmPassword) {
        setErrorMsg('Konfirmasi password baru tidak cocok');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`/api/agent/assistants/${selectedAssistant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPwdData.password }),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Gagal mereset password asisten');
      }

      setSuccessMsg(resJson.message);
      setIsResetPwdModalOpen(false);
      setSelectedAssistant(null);
      setResetPwdData({ password: '', confirmPassword: '' });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mereset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleStatus = async (assistant: AssistantItem) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/agent/assistants/${assistant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !assistant.isActive }),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Gagal mengubah status');
      }

      setSuccessMsg(
        assistant.isActive
          ? `Akun asisten '${assistant.name}' telah dinonaktifkan.`
          : `Akun asisten '${assistant.name}' berhasil diaktifkan kembali!`
      );
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah status asisten');
    }
  };

  // Handle Delete Assistant
  const handleDeleteAssistant = async () => {
    if (!selectedAssistant) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/agent/assistants/${selectedAssistant.id}`, {
        method: 'DELETE',
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Gagal menghapus asisten');
      }

      setSuccessMsg(resJson.message);
      setIsDeleteModalOpen(false);
      setSelectedAssistant(null);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menghapus asisten');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Branch list from current assistants
  const branchList = Array.from(
    new Set(assistants.map((a) => a.branchName).filter(Boolean))
  ).sort() as string[];

  // Filtered assistants
  const filteredAssistants = assistants.filter((a) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.phone && a.phone.toLowerCase().includes(q)) ||
      (a.agentName && a.agentName.toLowerCase().includes(q)) ||
      (a.agentCode && a.agentCode.toLowerCase().includes(q)) ||
      (a.branchName && a.branchName.toLowerCase().includes(q));

    const matchesBranch = branchFilter === 'ALL' || a.branchName === branchFilter;
    return matchesSearch && matchesBranch;
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">
          Memuat data Portal Mandiri Agen & Asisten...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── HEADER HALAMAN ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isHubMode ? 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400' : 'bg-blue-100/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {isNationalRole
                    ? 'Direktori & Pengawasan Keagenan Nasional'
                    : isBranchRole
                    ? `Direktori & Pengawasan Keagenan - Cabang ${branchInfo?.name || ''}`
                    : 'Portal Mandiri Agen & Asisten'}
                </h1>
                {isNationalRole && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>CAKUPAN NASIONAL</span>
                  </span>
                )}
                {isBranchRole && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>CAKUPAN CABANG: {branchInfo?.name?.toUpperCase() || 'CABANG'}</span>
                  </span>
                )}
                {isReadOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>{callerRole === 'AUDIT' ? 'AUDIT READ-ONLY' : 'PEMANTAUAN CABANG'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isNationalRole
                  ? 'Pusat pengawasan keagenan seluruh Indonesia, direktori asisten operasional (Officer Agent), dan inspeksi portal agen.'
                  : isBranchRole
                  ? `Pengawasan portofolio dan direktori asisten operasional (Officer Agent) khusus wilayah operasional Cabang ${branchInfo?.name || ''}.`
                  : 'Pusat kendali profil keagenan pribadi, monitoring portofolio personal, dan manajemen staf operasional (Officer Agent).'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* ── ALERTS ─────────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── BANNER KHUSUS ROLE OFFICER_AGENT ─────────────────────────────────── */}
      {callerRole === 'OFFICER_AGENT' && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">
              Anda Masuk sebagai Staf Asisten Resmi (Officer Agent)
            </p>
            <p className="text-amber-700 dark:text-amber-300/90 text-xs leading-relaxed">
              Anda memiliki hak akses penuh untuk memantau analitik performa, pohon hirarki jaringan, serta berkas polis & klaim atas nama agen pemilik. Manajemen penambahan atau penghapusan asisten dikelola langsung oleh Agen Pemilik.
            </p>
          </div>
        </div>
      )}

      {/* ── 4 KARTU KPI RINGKASAN (SUPERADMIN, ADMIN, AUDIT, KACAB, PIC_CABANG) ── */}
      {isHubMode && nationalKPI && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {/* Card 1: Total Master Agen */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isBranchRole ? 'Agen Cabang' : 'Master Agen Nasional'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {nationalKPI.totalAgents.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                Status: <strong className="text-emerald-600 dark:text-emerald-400">{nationalKPI.activeAgents.toLocaleString('id-ID')} Agen Aktif</strong>
              </p>
            </div>
          </div>

          {/* Card 2: Total Staf Asisten (Officer Agent) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isBranchRole ? 'Asisten Cabang' : 'Total Asisten Operasional'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {nationalKPI.totalAssistants.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                Aktif: <strong className="text-emerald-600 dark:text-emerald-400">{nationalKPI.activeAssistants}</strong> di <strong className="text-slate-800 dark:text-slate-200">{nationalKPI.agentsWithAssistants} Agen Induk</strong>
              </p>
            </div>
          </div>

          {/* Card 3: Portofolio Premi */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isBranchRole ? 'Premi Produksi Cabang' : 'Total Premi Nasional'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400 truncate" title={formatIDR(nationalKPI.nationalGrossPremium)}>
                {formatIDR(nationalKPI.nationalGrossPremium)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                Total Polis: <strong className="text-slate-800 dark:text-slate-200">{nationalKPI.nationalPolicyCount.toLocaleString('id-ID')} berkas</strong>
              </p>
            </div>
          </div>

          {/* Card 4: Rasio Klaim */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isBranchRole ? 'Loss Ratio Cabang' : 'Loss Ratio Nasional'}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                nationalKPI.nationalLossRatio <= 50
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : nationalKPI.nationalLossRatio <= 65
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              }`}>
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className={`text-2xl font-black ${
                nationalKPI.nationalLossRatio <= 50
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : nationalKPI.nationalLossRatio <= 65
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}>
                {nationalKPI.nationalLossRatio}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                Beban Klaim: <strong className="text-slate-800 dark:text-slate-200">{formatIDR(nationalKPI.nationalGrossClaim)}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB NAVIGASI HUB (SUPERADMIN, ADMIN, AUDIT, KACAB, PIC_CABANG) ── */}
      {isHubMode && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('assistants')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'assistants'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>
              {isBranchRole
                ? `Direktori Asisten Cabang (${assistants.length})`
                : `Direktori Seluruh Asisten Nasional (${assistants.length})`}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inspect')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'inspect'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>
              {isBranchRole ? 'Inspector Agen Cabang' : 'Inspector Agen Nasional'}
              {selectedAgentInfo ? ` (${selectedAgentInfo.name})` : ''}
            </span>
          </button>
        </div>
      )}

      {/* ── BOX PENCARIAN INSPEKSI AGEN (TAB INSPECT) ────────────────────────── */}
      {isHubMode && activeTab === 'inspect' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Pencarian Agen untuk Diinspeksi</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih salah satu agen untuk mensimulasikan dan melihat persis tampilan Digital Agency ID Card serta KPI personal miliknya.
                </p>
              </div>

              {selectedAgentInfo && (
                <button
                  onClick={handleClearInspection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition self-start sm:self-auto cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup Inspeksi</span>
                </button>
              )}
            </div>

            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={agentSearchQuery}
                onChange={(e) => handleSearchAgent(e.target.value)}
                placeholder="Ketik Kode Agen, Nama Agen, atau Nama Cabang..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {isSearchingAgent && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              )}

              {/* Autocomplete Dropdown List */}
              {agentSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 z-30">
                  {agentSearchResults.map((ag) => (
                    <button
                      key={ag.id}
                      onClick={() => handleSelectAgentToInspect(ag)}
                      className="w-full text-left p-3 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{ag.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Kode: {ag.agentCode} • {ag.branchName}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {ag.peringkat || 'Partner'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedAgentInfo && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    Sedang menginspeksi: <strong>{selectedAgentInfo.name}</strong> ({selectedAgentInfo.agentCode}) - {selectedAgentInfo.branchName}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-200/70 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200">
                  INSPECTOR ACTIVE
                </span>
              </div>
            )}
          </div>

          {!selectedAgentInfo && (
            <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Belum Ada Agen yang Dipilih untuk Diinspeksi
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Gunakan kolom pencarian di atas untuk memilih salah satu dari ribuan agen nasional guna memuat Kartu Identitas Digital dan portofolio personal agen tersebut.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── KARTU PROFIL IDENTITAS AGEN (DIGITAL AGENCY ID CARD) ──────────── */}
      {profile && (!isHubMode || (isHubMode && activeTab === 'inspect')) && (
        <div
          style={{ backgroundColor: '#0b1329' }}
          className="rounded-2xl bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden animate-in fade-in duration-300"
        >
          {/* Ambient Lighting Background Accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar: Label Identitas & Chip Kartu Digital */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-400/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300">
                  KARTU IDENTITAS KEAGENAN RESMI
                </p>
                <p className="text-[10px] text-slate-400">
                  Mitraca Agency Management System
                </p>
              </div>
            </div>

            {/* Smartcard Microchip Simulation */}
            <div className="flex items-center gap-2">
              <div
                title="Digital Member Chip"
                className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 border border-amber-600/50 shadow-inner flex flex-col justify-around p-1 opacity-90"
              >
                <div className="w-full h-px bg-amber-700/40" />
                <div className="w-full h-px bg-amber-700/40" />
              </div>
              <span className="hidden sm:inline-block font-mono text-[10px] font-bold tracking-wider text-slate-400">
                EMV SECURE
              </span>
            </div>
          </div>

          {/* Body Kartu: Identitas Agen & Rincian Silsilah */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Bagian Kiri: Avatar, Nama, Peringkat, Status & Chips */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div
                style={{ backgroundColor: '#2563eb' }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg border border-white/20 shrink-0 ring-4 ring-white/10"
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                    {profile.name}
                  </h2>
                  {renderPeringkatBadge(profile.peringkat)}
                  {renderStatusBadge(profile.statusKeagenan)}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
                  {/* Chip Kode Agen */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] font-semibold text-slate-400">Kode:</span>
                    <button
                      onClick={() => handleCopy(profile.agentCode, 'agentCode')}
                      className="text-white font-mono font-bold flex items-center gap-1 hover:text-blue-300 transition cursor-pointer"
                      title="Klik untuk menyalin"
                    >
                      <span>{profile.agentCode}</span>
                      {copiedField === 'agentCode' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Chip Profile ID */}
                  {profile.profId && (
                    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-semibold text-slate-400">Profile ID:</span>
                      <button
                        onClick={() => handleCopy(profile.profId!, 'profId')}
                        className="text-blue-300 font-mono font-bold flex items-center gap-1 hover:text-blue-200 transition cursor-pointer"
                        title="Klik untuk menyalin"
                      >
                        <span>{profile.profId}</span>
                        {copiedField === 'profId' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Kantor Cabang */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold">{profile.branchName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian Kanan: Grid Silsilah & Keanggotaan */}
            <div className="border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 text-xs text-slate-300 shrink-0 min-w-[260px]">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                <span className="text-slate-400 text-[11px]">Upline Leader:</span>
                <span className="font-bold text-white text-right truncate">
                  {profile.uplineName} <span className="text-slate-400 font-mono font-normal">({profile.uplineCode})</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                <span className="text-slate-400 text-[11px]">Kedalaman Silsilah:</span>
                <span className="font-extrabold text-blue-400">Level {profile.depth}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 sm:col-span-2 lg:col-span-1">
                <span className="text-slate-400 text-[11px]">Terdaftar Sejak:</span>
                <span className="text-slate-300 font-semibold">{formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4 KPI CARDS RINGKASAN PERFORMA PERSONAL & ASISTEN ──────────────── */}
      {kpi && (!isHubMode || (isHubMode && activeTab === 'inspect')) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in duration-300">
          {/* Card 1: Portofolio Polis Pribadi */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Polis Pribadi
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              {kpi.cutoffStartDate && kpi.cutoffEndDate && (
                <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                  ({normalizeDate(kpi.cutoffStartDate)} s/d {normalizeDate(kpi.cutoffEndDate)})
                </div>
              )}
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {formatIDR(kpi.personalCutoffGrossPremium ?? kpi.personalGrossPremium)}
              </p>
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                Premi {kpi.cutoffYear || 2026}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {(kpi.personalCutoffPolicyCount ?? kpi.personalPolicyCount).toLocaleString('id-ID')} Polis {kpi.cutoffYear || 2026}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Klaim & Loss Ratio Pribadi */}
          {(() => {
            const lrValue = kpi.personalCutoffLossRatio ?? kpi.personalLossRatio;
            const lrEval = evaluateLossRatio(lrValue);
            return (
              <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${lrEval.bgClass} dark:bg-slate-900 ${lrEval.borderClass} dark:border-slate-800`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Loss Ratio Pribadi
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${lrEval.badgeClass}`}>
                      {lrEval.label}
                    </span>
                  </div>
                  {kpi.cutoffStartDate && kpi.cutoffEndDate && (
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/80 dark:bg-slate-800/80 text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                      ({normalizeDate(kpi.cutoffStartDate)} s/d {normalizeDate(kpi.cutoffEndDate)})
                    </div>
                  )}
                </div>
                <div>
                  <p className={`text-xl sm:text-2xl font-black tracking-tight ${lrEval.textClass}`}>
                    {lrValue}%
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Rasio Klaim {kpi.cutoffYear || 2026}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 truncate">
                    Beban Klaim: <span className="font-semibold text-slate-900 dark:text-slate-200">{formatIDR(kpi.personalCutoffGrossClaim ?? kpi.personalGrossClaim)}</span>
                    <span className="text-[11px] text-slate-400 ml-1">({kpi.personalCutoffClaimCount ?? kpi.personalClaimCount} klaim)</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card 3: Jaringan Tim Downline */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Jaringan Tim
                </span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-[10px] font-medium text-purple-700 dark:text-purple-300 mb-2">
                (Silsilah Hirarki Tim)
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400 tracking-tight">
                {kpi.directDownlinesCount}
              </p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                Downline Langsung (Level 1)
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  Total Jaringan: <strong className="text-slate-900 dark:text-slate-100">{kpi.totalNetworkDownlinesCount} Agen</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Staf Asisten (Officer Agent) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Staf Asisten
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                (Officer Agent Resmi)
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {kpi.activeAssistants}{' '}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Asisten</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                Staf Aktif ({kpi.totalAssistants} Terdaftar)
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  Status: <strong className={kpi.activeAssistants > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    {kpi.activeAssistants > 0 ? 'Siap Melayani Operasional' : 'Belum Ada Asisten Aktif'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BAGIAN MANAJEMEN ASISTEN PRIBADI / DIREKTORI HUB ───────── */}
      {(!isHubMode || (isHubMode && activeTab === 'assistants') || (isHubMode && activeTab === 'inspect' && selectedAgentInfo)) && (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in duration-300">
        {/* Header Bagian */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {isNationalRole
                    ? (activeTab === 'inspect' && selectedAgentInfo ? `Daftar Asisten Agen ${selectedAgentInfo.name}` : 'Direktori Seluruh Asisten Operasional Nasional')
                    : isBranchRole
                    ? (activeTab === 'inspect' && selectedAgentInfo ? `Daftar Asisten Agen ${selectedAgentInfo.name}` : `Direktori Asisten Cabang ${branchInfo?.name || ''}`)
                    : 'Daftar Asisten Operasional (Officer Agent)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isNationalRole
                    ? (activeTab === 'inspect' && selectedAgentInfo ? `Staf asisten yang bertugas di bawah naungan agen ${selectedAgentInfo.name}.` : 'Seluruh staf asisten yang bertugas membantu operasional keagenan di berbagai cabang se-Indonesia.')
                    : isBranchRole
                    ? (activeTab === 'inspect' && selectedAgentInfo ? `Staf asisten yang bertugas di bawah naungan agen ${selectedAgentInfo.name}.` : `Seluruh staf asisten yang bertugas membantu operasional keagenan di Cabang ${branchInfo?.name || ''}.`)
                    : 'Asisten dapat login untuk memantau portofolio analitik, pohon hirarki jaringan, dan berkas polis/klaim atas nama Anda.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canManage && !isReadOnly && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Asisten Baru</span>
              </button>
            )}
            {isReadOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800">
                <Shield className="w-3.5 h-3.5" />
                <span>{callerRole === 'AUDIT' ? 'Mode Audit (Hanya Lihat)' : 'Mode Pemantauan Cabang (Hanya Lihat)'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Search bar & Filter Cabang */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isHubMode && activeTab === 'assistants' ? "Cari nama asisten, email, agen induk, kode agen, atau cabang..." : "Cari asisten berdasarkan nama, email, atau telepon..."}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {isNationalRole && activeTab === 'assistants' && branchList.length > 0 && (
              <div className="w-full sm:w-56 shrink-0">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium cursor-pointer"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Cabang ({assistants.length})</option>
                  {branchList.map((b) => (
                    <option key={b} value={b} className="dark:bg-slate-900">{b}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold self-end sm:self-auto">
            Total Asisten: <strong className="text-slate-800 dark:text-slate-200">{filteredAssistants.length}</strong>
          </div>
        </div>

        {/* Tabel Data Asisten */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Asisten</th>
                <th className="py-3.5 px-4">Email Login</th>
                <th className="py-3.5 px-4">No. Telepon / WA</th>
                {isHubMode && activeTab === 'assistants' && <th className="py-3.5 px-4">Agen Induk</th>}
                {isHubMode && activeTab === 'assistants' && <th className="py-3.5 px-4">Cabang</th>}
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Login Terakhir</th>
                <th className="py-3.5 px-4">Tanggal Dibuat</th>
                {canManage && !isReadOnly && <th className="py-3.5 px-4 text-center w-28">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filteredAssistants.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      isHubMode && activeTab === 'assistants'
                        ? (canManage && !isReadOnly ? 10 : 9)
                        : (canManage && !isReadOnly ? 8 : 7)
                    }
                    className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        {searchTerm || branchFilter !== 'ALL'
                          ? 'Tidak ada asisten yang cocok dengan kriteria pencarian'
                          : 'Belum ada asisten operasional (Officer Agent) yang terdaftar'}
                      </p>
                      {canManage && !isReadOnly && !searchTerm && (
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] max-w-sm">
                          Klik tombol <strong>&quot;Tambah Asisten Baru&quot;</strong> di atas untuk mendaftarkan staf operasional.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssistants.map((assistant, idx) => (
                  <tr key={assistant.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Nama Asisten */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {assistant.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{assistant.name}</span>
                      </div>
                    </td>

                    {/* Email Login */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="font-mono text-xs">{assistant.email}</span>
                      </div>
                    </td>

                    {/* No Telepon */}
                    <td className="py-3.5 px-4">
                      {assistant.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{assistant.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Agen Induk (Khusus Hub Scope) */}
                    {isHubMode && activeTab === 'assistants' && (
                      <td className="py-3.5 px-4">
                        {assistant.agentName ? (
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{assistant.agentName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Kode: {assistant.agentCode || '-'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">-</span>
                        )}
                      </td>
                    )}

                    {/* Cabang (Khusus Hub Scope) */}
                    {isHubMode && activeTab === 'assistants' && (
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{assistant.branchName || 'Kantor Pusat'}</span>
                        </span>
                      </td>
                    )}

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          assistant.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            assistant.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{assistant.isActive ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </td>

                    {/* Login Terakhir */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatDateTime(assistant.lastLoginAt, false)}
                    </td>

                    {/* Tanggal Dibuat */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatDate(assistant.createdAt)}
                    </td>

                    {/* Kolom Aksi */}
                    {canManage && !isReadOnly && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit Nama & Phone */}
                          <button
                            onClick={() => {
                              setSelectedAssistant(assistant);
                              setEditFormData({
                                name: assistant.name,
                                phone: assistant.phone || '',
                                isActive: assistant.isActive,
                              });
                              setIsEditModalOpen(true);
                            }}
                            title="Edit Profil Asisten"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setSelectedAssistant(assistant);
                              setResetPwdData({ password: '', confirmPassword: '' });
                              setIsResetPwdModalOpen(true);
                            }}
                            title="Reset Password Asisten"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Status Aktif / Nonaktif */}
                          <button
                            onClick={() => handleToggleStatus(assistant)}
                            title={assistant.isActive ? 'Nonaktifkan Asisten' : 'Aktifkan Asisten'}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              assistant.isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800'
                                : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Hapus Asisten */}
                          <button
                            onClick={() => {
                              setSelectedAssistant(assistant);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Hapus Akun Asisten"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ── MODAL: TAMBAH ASISTEN BARU ───────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Tambah Asisten Baru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isNationalRole
                      ? 'Daftarkan akun staf operasional (Officer Agent) di bawah naungan Master Agen'
                      : `Daftarkan akun staf operasional untuk agen ${profile?.name || ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAssistant} className="space-y-3.5">
              {/* Pemilihan Agen Induk (Khusus Admin / Scope Nasional) */}
              {isNationalRole && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Agen Induk (Tempat Asisten Bertugas) <span className="text-rose-500">*</span>
                  </label>
                  {selectedParentAgent ? (
                    <div className="flex items-center justify-between p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{selectedParentAgent.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Kode: {selectedParentAgent.agentCode} • {selectedParentAgent.branchName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedParentAgent(null)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 relative">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={parentAgentSearchQuery}
                          onChange={(e) => handleSearchParentAgent(e.target.value)}
                          placeholder="Cari nama/kode agen induk..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      {parentAgentResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs z-30">
                          {parentAgentResults.map((ag) => (
                            <button
                              key={ag.id}
                              type="button"
                              onClick={() => {
                                setSelectedParentAgent(ag);
                                setParentAgentResults([]);
                                setParentAgentSearchQuery('');
                              }}
                              className="w-full text-left p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{ag.name}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2 font-mono">({ag.agentCode})</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{ag.branchName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Asisten <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ani Suryani"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email (Login) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="asisten@email.com"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08123456789"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password Awal <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Ulangi password"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
                Asisten akan mendapatkan hak akses peran <strong>Officer Agent</strong> dengan lingkup data yang identik dengan kode agen Anda.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Asisten'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT ASISTEN ──────────────────────────────────────────────── */}
      {isEditModalOpen && selectedAssistant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Edit Profil Asisten
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedAssistant.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditAssistant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Asisten <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Akun
                </label>
                <select
                  value={editFormData.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, isActive: e.target.value === 'active' })
                  }
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="active" className="dark:bg-slate-900">Aktif (Dapat Login)</option>
                  <option value="inactive" className="dark:bg-slate-900">Nonaktif (Akses Ditutup)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PASSWORD ASISTEN ───────────────────────────────────── */}
      {isResetPwdModalOpen && selectedAssistant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Reset Password Asisten
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedAssistant.name} ({selectedAssistant.email})</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPwdModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={resetPwdData.password}
                    onChange={(e) => setResetPwdData({ ...resetPwdData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Password Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={resetPwdData.confirmPassword}
                  onChange={(e) =>
                    setResetPwdData({ ...resetPwdData, confirmPassword: e.target.value })
                  }
                  placeholder="Ulangi password baru"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                Setelah password direset, asisten dapat langsung login menggunakan password baru ini.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetPwdModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Mereset...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: KONFIRMASI HAPUS ASISTEN ─────────────────────────────────── */}
      {isDeleteModalOpen && selectedAssistant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Hapus Akun Asisten?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini akan menghapus akses login asisten secara permanen.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div>
                Nama Asisten: <strong className="text-slate-900 dark:text-slate-100">{selectedAssistant.name}</strong>
              </div>
              <div>
                Email Login: <strong className="text-slate-900 dark:text-slate-100">{selectedAssistant.email}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAssistant}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
