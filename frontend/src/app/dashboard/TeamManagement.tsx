'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Users, UserPlus, Trash2, Loader2, Crown, Mail, Phone, Pencil,
  Shield, Briefcase, MessageSquare, Smartphone, TrendingUp, Copy, RefreshCw, ChevronDown,
} from '@/components/icons';
import {
  SkeletonGrid, ViewModeToggle, useViewMode, listStackClass,
  ProjectCard, StatusPill, ListRowAction, PhoneInput,
  Button, Modal, EmptyState, Alert, Input, Badge, Pagination, usePaginateItems, usePageSize,
  ConfirmDialog, IconButton,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import UserAvatar from '@/components/UserAvatar';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import { getQuotaActionMessage } from '@/lib/planAccess';
import PlanLimitCallout from '@/components/PlanLimitCallout';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  allowsAuthOtpChoice,
  authOtpMethodOptions,
  defaultAuthOtpMethod,
  phoneFieldLabel,
  phoneFieldHint,
  type AuthOtpMethod,
} from '@/lib/authOtpChannels';

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
    description: 'Gère salles, équipe et événements. Inclus dans les jetons IA de l’organisation.',
    icon: Shield,
  },
  {
    id: 'PROTOCOL' as const,
    label: 'Protocole',
    description: 'Accueil, check-in et suivi invités. Reçoit 4 jetons IA à la création.',
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
  const { user, tenant, planQuota, planFeatures, planName } = useAuth();
  /** Nom commercial du forfait (base) ; l'identifiant brut seulement si le nom n'est pas chargé. */
  const planLabel = planName || tenant?.plan || null;
  const { site } = usePlatformSite();
  const authChannels = site.authOtpChannels;
  const canChooseOtpChannel = allowsAuthOtpChoice(authChannels);
  const {
    mode: teamViewMode,
    setViewMode: setTeamViewMode,
    columns: teamColumns,
    setGridColumns: setTeamColumns,
    gridClassName: teamGridClass,
  } = useViewMode('em-view-team', 'grid', 3);
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
  const [verificationMethod, setVerificationMethod] = useState<AuthOtpMethod>(defaultAuthOtpMethod(authChannels));
  /** Membre ouvert dans le panneau latéral « Modifier ». */
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<TeamMember['orgRole']>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  /** Membre dont le retrait attend la confirmation. */
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [editCommissionValue, setEditCommissionValue] = useState('');
  const [editRenewalCommissionValue, setEditRenewalCommissionValue] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const pagedMembers = usePaginateItems(members, membersPage, membersPageSize);

  useEffect(() => {
    setVerificationMethod(defaultAuthOtpMethod(authChannels));
  }, [authChannels]);

  const hasCommercialNetwork = planFeatures?.commercialNetwork === true;

  const managerCount = members.filter((m) => m.orgRole === 'MANAGER' || m.isOwner).length;
  const maxManagers = planQuota?.limits.maxOrgManagers ?? null;
  const managersAtLimit = maxManagers !== null && maxManagers < 9999 && managerCount >= maxManagers;
  const pendingCount = members.filter((m) => !m.isEmailVerified && !m.isOwner).length;

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
    if ((verificationMethod === 'WHATSAPP' || verificationMethod === 'SMS') && !phoneNational.trim()) {
      setError(`Le téléphone est obligatoire pour envoyer le code OTP par ${verificationMethod === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}.`);
      setSubmitting(false);
      return;
    }
    if (orgRole === 'MANAGER' && managersAtLimit) {
      setError(getQuotaActionMessage('orgManagers', planQuota, planLabel));
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

  const memberName = (member: TeamMember) => member.name || member.email;

  /** Panneau latéral : la liste reste visible, l'édition (rôle, commission) prend quelques secondes. */
  const openEdit = (member: TeamMember) => {
    setEditingMember(member);
    setEditRole(member.orgRole);
    setEditCommissionValue(String(Math.round((member.commissionRate ?? defaultCommissionRate) * 100)));
    setEditRenewalCommissionValue(String(Math.round((member.renewalCommissionRate ?? defaultRenewalCommissionRate) * 100)));
    setEditError('');
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingMember) return;
    setEditSaving(true);
    setEditError('');
    try {
      if (editRole && editRole !== editingMember.orgRole) {
        await api.put(`/team/${editingMember.id}`, { orgRole: editRole });
      }
      if (editingMember.orgRole === 'COMMERCIAL') {
        await api.put(`/team/${editingMember.id}/commission`, {
          commissionRate: parseFloat(editCommissionValue) / 100,
          renewalCommissionRate: parseFloat(editRenewalCommissionValue) / 100,
        });
      }
      setSuccess(`${memberName(editingMember)} : modifications enregistrées.`);
      setEditingMember(null);
      await loadTeam();
    } catch (err: any) {
      setEditError(err.message || 'Enregistrement impossible.');
    } finally {
      setEditSaving(false);
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

  /** Le retrait supprime le compte du membre : il passe toujours par une confirmation nommée. */
  const handleConfirmRemove = async () => {
    if (!memberToRemove || memberToRemove.isOwner) return;
    setRemoving(true);
    try {
      await api.delete(`/team/${memberToRemove.id}`);
      setSuccess(`${memberName(memberToRemove)} a été retiré de l’équipe.`);
      setMemberToRemove(null);
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
      setMemberToRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  if (user?.role !== 'USER' || !tenant) return null;

  const visibleRoles = ROLE_OPTIONS.filter((r) => !r.requiresCommercial || hasCommercialNetwork);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 sm:p-6 space-y-5">
      <div className="flex flex-col gap-4 pb-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Équipe de l&apos;organisation
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
          {members.length > 0 && (
            <ViewModeToggle
              storageKey="em-view-team"
              value={teamViewMode}
              onChange={setTeamViewMode}
              columns={teamColumns}
              onColumnsChange={setTeamColumns}
              defaultMode="grid"
              defaultColumns={3}
            />
          )}
          </div>
          {canManageTeam && (
            <Button type="button" size="sm" onClick={openForm} leftIcon={<UserPlus className="w-4 h-4" />}>
              Ajouter un membre
            </Button>
          )}
        </div>
      </div>

      {members.length > 0 && (
        <div className={cn('grid gap-2', hasCommercialNetwork ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')} aria-label="Répartition de l’équipe">
          {[
            { label: 'Managers', value: maxManagers !== null && maxManagers < 9999 ? `${managerCount} / ${maxManagers}` : String(managerCount), gauge: maxManagers !== null && maxManagers > 0 && maxManagers < 9999 ? managerCount / maxManagers : null },
            { label: 'Protocole', value: String(members.filter((m) => m.orgRole === 'PROTOCOL').length), gauge: null },
            ...(hasCommercialNetwork
              ? [{ label: 'Commerciaux', value: String(members.filter((m) => m.orgRole === 'COMMERCIAL').length), gauge: null }]
              : []),
            { label: 'À valider', value: String(pendingCount), gauge: null },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[var(--radius-card)] border border-border bg-surface-muted/60 px-3 py-2.5">
              <p className="text-xs font-medium text-muted">{stat.label}</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{stat.value}</p>
              {stat.gauge != null && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border" aria-hidden>
                  <div
                    className={cn('h-full rounded-full', stat.gauge >= 1 ? 'bg-festive-accent' : 'bg-primary')}
                    style={{ width: `${Math.min(100, Math.round(stat.gauge * 100))}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {managersAtLimit && (
        <PlanLimitCallout kind="orgManagers" planQuota={planQuota} planName={planLabel} />
      )}

      {hasCommercialNetwork && canManageTeam && (
        <details className="group bg-surface-muted border border-border rounded-[var(--radius-card)] px-4">
          <summary className="min-h-12 flex items-center justify-between gap-2 cursor-pointer list-none text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-[var(--radius-button)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Commission commerciale par défaut
            </span>
            <ChevronDown className="w-4 h-4 text-muted shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="pb-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
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
              <label className="text-xs font-semibold text-muted block mb-1.5">
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
          <p className="text-xs text-muted">
            30 % au premier paiement et 20 % ensuite, sauf personnalisation par commercial.
          </p>
          </div>
        </details>
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
            <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <PhoneInput
              label={
                verificationMethod === 'EMAIL'
                  ? 'Téléphone (optionnel)'
                  : phoneFieldLabel(authChannels, verificationMethod)
              }
              countryCode={phoneCountryCode}
              national={phoneNational}
              onCountryCodeChange={setPhoneCountryCode}
              onNationalChange={setPhoneNational}
              required={verificationMethod === 'WHATSAPP' || verificationMethod === 'SMS'}
              hint={phoneFieldHint(authChannels, verificationMethod)}
            />
            <Input label="Mot de passe temporaire" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} hint="Minimum 8 caractères" />
          </div>

          <div>
            <p className="text-xs font-medium text-muted mb-2">Validation du compte (OTP)</p>
            {canChooseOtpChannel ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {authOtpMethodOptions(authChannels).includes('EMAIL') && (
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
                )}
                {authOtpMethodOptions(authChannels).includes('WHATSAPP') && (
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
                )}
                {authOtpMethodOptions(authChannels).includes('SMS') && (
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('SMS')}
                    className={cn(
                      'py-2.5 px-3 rounded-[var(--radius-button)] border text-xs font-medium flex items-center justify-center gap-2 transition-colors',
                      verificationMethod === 'SMS'
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border text-muted hover:bg-surface-muted',
                    )}
                  >
                    <Smartphone className="w-4 h-4" /> SMS
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted">
                Code envoyé {verificationMethod === 'WHATSAPP' ? 'par WhatsApp' : verificationMethod === 'SMS' ? 'par SMS' : 'par e-mail'} (réglage plateforme).
              </p>
            )}
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
                  <p className="text-xs text-muted mt-0.5 leading-snug">{description}</p>
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
            <PlanLimitCallout kind="orgManagers" planQuota={planQuota} planName={planLabel} compact />
          )}
        </form>
      </Modal>

      {loading ? (
        <SkeletonGrid count={3} columns={3} />
      ) : members.length === 0 ? (
        <EmptyState illustration="guests"
          icon={<Users className="w-5 h-5" />}
          title="Aucun membre pour l’instant"
          description="Ajoutez un manager ou un agent protocole."
          action={
            canManageTeam ? (
              <Button type="button" size="sm" variant="secondary" onClick={openForm} leftIcon={<UserPlus className="w-4 h-4" />}>
                Ajouter un membre
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={teamViewMode === 'list' ? listStackClass : teamGridClass}>
          {pagedMembers.map((member) => {
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

            const commissionSummary = `${Math.round((member.commissionRate ?? defaultCommissionRate) * 100)} % puis ${Math.round((member.renewalCommissionRate ?? defaultRenewalCommissionRate) * 100)} %`;

            const managementExtras = (
              <>
                {!member.isEmailVerified && canManageTeam && (
                  <button
                    type="button"
                    onClick={() => handleResendOtp(member)}
                    disabled={resendingId === member.id}
                    className="min-h-8 text-xs font-semibold px-2.5 rounded-md border border-border text-foreground hover:bg-surface-muted inline-flex items-center gap-1.5"
                  >
                    {resendingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Renvoyer le code
                  </button>
                )}
                {member.orgRole === 'COMMERCIAL' && teamViewMode !== 'list' && (
                  <p className="text-xs text-muted">Commission {commissionSummary}</p>
                )}
              </>
            );

            // Modifier : panneau latéral (rôle, commission). Retirer : confirmation qui nomme la personne.
            const memberActions =
              canManageTeam && !member.isOwner ? (
                <span className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<Pencil className="w-3.5 h-3.5" />}
                    onClick={() => openEdit(member)}
                  >
                    Modifier
                  </Button>
                  <IconButton
                    label={`Retirer ${memberName(member)} de l’équipe`}
                    icon={Trash2}
                    tone="danger"
                    onClick={() => setMemberToRemove(member)}
                  />
                </span>
              ) : null;

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
                      <StatusPill tone="amber">Compte à valider</StatusPill>
                    ) : undefined
                  }
                  actions={memberActions ?? <ListRowAction>Profil</ListRowAction>}
                >
                  {managementExtras}
                </ProjectCard>
              );
            }

            return (
              <article
                key={member.id}
                className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 transition hover:border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar name={member.name || member.email} size="lg" className="h-11 w-11 shrink-0 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold text-foreground">{member.name || 'Sans nom'}</h3>
                      {member.id === user?.id && <span className="text-xs text-muted">(vous)</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusPill tone={roleTone as 'amber' | 'violet' | 'primary'}>{roleLabel}</StatusPill>
                      {!member.isEmailVerified && !member.isOwner && (
                        <StatusPill tone="amber">Compte à valider</StatusPill>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted">
                  <a href={`mailto:${member.email}`} className="flex min-w-0 items-center gap-1.5 hover:text-primary">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </a>
                  {member.phone && (
                    <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {member.phone}
                    </a>
                  )}
                  {member.orgRole === 'COMMERCIAL' && member.referralCode && (
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                      Code {member.referralCode}
                    </span>
                  )}
                </div>
                {!member.isOwner && canManageTeam && (
                  <div className="mt-auto space-y-2 border-t border-border pt-3">
                    {managementExtras}
                    {memberActions}
                  </div>
                )}
              </article>
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

      {/* Modifier un membre : panneau latéral, la liste de l'équipe reste visible. */}
      <Modal
        open={Boolean(editingMember)}
        onClose={() => (editSaving ? undefined : setEditingMember(null))}
        placement="right"
        title={editingMember ? `Modifier ${memberName(editingMember)}` : undefined}
        description={editingMember && editingMember.name ? editingMember.email : undefined}
        dismissible={!editSaving}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setEditingMember(null)} disabled={editSaving}>
              Annuler
            </Button>
            <Button type="submit" form="team-member-edit-form" loading={editSaving}>
              Enregistrer
            </Button>
          </>
        }
      >
        {editingMember ? (
          <form id="team-member-edit-form" onSubmit={handleSaveEdit} className="space-y-6">
            {editError ? <Alert variant="error">{editError}</Alert> : null}

            {editingMember.orgRole === 'COMMERCIAL' ? (
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-foreground">Commission</legend>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Premier paiement (%)"
                    type="number"
                    min={0}
                    max={100}
                    value={editCommissionValue}
                    onChange={(e) => setEditCommissionValue(e.target.value)}
                  />
                  <Input
                    label="Paiements suivants (%)"
                    type="number"
                    min={0}
                    max={100}
                    value={editRenewalCommissionValue}
                    onChange={(e) => setEditRenewalCommissionValue(e.target.value)}
                  />
                </div>
              </fieldset>
            ) : (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-foreground">Rôle</legend>
                {visibleRoles
                  .filter((role) => role.id !== 'COMMERCIAL')
                  .map((role) => {
                    const current = editingMember.orgRole === role.id;
                    const blocked = !current && role.id === 'MANAGER' && managersAtLimit;
                    return (
                      <label
                        key={role.id}
                        className={cn(
                          'flex items-start gap-3 rounded-[var(--radius-card)] border p-3.5 transition-colors',
                          editRole === role.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-muted/60',
                          blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                        )}
                      >
                        <input
                          type="radio"
                          name="team-member-role"
                          value={role.id}
                          checked={editRole === role.id}
                          disabled={blocked}
                          onChange={() => setEditRole(role.id)}
                          className="mt-1 h-4 w-4 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{role.label}</span>
                          <span className="block text-sm text-muted">
                            {blocked ? 'Quota de managers atteint pour ce forfait.' : role.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </fieldset>
            )}
          </form>
        ) : null}
      </Modal>

      {/* Retrait : confirmation qui nomme la personne ; Annuler a le focus, Échap annule. */}
      <ConfirmDialog
        open={Boolean(memberToRemove)}
        onClose={() => (removing ? undefined : setMemberToRemove(null))}
        onConfirm={handleConfirmRemove}
        loading={removing}
        tone="danger"
        title={memberToRemove ? `Retirer ${memberName(memberToRemove)} de l’équipe ?` : ''}
        description={
          memberToRemove
            ? `Le compte ${memberToRemove.email} sera supprimé : cette personne ne pourra plus se connecter. Cette action est définitive.`
            : ''
        }
        confirmLabel="Retirer de l’équipe"
        cancelLabel="Annuler"
      />
    </div>
  );
}
