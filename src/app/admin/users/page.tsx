'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building,
  GitFork,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Trash2,
  X,
  AlertCircle,
  RefreshCw,
  Building2,
  Lock,
  Mail,
  Phone,
  User,
  Sparkles,
  ChevronRight,
  Edit2,
  Loader2,
} from 'lucide-react';

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface AgentOption {
  id: string;
  agentCode: string;
  name: string;
  peringkat?: string;
  rawBranchName?: string;
}

interface UserItem {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  isActive: boolean;
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  agentId: string | null;
  agentCode: string | null;
  agentName: string | null;
  parentAgentId: string | null;
  parentAgentCode: string | null;
  parentAgentName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserItem | null>(null);

  // Form Create User State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState('AGENT');
  const [formBranchId, setFormBranchId] = useState('');
  const [formAgentId, setFormAgentId] = useState('');
  const [formParentAgentId, setFormParentAgentId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Edit User State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('AGENT');
  const [editBranchId, setEditBranchId] = useState('');
  const [editAgentId, setEditAgentId] = useState('');
  const [selectedEditAgentDisplay, setSelectedEditAgentDisplay] = useState<AgentOption | null>(null);
  const [editParentAgentId, setEditParentAgentId] = useState('');
  const [selectedEditParentAgentDisplay, setSelectedEditParentAgentDisplay] = useState<AgentOption | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editModalSuccess, setEditModalSuccess] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editAgentSearchQuery, setEditAgentSearchQuery] = useState('');
  const [editAgentSearchResults, setEditAgentSearchResults] = useState<AgentOption[]>([]);
  const [editParentAgentSearchQuery, setEditParentAgentSearchQuery] = useState('');
  const [editParentAgentSearchResults, setEditParentAgentSearchResults] = useState<AgentOption[]>([]);

  // Aux data for selectors
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentSearchResults, setAgentSearchResults] = useState<AgentOption[]>([]);
  const [selectedAgentDisplay, setSelectedAgentDisplay] = useState<AgentOption | null>(null);

  const [parentAgentSearchQuery, setParentAgentSearchQuery] = useState('');
  const [parentAgentSearchResults, setParentAgentSearchResults] = useState<AgentOption[]>([]);
  const [selectedParentAgentDisplay, setSelectedParentAgentDisplay] = useState<AgentOption | null>(null);

  // Load Users List
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedRoleFilter !== 'ALL') params.set('role', selectedRoleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat data pengguna`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Terjadi kesalahan sistem');
      }
      setUsersList(data.users || []);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError(err.message || 'Gagal memuat pengguna');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedRoleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load Branches list once for dropdown
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error('Load branches error:', err);
      }
    }
    loadBranches();
  }, []);

  // Agent Search auto-complete
  useEffect(() => {
    if (!agentSearchQuery.trim() || agentSearchQuery.length < 2) {
      setAgentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(agentSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setAgentSearchResults(data.agents || []);
        }
      } catch (err) {
        console.error('Agent search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [agentSearchQuery]);

  // Parent Agent Search auto-complete
  useEffect(() => {
    if (!parentAgentSearchQuery.trim() || parentAgentSearchQuery.length < 2) {
      setParentAgentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(parentAgentSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setParentAgentSearchResults(data.agents || []);
        }
      } catch (err) {
        console.error('Parent agent search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [parentAgentSearchQuery]);

  // Edit Agent Search auto-complete
  useEffect(() => {
    if (!editAgentSearchQuery.trim() || editAgentSearchQuery.length < 2) {
      setEditAgentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(editAgentSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setEditAgentSearchResults(data.agents || []);
        }
      } catch (err) {
        console.error('Edit agent search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editAgentSearchQuery]);

  // Edit Parent Agent Search auto-complete
  useEffect(() => {
    if (!editParentAgentSearchQuery.trim() || editParentAgentSearchQuery.length < 2) {
      setEditParentAgentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(editParentAgentSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setEditParentAgentSearchResults(data.agents || []);
        }
      } catch (err) {
        console.error('Edit parent agent search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editParentAgentSearchQuery]);

  // Open Edit User Modal
  const handleOpenEditModal = (u: UserItem) => {
    setSelectedUserForEdit(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditRole(u.role || 'AGENT');
    setEditBranchId(u.branchId || '');
    setEditAgentId(u.agentId || '');
    if (u.agentId) {
      setSelectedEditAgentDisplay({
        id: u.agentId,
        agentCode: u.agentCode || '',
        name: u.agentName || '',
      });
    } else {
      setSelectedEditAgentDisplay(null);
    }
    setEditParentAgentId(u.parentAgentId || '');
    if (u.parentAgentId) {
      setSelectedEditParentAgentDisplay({
        id: u.parentAgentId,
        agentCode: u.parentAgentCode || '',
        name: u.parentAgentName || '',
      });
    } else {
      setSelectedEditParentAgentDisplay(null);
    }
    setEditIsActive(u.isActive);
    setEditNewPassword('');
    setShowEditPassword(false);
    setEditModalError(null);
    setEditModalSuccess(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setEditModalError(null);
    setEditModalSuccess(null);

    if (!editName.trim() || !editEmail.trim()) {
      setEditModalError('Nama lengkap dan email wajib diisi.');
      return;
    }

    try {
      setIsEditSubmitting(true);
      const payload: Record<string, any> = {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
        role: editRole,
        isActive: editIsActive,
      };

      if (editRole === 'KACAB' || editRole === 'PIC_CABANG') {
        if (!editBranchId) {
          throw new Error('Cabang wajib dipilih untuk peran KACAB atau PIC_CABANG');
        }
        payload.branchId = editBranchId;
      } else if (editRole === 'AGENT') {
        if (!editAgentId) {
          throw new Error('Profil agen wajib dihubungkan untuk peran AGENT');
        }
        payload.agentId = editAgentId;
      } else if (editRole === 'OFFICER_AGENT') {
        if (!editParentAgentId) {
          throw new Error('Agen pemilik wajib dihubungkan untuk peran OFFICER_AGENT');
        }
        payload.parentAgentId = editParentAgentId;
      }

      if (editNewPassword.trim()) {
        if (editNewPassword.trim().length < 6) {
          throw new Error('Password baru minimal 6 karakter');
        }
        payload.newPassword = editNewPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${selectedUserForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memperbarui data pengguna');
      }

      // Optimistic / In-Place UI state update agar tabel langsung ter-refresh instan
      setUsersList((prev) =>
        prev.map((u) => {
          if (u.id === selectedUserForEdit.id) {
            const matchedBranch = branches.find((b) => b.id === payload.branchId);
            return {
              ...u,
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              role: payload.role,
              isActive: payload.isActive,
              branchId: payload.branchId ?? null,
              branchCode: matchedBranch?.code ?? (payload.role === 'KACAB' || payload.role === 'PIC_CABANG' ? u.branchCode : null),
              branchName: matchedBranch?.name ?? (payload.role === 'KACAB' || payload.role === 'PIC_CABANG' ? u.branchName : null),
              agentId: payload.agentId ?? null,
              agentCode: selectedEditAgentDisplay?.agentCode ?? (payload.role === 'AGENT' ? u.agentCode : null),
              agentName: selectedEditAgentDisplay?.name ?? (payload.role === 'AGENT' ? u.agentName : null),
              parentAgentId: payload.parentAgentId ?? null,
              parentAgentCode: selectedEditParentAgentDisplay?.agentCode ?? (payload.role === 'OFFICER_AGENT' ? u.parentAgentCode : null),
              parentAgentName: selectedEditParentAgentDisplay?.name ?? (payload.role === 'OFFICER_AGENT' ? u.parentAgentName : null),
            };
          }
          return u;
        })
      );

      // Tutup modal seketika tanpa blocking delay
      setIsEditModalOpen(false);
      setSelectedUserForEdit(null);

      // Sinkronisasi data di latar belakang
      fetchUsers();
    } catch (err: any) {
      setEditModalError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Toggle User Active Status
  const handleToggleActive = async (user: UserItem) => {
    // Optimistic toggle
    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
    );

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback jika gagal
        setUsersList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
        );
        alert(data.error || 'Gagal mengubah status pengguna');
        return;
      }
      fetchUsers();
    } catch (err) {
      console.error('Toggle active error:', err);
      // Rollback jika exception
      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
      );
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun '${user.name}' (${user.email})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Gagal menghapus pengguna');
        return;
      }
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        password: formPassword,
        role: formRole,
        isActive: formIsActive,
      };

      if (formRole === 'KACAB' || formRole === 'PIC_CABANG') {
        if (!formBranchId) throw new Error(`Role ${formRole} wajib memilih Cabang.`);
        payload.branchId = formBranchId;
      } else if (formRole === 'AGENT') {
        if (!formAgentId) throw new Error('Role AGENT wajib memilih data Agen.');
        payload.agentId = formAgentId;
      } else if (formRole === 'OFFICER_AGENT') {
        if (!formParentAgentId) throw new Error('Role OFFICER_AGENT wajib memilih Agen Pemilik.');
        payload.parentAgentId = formParentAgentId;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membuat pengguna');
      }

      setModalSuccess(data.message || 'User berhasil dibuat!');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        resetCreateForm();
        fetchUsers();
      }, 350);
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kesalahan saat membuat pengguna');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('Password123!');
    setFormRole('AGENT');
    setFormBranchId('');
    setFormAgentId('');
    setSelectedAgentDisplay(null);
    setAgentSearchQuery('');
    setFormParentAgentId('');
    setSelectedParentAgentDisplay(null);
    setParentAgentSearchQuery('');
    setFormIsActive(true);
    setModalError(null);
    setModalSuccess(null);
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPassword) return;

    setIsSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${selectedUserForReset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mereset password');
      }

      setModalSuccess('Password berhasil diubah!');
      setTimeout(() => {
        setIsResetPasswordModalOpen(false);
        setSelectedUserForReset(null);
        setNewPassword('');
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || 'Gagal mereset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pass);
  };

  const getRoleBadgeStyle = (r: string) => {
    switch (r) {
      case 'SUPERADMIN':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'ADMIN':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'KACAB':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'PIC_CABANG':
        return 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      case 'AGENT':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'OFFICER_AGENT':
        return 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800';
      case 'AUDIT':
        return 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  // Quick Stats
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Manajemen Pengguna & Hak Akses
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  SUPERADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Buat dan kelola akun login pengguna beserta pembatasan data scoping (7 Peran RBAC)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Buat User Baru
          </button>
        </div>
      </div>

      {/* ── Submenu Pengaturan ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm flex flex-wrap gap-1.5 items-center mb-6">
        <Link
          href="/admin/users"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition"
        >
          <Users className="w-3.5 h-3.5" />
          Kelola User Akses
          <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-extrabold px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
            Superadmin
          </span>
        </Link>

        <Link
          href="/admin/branches"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Building2 className="w-3.5 h-3.5" />
          Master Cabang
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
            Admin
          </span>
        </Link>

        <Link
          href="/settings/change-password"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Ganti Password
        </Link>
      </div>

      {/* ── KPI Ringkasan Akun ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Akun</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalUsers}</div>
          </div>
          <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Akun Aktif</span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{activeUsers}</div>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Akun Nonaktif</span>
            <div className="text-2xl font-black text-slate-500 dark:text-slate-400 mt-1">{inactiveUsers}</div>
          </div>
          <span className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <XCircle className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* ── Filter & Search Bar ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 pl-9 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Filter Peran:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Semua Peran (7 Role)</option>
            <option value="SUPERADMIN">SUPERADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="KACAB">KACAB (Kepala Cabang)</option>
            <option value="PIC_CABANG">PIC_CABANG</option>
            <option value="AGENT">AGENT</option>
            <option value="OFFICER_AGENT">OFFICER_AGENT</option>
            <option value="AUDIT">AUDIT</option>
          </select>

          <button
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Tabel Pengguna ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Nama Lengkap & Kontak</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Cakupan Data (Scoping)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Terakhir Login</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada pengguna yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{u.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {u.email}
                      </div>
                      {u.phone && (
                        <div className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {u.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getRoleBadgeStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === 'KACAB' || u.role === 'PIC_CABANG' ? (
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Building className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-semibold">
                            Cabang {u.branchCode ? `[${u.branchCode}] ` : ''}{u.branchName || 'Belum Terhubung'}
                          </span>
                        </div>
                      ) : u.role === 'AGENT' ? (
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <GitFork className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="font-semibold">
                            Agen [{u.agentCode || '-'}] {u.agentName || ''}
                          </span>
                        </div>
                      ) : u.role === 'OFFICER_AGENT' ? (
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Users className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          <span className="font-semibold">
                            Asisten dari: [{u.parentAgentCode || '-'}] {u.parentAgentName || ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Skup Nasional Penuh</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                          u.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Klik untuk mengubah status aktif"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Belum pernah login'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                          title="Edit Data Pengguna"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setNewPassword('');
                            setModalError(null);
                            setModalSuccess(null);
                            setIsResetPasswordModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: BUAT USER BARU ────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Buat User Akses Baru</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Isi data akun login dan tentukan batasan data scoping</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Email & Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Login <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="user@mitraca.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No. Handphone (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Password & Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password Awal <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Buat Acak
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 pr-16 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                  >
                    {showPassword ? 'Sembunyi' : 'Lihat'}
                  </button>
                </div>
              </div>

              {/* Pilihan Peran (7 Roles) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Peran Pengguna (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => {
                    setFormRole(e.target.value);
                    setFormBranchId('');
                    setFormAgentId('');
                    setSelectedAgentDisplay(null);
                    setFormParentAgentId('');
                    setSelectedParentAgentDisplay(null);
                  }}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="SUPERADMIN">SUPERADMIN — Skup Nasional Penuh & Konfigurasi</option>
                  <option value="ADMIN">ADMIN — Skup Nasional & Izin Upload Ingestion</option>
                  <option value="KACAB">KACAB — Kepala Cabang (Terisolasi per Cabang)</option>
                  <option value="PIC_CABANG">PIC_CABANG — Staff Operasional Cabang</option>
                  <option value="AGENT">AGENT — Hanya Diri Sendiri + Pohon Downline Agensi</option>
                  <option value="OFFICER_AGENT">OFFICER_AGENT — Asisten Agen (Identik Scope Pemilik)</option>
                  <option value="AUDIT">AUDIT — Read-Only Skup Nasional</option>
                </select>
              </div>

              {/* DYNAMIC SCOPING: 1. Jika KACAB atau PIC_CABANG -> Pilih Cabang */}
              {(formRole === 'KACAB' || formRole === 'PIC_CABANG') && (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    Hubungkan ke Cabang <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 leading-tight">
                    Data transaksi, polis, klaim, dan agen pengguna ini akan terisolasi hanya pada cabang yang dipilih.
                  </p>
                </div>
              )}

              {/* DYNAMIC SCOPING: 2. Jika AGENT -> Cari Agen di Database */}
              {formRole === 'AGENT' && (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    Hubungkan ke Profil Agen <span className="text-rose-500">*</span>
                  </label>

                  {selectedAgentDisplay ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700">
                      <div>
                        <span className="font-bold text-xs text-amber-950 dark:text-amber-200">
                          [{selectedAgentDisplay.agentCode}] {selectedAgentDisplay.name}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {selectedAgentDisplay.peringkat || 'Agen'} · {selectedAgentDisplay.rawBranchName || 'Cabang'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAgentDisplay(null);
                          setFormAgentId('');
                          setAgentSearchQuery('');
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik kode agen atau nama (min. 2 karakter)..."
                        value={agentSearchQuery}
                        onChange={(e) => setAgentSearchQuery(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      {agentSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                          {agentSearchResults.map((ag) => (
                            <button
                              key={ag.id}
                              type="button"
                              onClick={() => {
                                setFormAgentId(ag.id);
                                setSelectedAgentDisplay(ag);
                                setAgentSearchResults([]);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
                            >
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                [{ag.agentCode}] {ag.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {ag.peringkat || 'Agen'} · {ag.rawBranchName || '-'}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-tight">
                    Pengguna hanya akan dapat melihat data diri sendiri dan seluruh pohon downline di bawah jalurnya.
                  </p>
                </div>
              )}

              {/* DYNAMIC SCOPING: 3. Jika OFFICER_AGENT -> Pilih Owner Agent */}
              {formRole === 'OFFICER_AGENT' && (
                <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800">
                  <label className="block text-xs font-bold text-orange-900 dark:text-orange-200 mb-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                    Pilih Agen Pemilik (Owner Agent) <span className="text-rose-500">*</span>
                  </label>

                  {selectedParentAgentDisplay ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-orange-300 dark:border-orange-700">
                      <div>
                        <span className="font-bold text-xs text-orange-950 dark:text-orange-200">
                          [{selectedParentAgentDisplay.agentCode}] {selectedParentAgentDisplay.name}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {selectedParentAgentDisplay.peringkat || 'Agen'} · {selectedParentAgentDisplay.rawBranchName || 'Cabang'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedParentAgentDisplay(null);
                          setFormParentAgentId('');
                          setParentAgentSearchQuery('');
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik kode/nama agen pemilik (min. 2 karakter)..."
                        value={parentAgentSearchQuery}
                        onChange={(e) => setParentAgentSearchQuery(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-950 border border-orange-300 dark:border-orange-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                      {parentAgentSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                          {parentAgentSearchResults.map((ag) => (
                            <button
                              key={ag.id}
                              type="button"
                              onClick={() => {
                                setFormParentAgentId(ag.id);
                                setSelectedParentAgentDisplay(ag);
                                setParentAgentSearchResults([]);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
                            >
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                [{ag.agentCode}] {ag.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {ag.peringkat || 'Agen'} · {ag.rawBranchName || '-'}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-orange-700 dark:text-orange-400 mt-1 leading-tight">
                    Staf officer ini akan mewarisi cakupan hak akses yang identik dengan Agen Pemilik yang dipilih.
                  </p>
                </div>
              )}

              {/* Toggle Aktif */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aktifkan akun ini segera setelah dibuat
                </span>
              </label>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Simpan User Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT USER ──────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 dark:border-slate-800 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Edit Data Pengguna</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Perbarui profil, hak akses peran, atau cakupan data scoping akun
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            {editModalSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{editModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 mt-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Email & Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Login <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="user@mitraca.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No. Handphone (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Status Akun */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Status Akun</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pengguna nonaktif tidak akan dapat melakukan login ke dalam sistem.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    {editIsActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </label>
              </div>

              {/* Pilihan Peran (7 Roles) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Peran Pengguna (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    const newR = e.target.value;
                    setEditRole(newR);
                    if (newR !== 'KACAB' && newR !== 'PIC_CABANG') {
                      setEditBranchId('');
                    }
                    if (newR !== 'AGENT') {
                      setEditAgentId('');
                      setSelectedEditAgentDisplay(null);
                    }
                    if (newR !== 'OFFICER_AGENT') {
                      setEditParentAgentId('');
                      setSelectedEditParentAgentDisplay(null);
                    }
                  }}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="SUPERADMIN">SUPERADMIN — Skup Nasional Penuh & Konfigurasi</option>
                  <option value="ADMIN">ADMIN — Skup Nasional & Izin Upload Ingestion</option>
                  <option value="KACAB">KACAB — Kepala Cabang (Terisolasi per Cabang)</option>
                  <option value="PIC_CABANG">PIC_CABANG — Staff Operasional Cabang</option>
                  <option value="AGENT">AGENT — Hanya Diri Sendiri + Pohon Downline Agensi</option>
                  <option value="OFFICER_AGENT">OFFICER_AGENT — Asisten Agen (Identik Scope Pemilik)</option>
                  <option value="AUDIT">AUDIT — Read-Only Skup Nasional</option>
                </select>
              </div>

              {/* DYNAMIC SCOPING: 1. Jika KACAB atau PIC_CABANG -> Pilih Cabang */}
              {(editRole === 'KACAB' || editRole === 'PIC_CABANG') && (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    Hubungkan ke Cabang <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 leading-tight">
                    Data transaksi, polis, klaim, dan agen pengguna ini akan terisolasi hanya pada cabang yang dipilih.
                  </p>
                </div>
              )}

              {/* DYNAMIC SCOPING: 2. Jika AGENT -> Cari Agen di Database */}
              {editRole === 'AGENT' && (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    Hubungkan ke Profil Agen <span className="text-rose-500">*</span>
                  </label>

                  {selectedEditAgentDisplay ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700">
                      <div>
                        <span className="font-bold text-xs text-amber-950 dark:text-amber-200">
                          [{selectedEditAgentDisplay.agentCode}] {selectedEditAgentDisplay.name}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {selectedEditAgentDisplay.peringkat || 'Agen'} · {selectedEditAgentDisplay.rawBranchName || 'Cabang'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEditAgentDisplay(null);
                          setEditAgentId('');
                          setEditAgentSearchQuery('');
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik minimal 2 karakter (nama atau kode agen)..."
                        value={editAgentSearchQuery}
                        onChange={(e) => setEditAgentSearchQuery(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 pl-8 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 absolute left-2.5 top-2.5" />

                      {editAgentSearchResults.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {editAgentSearchResults.map((ag) => (
                            <button
                              key={ag.id}
                              type="button"
                              onClick={() => {
                                setEditAgentId(ag.id);
                                setSelectedEditAgentDisplay(ag);
                                setEditAgentSearchResults([]);
                              }}
                              className="w-full text-left p-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center justify-between text-xs cursor-pointer"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">[{ag.agentCode}] {ag.name}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">({ag.peringkat || 'Agen'})</span>
                              </div>
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                                {ag.rawBranchName || 'Pilih'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-tight">
                    Pengguna ini hanya dapat melihat pohon agensinya sendiri dan seluruh downline di bawahnya.
                  </p>
                </div>
              )}

              {/* DYNAMIC SCOPING: 3. Jika OFFICER_AGENT -> Cari Agen Pemilik */}
              {editRole === 'OFFICER_AGENT' && (
                <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800">
                  <label className="block text-xs font-bold text-orange-900 dark:text-orange-200 mb-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                    Pilih Agen Pemilik / Atasan <span className="text-rose-500">*</span>
                  </label>

                  {selectedEditParentAgentDisplay ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-orange-300 dark:border-orange-700">
                      <div>
                        <span className="font-bold text-xs text-orange-950 dark:text-orange-200">
                          [{selectedEditParentAgentDisplay.agentCode}] {selectedEditParentAgentDisplay.name}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {selectedEditParentAgentDisplay.peringkat || 'Agen Leader'} · {selectedEditParentAgentDisplay.rawBranchName || 'Cabang'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEditParentAgentDisplay(null);
                          setEditParentAgentId('');
                          setEditParentAgentSearchQuery('');
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik minimal 2 karakter (nama atau kode agen pemilik)..."
                        value={editParentAgentSearchQuery}
                        onChange={(e) => setEditParentAgentSearchQuery(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-950 border border-orange-300 dark:border-orange-700 rounded-lg px-3 py-2 pl-8 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                      <Search className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 absolute left-2.5 top-2.5" />

                      {editParentAgentSearchResults.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {editParentAgentSearchResults.map((pag) => (
                            <button
                              key={pag.id}
                              type="button"
                              onClick={() => {
                                setEditParentAgentId(pag.id);
                                setSelectedEditParentAgentDisplay(pag);
                                setEditParentAgentSearchResults([]);
                              }}
                              className="w-full text-left p-2 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition flex items-center justify-between text-xs cursor-pointer"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">[{pag.agentCode}] {pag.name}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">({pag.peringkat || 'Leader'})</span>
                              </div>
                              <span className="text-[10px] bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 px-1.5 py-0.5 rounded font-semibold">
                                {pag.rawBranchName || 'Pilih'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-orange-700 dark:text-orange-400 mt-1 leading-tight">
                    Officer akan mewarisi hak akses dan lingkup data pohon yang identik dengan agen pemiliknya.
                  </p>
                </div>
              )}

              {/* Password Baru (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ubah Password (Opsional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Kosongkan jika tidak ingin mengubah password..."
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pl-9 pr-16 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                  >
                    {showEditPassword ? 'Sembunyi' : 'Lihat'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Minimal 6 karakter jika ingin mereset password pengguna ini secara langsung.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isEditSubmitting}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PASSWORD ─────────────────────────────────────────────── */}
      {isResetPasswordModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Reset Password Pengguna</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedUserForReset.name} ({selectedUserForReset.email})</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan password baru..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
