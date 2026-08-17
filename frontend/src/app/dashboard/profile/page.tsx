'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  User, Mail, Phone, Lock, Building, Loader2,
  Save, Award, Calendar, Palette,
} from 'lucide-react';
import { PageHeader, Alert, SkeletonProfileView, Button, Breadcrumbs, Input } from '@/components/ui';
import { ACCOUNT_KIND_DESCRIPTIONS, ACCOUNT_KIND_LABELS, type TenantAccountKind } from '@/lib/marketplace';
import { paidPlanIdsForAccountKind } from '@/config/landingPricing';

function ProfilePageContent() {
  const { user, tenant, updateUserAndTenant, updateBranding, access, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [accountKind, setAccountKind] = useState<TenantAccountKind>('ORGANIZER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [brandPrimary, setBrandPrimary] = useState('#4f46e5');
  const [brandAccent, setBrandAccent] = useState('#6366f1');
  const [brandSaving, setBrandSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isClient = access?.level === 'client' || tenant?.accountKind === 'CLIENT';
  const currentPlan = tenant?.plan || 'FREE';
  const kindChangeResetsPlan =
    Boolean(tenant) &&
    accountKind !== tenant?.accountKind &&
    (accountKind === 'CLIENT' ||
      (currentPlan !== 'FREE' && !paidPlanIdsForAccountKind(accountKind).includes(currentPlan)));

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'salles') {
      router.replace('/dashboard/rooms');
      return;
    }
    if (tab === 'equipe') {
      router.replace('/dashboard/team');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
    if (tenant) {
      setTenantName(tenant.name || '');
      setAccountKind(tenant.accountKind || 'ORGANIZER');
      setBrandPrimary(tenant.branding?.primary || '#4f46e5');
      setBrandAccent(tenant.branding?.accent || '#6366f1');
    }
  }, [user, tenant]);

  const canEditBranding = Boolean(
    !isClient && user?.role === 'USER' && tenant && (access?.isOwner || access?.level === 'manager'),
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
        accountKind: user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMMERCIAL' ? accountKind : undefined,
      });

      updateUserAndTenant(data.user, data.tenant);
      await refreshProfile();
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

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Mon compte"
        description="Informations personnelles, contact et sécurité du compte."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard' },
              { label: 'Mon compte' },
            ]}
          />
        }
      />

      {/* En-tête profil compact */}
      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-[var(--radius-button)] bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground tracking-tight truncate">{name || 'Utilisateur'}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted">
              <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border font-medium uppercase tracking-wide text-[10px]">
                {user?.role}
              </span>
              {tenant && (
                <span className="inline-flex items-center gap-1 truncate">
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  {tenant.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {tenant && user?.role === 'USER' && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-button)] bg-surface-muted border border-border shrink-0">
            <Award className="w-4 h-4 text-primary" />
            <div>
              <div className="text-xs font-semibold text-foreground">Plan {tenant.plan}</div>
              {tenant.licenseExpiresAt ? (
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <Calendar className="w-3 h-3" />
                  Expire le {new Date(tenant.licenseExpiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              ) : (
                <div className="text-[11px] text-emerald-600 font-medium">Licence active</div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <User className="w-4 h-4 text-primary" />
                  Informations personnelles
                </h2>
                <div className="space-y-3">
                  <Input label="Nom complet" leftIcon={<User className="w-4 h-4" />} required value={name} onChange={(e) => setName(e.target.value)} />
                  <Input label="E-mail" type="email" leftIcon={<Mail className="w-4 h-4" />} required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input label="Téléphone (WhatsApp)" type="tel" leftIcon={<Phone className="w-4 h-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243..." />
                  {user?.role === 'USER' && tenant && (
                    <>
                    <Input
                      label={isClient ? 'Nom affiché' : 'Nom de l\'organisation'}
                      leftIcon={<Building className="w-4 h-4" />}
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                    />
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted">Type de compte</span>
                      <select
                        value={accountKind}
                        onChange={(e) => setAccountKind(e.target.value as TenantAccountKind)}
                        className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
                      >
                        {(Object.keys(ACCOUNT_KIND_LABELS) as TenantAccountKind[]).map((kind) => (
                          <option key={kind} value={kind}>{ACCOUNT_KIND_LABELS[kind]}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-muted">
                        {isClient
                          ? 'Passez organisateur pour créer des événements, ou prestataire pour publier des offres.'
                          : (
                            <>
                              Propriétaire de salles ou prestataire : publiez vos offres dans le{' '}
                              <Link href="/marketplace" className="text-primary font-semibold hover:underline">catalogue public</Link>
                              {' '}et gérez devis et réservations dans{' '}
                              <Link href="/dashboard/marketplace" className="text-primary font-semibold hover:underline">Marketplace</Link>.
                            </>
                          )}
                      </p>
                      {kindChangeResetsPlan && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-[var(--radius-button)] p-2">
                          Le forfait actuel n’est pas destiné à ce type de compte. L’enregistrement passera l’espace à l’essai Essentials ; choisissez ensuite un forfait adapté dans Facturation.
                        </p>
                      )}
                      {ACCOUNT_KIND_DESCRIPTIONS[accountKind] && (
                        <p className="text-[11px] text-muted">{ACCOUNT_KIND_DESCRIPTIONS[accountKind]}</p>
                      )}
                    </label>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <Lock className="w-4 h-4 text-primary" />
                  Sécurité
                </h2>
                <div className="space-y-3">
                  <Input label="Nouveau mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Laisser vide pour ne pas modifier" minLength={6} />
                  <Input label="Confirmer" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Laisser vide pour ne pas modifier" minLength={6} />
                  <p className="text-xs text-muted bg-surface-muted border border-border rounded-[var(--radius-button)] p-3">
                    Minimum 6 caractères. Laissez vide si vous ne souhaitez pas changer le mot de passe.
                  </p>
                </div>
              </div>
            </div>

            {canEditBranding && (
              <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <Palette className="w-4 h-4 text-primary" />
                  Couleurs de l&apos;organisation
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  Marque partagée pour toute l&apos;équipe : boutons, liens actifs et accents du tableau de bord.
                  Distinct de l&apos;accent personnel (icône palette dans l&apos;en-tête), qui ne s&apos;applique qu&apos;à cet appareil et peut masquer temporairement ces couleurs.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs font-medium text-muted">
                    Couleur principale
                    <div className="flex items-center gap-3">
                      <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="h-10 w-14 rounded-[var(--radius-button)] border border-border cursor-pointer bg-transparent" />
                      <input type="text" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="flex-1 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm font-mono" />
                    </div>
                  </label>
                  <label className="space-y-1.5 text-xs font-medium text-muted">
                    Couleur d&apos;accent
                    <div className="flex items-center gap-3">
                      <input type="color" value={brandAccent} onChange={(e) => setBrandAccent(e.target.value)} className="h-10 w-14 rounded-[var(--radius-button)] border border-border cursor-pointer bg-transparent" />
                      <input type="text" value={brandAccent} onChange={(e) => setBrandAccent(e.target.value)} className="flex-1 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm font-mono" />
                    </div>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" loading={brandSaving} onClick={handleSaveBranding} leftIcon={<Save className="w-3.5 h-3.5" />}>
                    Enregistrer les couleurs
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={brandSaving} onClick={handleResetBranding}>
                    Réinitialiser
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={loading} leftIcon={<Save className="w-4 h-4" />}>
                Enregistrer le profil
              </Button>
            </div>
          </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<SkeletonProfileView />}>
      <ProfilePageContent />
    </Suspense>
  );
}
