'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, Users, Mail, CreditCard, ChevronRight, 
  PlusCircle, AlertCircle, Award, CheckCircle, Shield,
  Building2, Activity, TrendingUp, Clock, Trash2, Edit2, Key,
  CalendarDays, Globe, Search, Filter, Check, X, FileText, Plus, Loader2
} from 'lucide-react';

interface BillingStatus {
  plan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  usage: {
    events: number;
    guests: number;
    templates: number;
  };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    customTemplates: boolean;
  };
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

interface AdminStats {
  stats: {
    tenants: number;
    users: number;
    events: number;
    guests: number;
  };
  tenants: Array<{
    id: string;
    name: string;
    plan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
    licenseActive: boolean;
    licenseExpiresAt: string | null;
    licenseKey: string | null;
    createdAt: string;
    managerName: string;
    managerEmail: string;
    eventsCount: number;
    usersCount: number;
  }>;
}

interface AdminUserItem {
  id: string;
  name: string | null;
  email: string;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  isEmailVerified: boolean;
  tenantName: string;
  createdAt: string;
}

interface AdminTemplateItem {
  id: string;
  name: string;
  content: any;
  isGlobal: boolean;
  tenantName: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [adminData, setAdminData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Super Admin specific states
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'templates'>('tenants');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [templates, setTemplates] = useState<AdminTemplateItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'GLOBAL' | 'TENANT'>('ALL');

  // Modals states
  const [selectedTenant, setSelectedTenant] = useState<AdminStats['tenants'][0] | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState<'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE'>('FREE');
  const [modalLicenseActive, setModalLicenseActive] = useState(true);
  const [modalLicenseExpiresAt, setModalLicenseExpiresAt] = useState('');
  const [modalLicenseKey, setModalLicenseKey] = useState('');
  const [updatingTenant, setUpdatingTenant] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<'SUPER_ADMIN' | 'COMMERCIAL' | 'USER'>('USER');
  const [modalIsEmailVerified, setModalIsEmailVerified] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (user?.role === 'SUPER_ADMIN') {
          const data = await api.get('/admin/stats');
          setAdminData(data);
        } else {
          const [billingData, eventsData] = await Promise.all([
            api.get('/billing/status'),
            api.get('/events'),
          ]);
          setBilling(billingData);
          setEvents(eventsData.slice(0, 3)); // Display only 3 recent events
        }
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError('Impossible de charger les données du tableau de bord.');
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Load users when users tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, user]);

  // Load templates when templates tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'templates') {
      loadTemplates();
    }
  }, [activeTab, user]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.get('/admin/users');
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Impossible de charger la liste des utilisateurs.');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await api.get('/admin/templates');
      setTemplates(data);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Impossible de charger la liste des modèles.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      const data = await api.get('/admin/stats');
      setAdminData(data);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  };

  // Tenant handlers
  const handleOpenLicenseModal = (t: AdminStats['tenants'][0]) => {
    setSelectedTenant(t);
    setModalPlan(t.plan);
    setModalLicenseActive(t.licenseActive);
    setModalLicenseExpiresAt(t.licenseExpiresAt ? t.licenseExpiresAt.split('T')[0] : '');
    setModalLicenseKey(t.licenseKey || '');
    setIsLicenseModalOpen(true);
  };

  const handleUpdateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setUpdatingTenant(true);
    try {
      await api.put(`/admin/tenants/${selectedTenant.id}`, {
        plan: modalPlan,
        licenseActive: modalLicenseActive,
        licenseExpiresAt: modalLicenseExpiresAt ? new Date(modalLicenseExpiresAt).toISOString() : null,
        licenseKey: modalLicenseKey || null,
      });
      setIsLicenseModalOpen(false);
      await refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour de la licence');
    } finally {
      setUpdatingTenant(false);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous absolument sûr de vouloir supprimer définitivement l'organisation "${name}" ? Cette action supprimera également tous ses utilisateurs, événements, invités et invitations associés.`)) {
      return;
    }
    if (!confirm(`CONFIRMATION FINALE : Tapez OK pour confirmer la destruction de "${name}".`)) {
      return;
    }

    try {
      await api.delete(`/admin/tenants/${id}`);
      await refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de l\'organisation');
    }
  };

  // User handlers
  const handleOpenUserModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setModalRole(u.role);
    setModalIsEmailVerified(u.isEmailVerified);
    setIsUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setUpdatingUser(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}`, {
        role: modalRole,
        isEmailVerified: modalIsEmailVerified,
      });
      setIsUserModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour de l\'utilisateur');
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${email}" ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${id}`);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de l\'utilisateur');
    }
  };

  // Template handlers
  const handleCreateGlobalTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !templateSubject || !templateBody) {
      alert('Veuillez remplir tous les champs.');
      return;
    }

    setCreatingTemplate(true);
    try {
      await api.post('/admin/templates/global', {
        name: templateName,
        content: {
          subject: templateSubject,
          body: templateBody,
        },
      });
      setIsTemplateModalOpen(false);
      setTemplateName('');
      setTemplateSubject('');
      setTemplateBody('');
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du modèle global');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${name}" ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/templates/${id}`);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression du modèle');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3 animate-pulse" />
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const getPercentage = (value: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(Math.round((value / max) * 100), 100);
  };

  // Render Super Admin Dashboard
  if (user?.role === 'SUPER_ADMIN') {
    // Filter tenants
    const filteredTenants = adminData?.tenants.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.managerEmail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlan = filterPlan === 'ALL' || t.plan === filterPlan;
      return matchesSearch && matchesPlan;
    }) || [];

    // Filter users
    const filteredUsers = users.filter(u => {
      const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'ALL' || u.role === filterRole;
      return matchesSearch && matchesRole;
    });

    // Filter templates
    const filteredTemplates = templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || 
                          (filterType === 'GLOBAL' && t.isGlobal) || 
                          (filterType === 'TENANT' && !t.isGlobal);
      return matchesSearch && matchesType;
    });

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Shield className="w-8 h-8 text-indigo-600" />
              Espace Super Admin
            </h1>
            <p className="text-slate-500 mt-1">Vue d'ensemble globale et gestion de la plateforme SaaS EventMaster.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Statistics Widgets */}
        {adminData && (
          <div className="grid sm:grid-cols-4 gap-6">
            {/* Tenants Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Organisations</span>
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.tenants}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Inscrites sur la plateforme</p>
              </div>
            </div>

            {/* Users Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Utilisateurs</span>
                <div className="bg-violet-50 text-violet-600 p-2 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.users}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Comptes actifs créés</p>
              </div>
            </div>

            {/* Events Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Événements</span>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.events}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Organisés au total</p>
              </div>
            </div>

            {/* Guests Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Invités</span>
                <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.guests}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Enregistrés dans le système</p>
              </div>
            </div>
          </div>
        )}

        {/* Global Management Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tabs header */}
          <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl self-start">
              <button
                onClick={() => { setActiveTab('tenants'); setSearchTerm(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'tenants' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Building2 className="w-4 h-4" />
                Organisations (Tenants)
              </button>
              <button
                onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Users className="w-4 h-4" />
                Utilisateurs
              </button>
              <button
                onClick={() => { setActiveTab('templates'); setSearchTerm(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'templates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FileText className="w-4 h-4" />
                Modèles d'Invitation
              </button>
            </div>

            {activeTab === 'templates' && (
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-md shadow-indigo-100"
              >
                <Plus className="w-4 h-4" />
                Créer un Modèle Global
              </button>
            )}
          </div>

          {/* Filters and search */}
          <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'tenants' ? "Rechercher une organisation, un gérant..." :
                  activeTab === 'users' ? "Rechercher un utilisateur, un email, une organisation..." :
                  "Rechercher un modèle..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {activeTab === 'tenants' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tous les plans</option>
                  <option value="FREE">FREE</option>
                  <option value="STANDARD">STANDARD</option>
                  <option value="PREMIUM">PREMIUM</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tous les rôles</option>
                  <option value="USER">USER</option>
                  <option value="COMMERCIAL">COMMERCIAL</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tous les modèles</option>
                  <option value="GLOBAL">Modèles Globaux (Publics)</option>
                  <option value="TENANT">Modèles d'organisations</option>
                </select>
              </div>
            )}
          </div>

          {/* Content area */}
          <div className="p-6 bg-white">
            {/* Tenants Tab */}
            {activeTab === 'tenants' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Nom de l'organisation</th>
                      <th className="pb-3 font-semibold">Plan</th>
                      <th className="pb-3 font-semibold">Licence / Clé</th>
                      <th className="pb-3 font-semibold">Administrateur</th>
                      <th className="pb-3 font-semibold text-center">Membres</th>
                      <th className="pb-3 font-semibold text-center">Événements</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                          Aucune organisation trouvée.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{t.name}</span>
                              <span className="text-xs text-slate-400">Inscrite le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                              t.plan === 'FREE' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                              t.plan === 'STANDARD' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                              t.plan === 'PREMIUM' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                              'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                              {t.plan}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                t.licenseActive 
                                  ? (t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date() ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700')
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                {t.licenseActive 
                                  ? (t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date() ? 'Expirée' : 'Active')
                                  : 'Désactivée'
                                }
                              </span>
                              {t.licenseExpiresAt && (
                                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  Exp : {new Date(t.licenseExpiresAt).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                              {t.licenseKey && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-150 font-mono select-all truncate max-w-[120px]" title={t.licenseKey}>
                                  {t.licenseKey}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{t.managerName}</span>
                              <span className="text-xs text-slate-400">{t.managerEmail}</span>
                            </div>
                          </td>
                          <td className="py-4 text-center font-bold text-slate-700">{t.usersCount}</td>
                          <td className="py-4 text-center font-bold text-indigo-600">{t.eventsCount}</td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenLicenseModal(t)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Gérer la licence et le plan"
                              >
                                <Key className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTenant(t.id, t.name)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Supprimer l'organisation"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                {usersLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement des utilisateurs...</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Utilisateur</th>
                        <th className="pb-3 font-semibold">Rôle</th>
                        <th className="pb-3 font-semibold">Vérification Email</th>
                        <th className="pb-3 font-semibold">Organisation (Tenant)</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                            Aucun utilisateur trouvé.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{u.name || 'Sans nom'}</span>
                                <span className="text-xs text-slate-400">{u.email}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                u.role === 'SUPER_ADMIN' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                u.role === 'COMMERCIAL' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                u.isEmailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {u.isEmailVerified ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                {u.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
                              </span>
                            </td>
                            <td className="py-4 font-semibold text-slate-700">{u.tenantName}</td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenUserModal(u)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Modifier le rôle / statut"
                                >
                                  <Edit2 className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Supprimer l'utilisateur"
                                  disabled={u.id === user.id} // Cannot delete self
                                >
                                  <Trash2 className={`w-4.5 h-4.5 ${u.id === user.id ? 'opacity-30 cursor-not-allowed' : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="overflow-x-auto">
                {templatesLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement des modèles...</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Modèle</th>
                        <th className="pb-3 font-semibold">Type</th>
                        <th className="pb-3 font-semibold">Sujet par défaut</th>
                        <th className="pb-3 font-semibold">Créateur / Organisation</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredTemplates.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                            Aucun modèle trouvé.
                          </td>
                        </tr>
                      ) : (
                        filteredTemplates.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{t.name}</span>
                                <span className="text-xs text-slate-400">Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                t.isGlobal ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                {t.isGlobal ? <Globe className="w-3.5 h-3.5" /> : null}
                                {t.isGlobal ? 'GLOBAL (Public)' : 'Privé'}
                              </span>
                            </td>
                            <td className="py-4 text-slate-600 font-medium max-w-[200px] truncate" title={t.content?.subject}>
                              {t.content?.subject || 'Aucun'}
                            </td>
                            <td className="py-4 font-semibold text-slate-700">{t.tenantName}</td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDeleteTemplate(t.id, t.name)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Supprimer le modèle"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Manage Tenant License */}
        {isLicenseModalOpen && selectedTenant && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  Gérer la Licence : {selectedTenant.name}
                </h3>
                <button 
                  onClick={() => setIsLicenseModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateLicense} className="p-6 space-y-5">
                {/* Forfait / Plan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forfait d'Abonnement</label>
                  <select
                    value={modalPlan}
                    onChange={(e) => setModalPlan(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  >
                    <option value="FREE">FREE</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>

                {/* License Active */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-150">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-800">Statut de la Licence</div>
                    <div className="text-xs text-slate-500">Activer ou suspendre l'accès de l'organisation</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalLicenseActive(!modalLicenseActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${modalLicenseActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${modalLicenseActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Expiration Date */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    Date d'Expiration
                  </label>
                  <input
                    type="date"
                    value={modalLicenseExpiresAt}
                    onChange={(e) => setModalLicenseExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">Laissez vide pour une licence à durée illimitée.</p>
                </div>

                {/* License Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clé de Licence Personnalisée</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Générer ou saisir une clé..."
                      value={modalLicenseKey}
                      onChange={(e) => setModalLicenseKey(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setModalLicenseKey(`LIC-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                    >
                      Générer
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLicenseModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updatingTenant}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
                  >
                    {updatingTenant ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit User */}
        {isUserModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                  Modifier l'Utilisateur : {selectedUser.email}
                </h3>
                <button 
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-5">
                {/* Rôle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle de l'Utilisateur</label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  >
                    <option value="USER">USER</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                {/* Email Verified */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-150">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-800">Vérification de l'Email</div>
                    <div className="text-xs text-slate-500">Marquer l'adresse email comme confirmée</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalIsEmailVerified(!modalIsEmailVerified)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${modalIsEmailVerified ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${modalIsEmailVerified ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updatingUser}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
                  >
                    {updatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Global Template */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-indigo-600" />
                  Créer un Modèle Global (Public)
                </h3>
                <button 
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGlobalTemplate} className="p-6 space-y-5">
                {/* Nom */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom du Modèle</label>
                  <input
                    type="text"
                    placeholder="Ex: Invitation Mariage Standard, Relance..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
                    required
                  />
                </div>

                {/* Sujet */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sujet du Message par Défaut</label>
                  <input
                    type="text"
                    placeholder="Ex: Vous êtes invité à l'événement {{title}} !"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    required
                  />
                </div>

                {/* Corps */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corps du Message par Défaut</label>
                  <textarea
                    rows={6}
                    placeholder="Ex: Bonjour {{firstName}},\n\nVous êtes cordialement invité à l'événement {{title}} qui aura lieu le {{date}} à {{location}}.\n\nVeuillez confirmer votre présence ici : {{rsvpLink}}\n\nCordialement,"
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-sans"
                    required
                  />
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Variables disponibles :</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['{{firstName}}', '{{lastName}}', '{{title}}', '{{date}}', '{{location}}', '{{rsvpLink}}'].map(v => (
                        <span key={v} className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTemplate}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
                  >
                    {creatingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Créer le modèle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Regular Tenant Dashboard
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-slate-500 mt-1">Bienvenue dans votre espace d'administration de gestion d'événements privés.</p>
        </div>
        <Link 
          href="/dashboard/events" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-100 text-sm"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          Créer un événement
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quotas & Usage Widgets */}
      {billing && (
        <div className="grid sm:grid-cols-3 gap-6">
          {/* Events Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Événements</span>
              <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{billing.usage.events}</span>
                <span className="text-slate-500 text-sm">/ {billing.limits.maxEvents === 9999 ? 'illimité' : billing.limits.maxEvents}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercentage(billing.usage.events, billing.limits.maxEvents)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                {getPercentage(billing.usage.events, billing.limits.maxEvents)}% du quota utilisé
              </p>
            </div>
          </div>

          {/* Guests Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Invités Totaux</span>
              <div className="bg-violet-50 text-violet-600 p-2 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{billing.usage.guests}</span>
                <span className="text-slate-500 text-sm">/ {billing.limits.maxGuests === 99999 ? 'illimité' : billing.limits.maxGuests}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className="bg-violet-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercentage(billing.usage.guests, billing.limits.maxGuests)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                {getPercentage(billing.usage.guests, billing.limits.maxGuests)}% du quota utilisé
              </p>
            </div>
          </div>

          {/* Templates Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Modèles d'Invitation</span>
              <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{billing.usage.templates}</span>
                <span className="text-slate-500 text-sm">/ {billing.limits.maxTemplates === 9999 ? 'illimité' : billing.limits.maxTemplates}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercentage(billing.usage.templates, billing.limits.maxTemplates)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                {getPercentage(billing.usage.templates, billing.limits.maxTemplates)}% du quota utilisé
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Row */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Events List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Événements Récents</h2>
            <Link href="/dashboard/events" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1">
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-700">Aucun événement</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Vous n'avez pas encore d'événement. Créez-en un pour commencer à inviter des personnes.</p>
              <Link 
                href="/dashboard/events" 
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
              >
                Créer mon premier événement
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="p-4 border border-slate-150 rounded-xl hover:bg-slate-50 transition flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900">{event.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {event.location}
                    </p>
                    {event.description && <p className="text-sm text-slate-600 line-clamp-1">{event.description}</p>}
                  </div>
                  <Link 
                    href={`/dashboard/events?id=${event.id}`}
                    className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans">Statut d'Abonnement</h2>
            
            {billing && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-150">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Forfait Actuel</div>
                    <div className="text-xl font-black text-indigo-950 mt-0.5">{billing.plan}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Isolation Stricte des Données</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>RSVP Web Dynamique</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {billing.limits.customTemplates ? (
                      <span>Modèles d'Invitation Customisés</span>
                    ) : (
                      <span className="line-through text-slate-400">Modèles d'Invitation Customisés</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <Link 
              href="/dashboard/billing" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-slate-100"
            >
              <CreditCard className="w-4.5 h-4.5" />
              Gérer la facturation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
