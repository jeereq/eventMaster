'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Users, UserPlus, Trash2, Loader2, Crown, Mail, Phone,
  Shield, Briefcase, MessageSquare, TrendingUp, Copy, RefreshCw,
} from 'lucide-react';
import {
  SkeletonGrid, ViewModeToggle, useViewMode, listStackClass,
  ProjectCard, StatusPill, ListRowAction, PhoneInput,
  Button, Modal, EmptyState, Alert, Input, Badge, Pagination, paginateItems, usePageSize,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import { getQuotaActionMessage } from '@/lib/planAccess';
import PlanLimitCallout from '@/components/PlanLimitCallout';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  phoneCountryCode?: string | null;
  orgRole: 'MANAGER' | 'PROTOCOL' | 'COMMERCIAL' | null;
  orgRoleLabel: string;
  referralCode?: string | null;
  commissionRate?: number | null;
  renewalCommissionRate?: number | null;
  isEmailVerified: boolean;
  createdAt: string;
  isOwner: boolean;
}

const orgRoleLabels: Record<string, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Manager organisation',
  PROTOCOL: 'Protocole organisation',
  COMMERCIAL: 'Commercial organisation',
};

const ROLE_OPTIONS = [
  {
    id: 'MANAGER' as const,
    label: 'Manager',
    description: 'Gère salles, équipe et événements.',
    icon: Shield,
  },
  {
    id: 'PROTOCOL' as const,
    label: 'Protocole',
    description: 'Accueil, check-in et suivi invités.',
    icon: Briefcase,
  },
  {
    id: 'COMMERCIAL' as const,
    label: 'Commercial',
    description: 'Apporte des clients et suit ses commissions.',
    icon: TrendingUp,
    requiresCommercial: true,
  },
];

export default function TeamManagement() {
  const { user, tenant, planQuota, planFeatures, access } = useAuth();
  const {
    mode: teamViewMode,
    setViewMode: setTeamViewMode,
    columns: teamColumns,
    setGridColumns: setTeamColumns,
    gridClassName: teamGridClass,
  } = useViewMode('em-view-team', 'grid', 2);
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = usePageSize('org-team', 10);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [defaultCommissionRate, setDefaultCommissionRate] = useState(0.3);
  const [defaultRenewalCommissionRate, setDefaultRenewalCommissionRate] = useState(0.2);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState('');
  const [password, setPassword] = useState('');
  const [orgRole, setOrgRole] = useState<'MANAGER' | 'PROTOCOL' | 'COMMERCIAL'>('MANAGER');
  const [commissionRate, setCommissionRate] = useState('30');
  const [renewalCommissionRate, setRenewalCommissionRate] = useState('20');
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [editCommissionValue, setEditCommissionValue] = useState('');
  const [editRenewalCommissionValue, setEditRenewalCommissionValue] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const hasCommercialNetwork = planFeatures?.commercialNetwork === true;

  const managerCount = members.filter((m) => m.orgRole === 'MANAGER' || m.isOwner).length;
  const maxManagers = planQuota?.limits.maxOrgManagers ?? null;
  const managersAtLimit = maxManagers !== null && maxManagers < 9999 && managerCount >= maxManagers;

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await api.get('/team');
      setMembers(data.members || []);
      setCanManageTeam(Boolean(data.access?.canManageTeam ?? data.isManager));
      if (data.orgCommercialSettings?.defaultCommissionRate != null) {
        setDefaultCommissionRate(data.orgCommercialSettings.defaultCommissionRate);
      }
      if (data.orgCommercialSettings?.defaultRenewalCommissionRate != null) {
        setDefaultRenewalCommissionRate(data.orgCommercialSettings.defaultRenewalCommissionRate);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger l\'équipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'USER' && tenant) {
      loadTeam();
    }
  }, [user, tenant]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhoneCountryCode(DEFAULT_PHONE_COUNTRY_CODE);
    setPhoneNational('');
    setPassword('');
    setOrgRole('MANAGER');
    setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
    setRenewalCommissionRate(String(Math.round(defaultRenewalCommissionRate * 100)));
    setVerificationMethod('EMAIL');
  };

  const openForm = () => {
    resetForm();
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    if (verificationMethod === 'WHATSAPP' && !phoneNational.trim()) {
      setError('Le téléphone est obligatoire pour envoyer le code OTP par WhatsApp.');
      setSubmitting(false);
      return;
    }
    if (orgRole === 'MANAGER' && managersAtLimit) {
      setError(getQuotaActionMessage('orgManagers', planQuota, tenant?.plan));
      setSubmitting(false);
      return;
    }
    try {
      const e164 = composeE164(phoneCountryCode, phoneNational) || undefined;
      const payload: Record<string, unknown> = {
        name,
        email,
        password,
        phone: e164,
        phoneCountryCode,
        nationalNumber: phoneNational,
        orgRole,
        verificationMethod,
      };
      if (orgRole === 'COMMERCIAL') {
        payload.commissionRate = parseFloat(commissionRate) / 100;
        payload.renewalCommissionRate = parseFloat(renewalCommissionRate) / 100;
      }
      const data = await api.post('/team', payload);
      setSuccess(data.message || 'Utilisateur créé.');
      closeForm();
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: 'MANAGER' | 'PROTOCOL' | 'COMMERCIAL') => {
    try {
      await api.put(`/team/${member.id}`, { orgRole: newRole });
      setSuccess('Rôle mis à jour.');
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du rôle.');
    }
  };

  const handleSaveCommission = async (memberId: string) => {
    try {
      await api.put(`/team/${memberId}/commission`, {
        commissionRate: parseFloat(editCommissionValue) / 100,
        renewalCommissionRate: parseFloat(editRenewalCommissionValue) / 100,
      });
      setSuccess('Commission mise à jour.');
      setEditingCommissionId(null);
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de la commission.');
    }
  };

  const handleResendOtp = async (member: TeamMember) => {
    setResendingId(member.id);
    setError('');
    setSuccess('');
    try {
      const data = await api.post(`/team/${member.id}/resend-verification`);
      setSuccess(data.message || 'Code OTP renvoyé.');
    } catch (err: any) {
      setError(err.message || 'Impossible de renvoyer le code OTP.');
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (member.isOwner) return;
    if (!confirm(`Supprimer l'utilisateur ${member.name || member.email} de l'organisation ?`)) return;
    try {
      await api.delete(`/team/${member.id}`);
      setSuccess('Utilisateur supprimé.');
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  if (user?.role !== 'USER' || !tenant) return null;

  const visibleRoles = ROLE_OPTIONS.filter((r) => !r.requiresCommercial || hasCommercialNetwork);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Équipe de l&apos;organisation
          </h2>
          <p className="text-xs text-muted mt-1">
            Invitez managers, protocole{hasCommercialNetwork ? ' et commerciaux' : ''}.
            {planQuota && maxManagers !== null && (
              <span className="block mt-1 font-medium text-primary">
                Managers : {managerCount} / {maxManagers >= 9999 ? '∞' : maxManagers}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {members.length > 0 && (
            <ViewModeToggle
              storageKey="em-view-team"
              value={teamViewMode}
              onChange={setTeamViewMode}
              columns={teamColumns}
              onColumnsChange={setTeamColumns}
              defaultMode="grid"
              defaultColumns={2}
            />
          )}
          {canManageTeam && (
            <Button type="button" size="sm" onClick={openForm} leftIcon={<UserPlus className="w-4 h-4" />}>
              Ajouter un membre
            </Button>
          )}
        </div>
      </div>

      {managersAtLimit && (
        <PlanLimitCallout kind="orgManagers" planQuota={planQuota} planName={tenant?.plan} />
      )}

      {hasCommercialNetwork && canManageTeam && (
        <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            Commission commerciale par défaut
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted block mb-1.5">
                1er paiement (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(defaultCommissionRate * 100)}
                onChange={(e) => setDefaultCommissionRate(parseFloat(e.target.value) / 100 || 0)}
                className="w-24 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted block mb-1.5">
                Paiements suivants (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(defaultRenewalCommissionRate * 100)}
                onChange={(e) => setDefaultRenewalCommissionRate(parseFloat(e.target.value) / 100 || 0)}
                className="w-24 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface text-sm"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await api.put('/team/commercial-settings', {
                    defaultCommissionRate,
                    defaultRenewalCommissionRate,
                  });
                  setSuccess('Commissions par défaut enregistrées.');
                  await loadTeam();
                } catch (err: any) {
                  setError(err.message || 'Erreur lors de la mise à jour.');
                }
              }}
            >
              Enregistrer
            </Button>
          </div>
          <p className="text-[11px] text-muted">
            30 % au premier paiement et 20 % ensuite, sauf personnalisation par commercial.
            {access?.canViewBilling && (
              <>
                {' '}
                <Link href="/dashboard/billing/payouts" className="text-primary hover:underline font-semibold">
                  Verser les commissions dues
                </Link>
                {' '}(hors plateforme, avec preuve).
              </>
            )}
          </p>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Modal
        open={showForm && canManageTeam}
        onClose={closeForm}
        title="Ajouter un membre"
        description="Créez un compte et envoyez un code OTP pour validation."
        size="lg"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeForm}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="team-create-form"
              size="sm"
              loading={submitting}
              disabled={orgRole === 'MANAGER' && managersAtLimit}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Créer le compte
            </Button>
          </div>
        }
      >
        <form id="team-create-form" onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nom complet" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" />
            <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="w-4 h-4" />} />
            <PhoneInput
              label="Téléphone WhatsApp"
              countryCode={phoneCountryCode}
              national={phoneNational}
              onCountryCodeChange={setPhoneCountryCode}
              onNationalChange={setPhoneNational}
              required={verificationMethod === 'WHATSAPP'}
              hint="Indicatif pays + numéro national (sans le 0)."
            />
            <Input label="Mot de passe temporaire" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} hint="Minimum 6 caractères" />
          </div>

          <div>
            <p className="text-xs font-medium text-muted mb-2">Validation du compte (OTP)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVerificationMethod('EMAIL')}
                className={cn(
                  'py-2.5 px-3 rounded-[var(--radius-button)] border text-xs font-medium flex items-center justify-center gap-2 transition-colors',
                  verificationMethod === 'EMAIL'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'border-border text-muted hover:bg-surface-muted',
                )}
              >
                <Mail className="w-4 h-4" /> E-mail
              </button>
              <button
                type="button"
                onClick={() => setVerificationMethod('WHATSAPP')}
                className={cn(
                  'py-2.5 px-3 rounded-[var(--radius-button)] border text-xs font-medium flex items-center justify-center gap-2 transition-colors',
                  verificationMethod === 'WHATSAPP'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                    : 'border-border text-muted hover:bg-surface-muted',
                )}
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted mb-2">Rôle dans l&apos;organisation</p>
            <div className={cn('grid gap-2', visibleRoles.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              {visibleRoles.map(({ id, label, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOrgRole(id)}
                  className={cn(
                    'text-left p-3 rounded-[var(--radius-card)] border transition-colors',
                    orgRole === id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-surface-muted',
                  )}
                >
                  <Icon className={cn('w-4 h-4 mb-2', orgRole === id ? 'text-primary' : 'text-muted')} />
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {orgRole === 'COMMERCIAL' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="1er paiement (%)"
                type="number"
                min={0}
                max={100}
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
              <Input
                label="Paiements suivants (%)"
                type="number"
                min={0}
                max={100}
                value={renewalCommissionRate}
                onChange={(e) => setRenewalCommissionRate(e.target.value)}
              />
            </div>
          )}

          {orgRole === 'MANAGER' && managersAtLimit && (
            <PlanLimitCallout kind="orgManagers" planQuota={planQuota} planName={tenant?.plan} compact />
          )}
        </form>
      </Modal>

      {loading ? (
        <SkeletonGrid count={4} columns={2} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Aucun membre pour l’instant"
          description="Ajoutez un manager ou un agent protocole pour déléguer la gestion des événements."
          action={
            canManageTeam ? (
              <Button type="button" size="sm" onClick={openForm} leftIcon={<UserPlus className="w-4 h-4" />}>
                Ajouter un membre
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={teamViewMode === 'list' ? listStackClass : teamGridClass}>
          {paginateItems(members, membersPage, membersPageSize).map((member) => {
            const roleTone =
              member.isOwner
                ? 'amber'
                : member.orgRole === 'PROTOCOL'
                  ? 'violet'
                  : member.orgRole === 'COMMERCIAL'
                    ? 'amber'
                    : 'primary';
            const roleLabel = member.isOwner
              ? 'Propriétaire'
              : orgRoleLabels[member.orgRoleLabel] || member.orgRoleLabel;

            const managementExtras = (
              <>
                {!member.isEmailVerified && canManageTeam && (
                  <button
                    type="button"
                    onClick={() => handleResendOtp(member)}
                    disabled={resendingId === member.id}
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border border-border text-muted hover:bg-surface-muted inline-flex items-center gap-1"
                  >
                    {resendingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Renvoyer OTP
                  </button>
                )}
                {member.orgRole === 'COMMERCIAL' && canManageTeam && !member.isOwner && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingCommissionId === member.id ? (
                      <>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editCommissionValue}
                          onChange={(e) => setEditCommissionValue(e.target.value)}
                          className="w-16 px-2 py-1 rounded-[var(--radius-button)] border border-border text-xs"
                          title="1er paiement"
                        />
                        <span className="text-xs text-muted">puis</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editRenewalCommissionValue}
                          onChange={(e) => setEditRenewalCommissionValue(e.target.value)}
                          className="w-16 px-2 py-1 rounded-[var(--radius-button)] border border-border text-xs"
                          title="Paiements suivants"
                        />
                        <span className="text-xs text-muted">%</span>
                        <Button type="button" size="sm" variant="success" onClick={() => handleSaveCommission(member.id)}>
                          OK
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCommissionId(null)}>
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommissionId(member.id);
                          setEditCommissionValue(String(Math.round((member.commissionRate ?? defaultCommissionRate) * 100)));
                          setEditRenewalCommissionValue(String(Math.round((member.renewalCommissionRate ?? defaultRenewalCommissionRate) * 100)));
                        }}
                        className="text-[10px] font-semibold px-2 py-1 rounded-md border border-border text-muted hover:bg-surface-muted"
                      >
                        {Math.round((member.commissionRate ?? defaultCommissionRate) * 100)} % puis {Math.round((member.renewalCommissionRate ?? defaultRenewalCommissionRate) * 100)} % — Modifier
                      </button>
                    )}
                  </div>
                )}
                {canManageTeam && !member.isOwner && member.orgRole !== 'COMMERCIAL' && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleRoleChange(member, 'MANAGER')}
                      className="text-[10px] font-medium px-2 py-1 rounded-md border border-border text-muted hover:border-primary/30 hover:text-primary"
                    >
                      → Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleChange(member, 'PROTOCOL')}
                      className="text-[10px] font-medium px-2 py-1 rounded-md border border-border text-muted hover:border-primary/30 hover:text-primary"
                    >
                      → Protocole
                    </button>
                    {hasCommercialNetwork && (
                      <button
                        type="button"
                        onClick={() => handleRoleChange(member, 'COMMERCIAL')}
                        className="text-[10px] font-medium px-2 py-1 rounded-md border border-border text-muted hover:border-primary/30 hover:text-primary"
                      >
                        → Commercial
                      </button>
                    )}
                  </div>
                )}
              </>
            );

            if (teamViewMode === 'list') {
              return (
                <ProjectCard
                  key={member.id}
                  id={member.id}
                  title={member.name || 'Sans nom'}
                  layout="list"
                  icon={<Users className="w-4 h-4" />}
                  badge={
                    member.isOwner ? (
                      <StatusPill tone="amber">Propriétaire</StatusPill>
                    ) : (
                      <StatusPill tone={roleTone as 'amber' | 'violet' | 'primary'}>{roleLabel}</StatusPill>
                    )
                  }
                  meta={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>
                      {member.phone && (
                        <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>
                      )}
                    </span>
                  }
                  value={
                    member.orgRole === 'COMMERCIAL' && member.referralCode
                      ? member.referralCode
                      : undefined
                  }
                  valueMeta={
                    member.orgRole === 'COMMERCIAL'
                      ? `Comm. ${Math.round((member.commissionRate ?? defaultCommissionRate) * 100)}/${Math.round((member.renewalCommissionRate ?? defaultRenewalCommissionRate) * 100)} %`
                      : undefined
                  }
                  aside={
                    !member.isEmailVerified && !member.isOwner ? (
                      <StatusPill tone="amber">OTP</StatusPill>
                    ) : undefined
                  }
                  actions={
                    canManageTeam && !member.isOwner ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(member)}
                        className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-[var(--radius-button)]"
                        title="Retirer de l'organisation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <ListRowAction>Profil</ListRowAction>
                    )
                  }
                >
                  {managementExtras}
                </ProjectCard>
              );
            }

            return (
            <ProjectCard
              key={member.id}
              id={member.id}
              title={member.name || 'Sans nom'}
              layout="grid"
              icon={<Users className="w-4 h-4" />}
              badge={
                member.isOwner ? (
                  <StatusPill tone="amber">Propriétaire</StatusPill>
                ) : (
                  <StatusPill tone={roleTone as 'amber' | 'violet' | 'primary'}>{roleLabel}</StatusPill>
                )
              }
              overlayMeta={member.email}
              hideCta
              meta={
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {member.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>}
                  {!member.isEmailVerified && !member.isOwner && <StatusPill tone="amber">OTP</StatusPill>}
                </div>
              }
              actions={
                canManageTeam && !member.isOwner ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(member)}
                    className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-[var(--radius-button)] transition"
                    title="Retirer de l'organisation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : undefined
              }
            >
              <div className="space-y-2">{managementExtras}</div>
            </ProjectCard>
            );
          })}
        </div>
      )}
      {members.length > 0 && (
        <Pagination
          page={membersPage}
          pageSize={membersPageSize}
          total={members.length}
          onPageChange={setMembersPage}
          onPageSizeChange={setMembersPageSize}
          itemLabel="membres"
        />
      )}
    </div>
  );
}
