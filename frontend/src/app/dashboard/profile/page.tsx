'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  User, Mail, Phone, Lock, Building, Loader2,
  Save, Award, Calendar, Users, LayoutGrid, Palette,
} from 'lucide-react';
import TeamManagement from '../TeamManagement';
import RoomsManagement from '../RoomsManagement';
import { PageHeader, Alert, SkeletonProfileView } from '@/components/ui';
import { cn } from '@/lib/cn';

type ProfileTab = 'profil' | 'salles' | 'equipe';

function ProfilePageContent() {
  const { user, tenant, updateUserAndTenant, updateBranding, access } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [brandPrimary, setBrandPrimary] = useState('#4f46e5');
  const [brandAccent, setBrandAccent] = useState('#6366f1');
  const [brandSaving, setBrandSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManageRooms = Boolean(user?.role === 'USER' && tenant && access?.canManageRooms);
  const canManageTeam = Boolean(user?.role === 'USER' && tenant && access?.canManageTeam);

  const tabs = useMemo(() => {
    const items: Array<{ id: ProfileTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
      { id: 'profil', label: 'Mon profil', icon: User },
    ];
    if (canManageRooms) {
      items.push({ id: 'salles', label: 'Salles', icon: LayoutGrid });
    }
    if (canManageTeam) {
      items.push({ id: 'equipe', label: 'Équipe', icon: Users });
    }
    return items;
  }, [canManageRooms, canManageTeam]);

  const tabParam = searchParams.get('tab') as ProfileTab | null;
  const activeTab: ProfileTab =
    tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : 'profil';

  const setActiveTab = (tab: ProfileTab) => {
    router.replace(`/dashboard/profile?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (tabParam && !tabs.some((t) => t.id === tabParam)) {
      router.replace('/dashboard/profile?tab=profil', { scroll: false });
    }
  }, [tabParam, tabs, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
    if (tenant) {
      setTenantName(tenant.name || '');
      setBrandPrimary(tenant.branding?.primary || '#4f46e5');
      setBrandAccent(tenant.branding?.accent || '#6366f1');
    }
  }, [user, tenant]);

  const canEditBranding = Boolean(
    user?.role === 'USER' && tenant && (access?.isOwner || access?.level === 'manager'),
  );

  const handleSaveBranding = async () => {
    setError('');
    setSuccess('');
    setBrandSaving(true);
    try {
      await updateBranding({ primary: brandPrimary, accent: brandAccent });
      setSuccess('Couleurs de marque enregistrées.');
    } catch (err: any) {
      setError(err.message || 'Impossible d\'enregistrer les couleurs.');
    } finally {
      setBrandSaving(false);
    }
  };

  const handleResetBranding = async () => {
    setBrandSaving(true);
    setError('');
    try {
      await updateBranding({ reset: true });
      setBrandPrimary('#4f46e5');
      setBrandAccent('#6366f1');
      setSuccess('Couleurs EventMaster restaurées.');
    } catch (err: any) {
      setError(err.message || 'Réinitialisation impossible.');
    } finally {
      setBrandSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.put('/auth/profile', {
        name,
        email,
        phone,
        password: password || undefined,
        tenantName: user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMMERCIAL' ? tenantName : undefined,
      });

      updateUserAndTenant(data.user, data.tenant);
      setSuccess(data.message || 'Profil mis à jour avec succès !');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (userName: string) => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const tabDescriptions: Record<ProfileTab, string> = {
    profil: 'Informations personnelles, contact et sécurité du compte.',
    salles: 'Salles de l\'organisation, plans 2D et staff assigné.',
    equipe: 'Managers, agents protocole et commerciaux de l\'organisation.',
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <PageHeader
        title="Mon compte"
        description={tabDescriptions[activeTab]}
      />

      {/* En-tête profil (toujours visible) */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute inset-0 bg-grid-slate-100/[0.02] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 border-2 border-indigo-400 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-500/20">
            {getInitials(name)}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">{name || 'Utilisateur'}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-slate-300 font-semibold">
              <span className="bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {user?.role}
              </span>
              {tenant && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  {tenant.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {tenant && user?.role === 'USER' && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 min-w-[220px] relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonnement</span>
            </div>
            <div>
              <div className="text-lg font-black text-white">Plan {tenant.plan}</div>
              {tenant.licenseExpiresAt ? (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Expire le {new Date(tenant.licenseExpiresAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              ) : (
                <div className="text-[11px] text-emerald-400 font-medium mt-1">Licence active</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Onglets */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeTab === id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Contenu par onglet */}
      {activeTab === 'profil' && (
        <>
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <User className="w-5 h-5 text-indigo-600" />
                  Informations personnelles
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom complet</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Téléphone (WhatsApp)</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="+243..."
                      />
                    </div>
                  </div>

                  {user?.role === 'USER' && tenant && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom de l&apos;organisation</label>
                      <div className="relative">
                        <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={tenantName}
                          onChange={(e) => setTenantName(e.target.value)}
                          className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  Sécurité
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Laisser vide pour ne pas modifier"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmer</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Laisser vide pour ne pas modifier"
                      minLength={6}
                    />
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 border rounded-xl p-3">
                    Minimum 6 caractères. Laissez vide si vous ne souhaitez pas changer le mot de passe.
                  </p>
                </div>
              </div>
            </div>

            {canEditBranding && (
              <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 space-y-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <Palette className="w-5 h-5 text-primary" />
                  Couleurs de l&apos;organisation
                </h2>
                <p className="text-xs text-muted">
                  Ces couleurs s&apos;appliquent au tableau de bord (boutons, liens actifs, accents).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs font-semibold text-muted">
                    Primary
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-muted text-sm font-mono"
                      />
                    </div>
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-muted">
                    Accent
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandAccent}
                        onChange={(e) => setBrandAccent(e.target.value)}
                        className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={brandAccent}
                        onChange={(e) => setBrandAccent(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-muted text-sm font-mono"
                      />
                    </div>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={brandSaving}
                    onClick={handleSaveBranding}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg disabled:opacity-50"
                  >
                    {brandSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Enregistrer les couleurs
                  </button>
                  <button
                    type="button"
                    disabled={brandSaving}
                    onClick={handleResetBranding}
                    className="px-4 py-2 border border-border text-xs font-bold rounded-lg text-muted hover:text-foreground"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </form>
        </>
      )}

      {activeTab === 'salles' && canManageRooms && <RoomsManagement />}
      {activeTab === 'equipe' && canManageTeam && <TeamManagement />}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={<SkeletonProfileView />}
    >
      <ProfilePageContent />
    </Suspense>
  );
}
