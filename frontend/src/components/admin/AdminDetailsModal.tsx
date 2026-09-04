'use client';

import React from 'react';
import {
  Building2, Users, FileText, Calendar, Eye, History, Loader2,
  Mail, Shield, CheckCircle2, AlertCircle, MapPin, Phone,
} from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  platformRoleLabel,
  orgRoleLabel,
  accountKindShortLabel,
  formatCommissionPercent,
} from '@/lib/adminRoles';

export type AdminDetailsType = 'tenant' | 'user' | 'template' | 'event' | 'guest';

export interface TenantSubscriptionHistoryEntry {
  id: string;
  kind: 'REQUEST' | 'INVOICE';
  date: string;
  plan: string;
  durationDays?: number | null;
  status?: string;
  statusLabel?: string;
  proofOfPayment?: string | null;
  processedAt?: string | null;
  invoice?: {
    invoiceNumber: string;
    amountFormatted: string;
    statusLabel: string;
    typeLabel: string;
    periodStart?: string | null;
    periodEnd?: string | null;
  } | null;
}

interface AdminDetailsModalProps {
  open: boolean;
  type: AdminDetailsType | null;
  data: any;
  onClose: () => void;
  onEdit?: () => void;
  onOpenWorkspace?: () => void;
  openingWorkspace?: boolean;
  planBadgeClass: (plan: string) => string;
  tenantSubscriptionHistory?: TenantSubscriptionHistoryEntry[];
  loadingTenantHistory?: boolean;
}

const TITLES: Record<AdminDetailsType, string> = {
  tenant: 'Organisation',
  user: 'Utilisateur',
  template: 'Modèle d’invitation',
  event: 'Événement',
  guest: 'Invité',
};

const DESCRIPTIONS: Record<AdminDetailsType, string> = {
  tenant: 'Licence, forfait, gérant et historique d’abonnements.',
  user: 'Rôle plateforme, rôle organisation, forfait et rattachement.',
  template: 'Portée (global / privé) et visibilité sur la landing.',
  event: 'Planning, lieu et volumes d’invités.',
  guest: 'Contact, RSVP, événement et préférences.',
};

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(
    'fr-FR',
    withTime
      ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'long', day: 'numeric' },
  );
}

function roleLabel(role?: string) {
  return platformRoleLabel(role);
}

function roleBadgeVariant(role?: string): 'danger' | 'warning' | 'primary' | 'default' {
  if (role === 'SUPER_ADMIN') return 'danger';
  if (role === 'COMMERCIAL') return 'warning';
  return 'primary';
}

function rsvpLabel(rsvp?: string) {
  if (rsvp === 'ACCEPTED') return 'Accepté';
  if (rsvp === 'DECLINED') return 'Décliné';
  return 'En attente';
}

function rsvpVariant(rsvp?: string): 'success' | 'danger' | 'warning' {
  if (rsvp === 'ACCEPTED') return 'success';
  if (rsvp === 'DECLINED') return 'danger';
  return 'warning';
}

function DetailHero({
  icon: Icon,
  title,
  subtitle,
  badges,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-card)] border border-border bg-surface-muted">
      <div className="w-10 h-10 rounded-[var(--radius-button)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-foreground text-base tracking-tight truncate">{title}</h4>
        {subtitle && <p className="text-xs text-muted mt-0.5 break-all">{subtitle}</p>}
        {badges && <div className="flex flex-wrap gap-1.5 mt-2">{badges}</div>}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h5 className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </h5>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function DetailRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3.5 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <div className={cn('text-sm font-medium text-foreground text-left sm:text-right break-all', mono && 'font-mono text-xs')}>
        {children}
      </div>
    </div>
  );
}

function StatTiles({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <div className={cn('grid gap-2', items.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[var(--radius-card)] border border-border bg-surface-muted px-3 py-3 text-center"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{item.label}</div>
          <div className="text-xl font-semibold text-foreground mt-1 tracking-tight">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDetailsModal({
  open,
  type,
  data,
  onClose,
  onEdit,
  onOpenWorkspace,
  openingWorkspace = false,
  planBadgeClass,
  tenantSubscriptionHistory = [],
  loadingTenantHistory = false,
}: AdminDetailsModalProps) {
  if (!type || !data) return null;

  const canEdit = Boolean(onEdit) && (type === 'tenant' || type === 'user' || type === 'guest' || type === 'event');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          {TITLES[type]}
        </span>
      }
      description={DESCRIPTIONS[type]}
      size={type === 'tenant' ? 'xl' : 'lg'}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Fermer
          </Button>
          {canEdit && (
            <Button type="button" size="sm" onClick={onEdit}>
              Modifier
            </Button>
          )}
          {type === 'tenant' && onOpenWorkspace && (
            <Button type="button" size="sm" loading={openingWorkspace} onClick={onOpenWorkspace}>
              Ouvrir l’espace
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {type === 'tenant' && (
          <>
            <DetailHero
              icon={Building2}
              title={data.name}
              subtitle={`ID · ${data.id}`}
              badges={
                <>
                  <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border', planBadgeClass(data.plan))}>
                    {data.plan}
                  </span>
                  <Badge variant={data.licenseActive ? 'success' : 'danger'}>
                    Licence {data.licenseActive ? 'active' : 'désactivée'}
                  </Badge>
                </>
              }
            />

            <StatTiles
              items={[
                { label: 'Utilisateurs', value: data.usersCount ?? 0 },
                { label: 'Événements', value: data.eventsCount ?? 0 },
                { label: 'Inscription', value: formatDate(data.createdAt) },
              ]}
            />

            <DetailSection title="Gérant" icon={Users}>
              <DetailRow label="Nom">{data.managerName || 'Aucun'}</DetailRow>
              <DetailRow label="E-mail">{data.managerEmail || 'Aucun'}</DetailRow>
            </DetailSection>

            <DetailSection title="Licence d’accès" icon={Shield}>
              <DetailRow label="Statut">
                <Badge variant={data.licenseActive ? 'success' : 'danger'}>
                  {data.licenseActive ? 'Active' : 'Désactivée'}
                </Badge>
              </DetailRow>
              <DetailRow label="Expiration">{formatDate(data.licenseExpiresAt, true)}</DetailRow>
              {data.licenseKey && (
                <DetailRow label="Clé" mono>
                  <span className="select-all">{data.licenseKey}</span>
                </DetailRow>
              )}
            </DetailSection>

            <DetailSection title={`Historique abonnements (${tenantSubscriptionHistory.length})`} icon={History}>
              {loadingTenantHistory ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : tenantSubscriptionHistory.length === 0 ? (
                <p className="text-xs text-muted text-center py-6 px-3">
                  Aucune demande ni facture pour cette organisation.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="border-b border-border text-[10px] font-semibold text-muted uppercase">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-2 py-2">Type</th>
                        <th className="px-2 py-2">Forfait</th>
                        <th className="px-2 py-2">Durée</th>
                        <th className="px-2 py-2">Statut</th>
                        <th className="px-3 py-2">Facture</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantSubscriptionHistory.map((entry) => (
                        <tr key={`${entry.kind}-${entry.id}`} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-muted whitespace-nowrap">
                            {new Date(entry.date).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="px-2 py-2">
                            <Badge variant={entry.kind === 'REQUEST' ? 'warning' : 'primary'} className="rounded-md">
                              {entry.kind === 'REQUEST' ? 'Demande' : 'Facture'}
                            </Badge>
                          </td>
                          <td className="px-2 py-2">
                            <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border', planBadgeClass(entry.plan))}>
                              {entry.plan}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-muted">
                            {entry.durationDays ? `${entry.durationDays} j` : '—'}
                          </td>
                          <td className="px-2 py-2">
                            {entry.kind === 'REQUEST' ? (
                              <span className={cn(
                                'text-[11px] font-semibold',
                                entry.status === 'APPROVED' && 'text-emerald-600',
                                entry.status === 'REJECTED' && 'text-rose-600',
                                entry.status === 'PENDING' && 'text-amber-600',
                              )}>
                                {entry.statusLabel}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted">{entry.invoice?.statusLabel || '—'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {entry.invoice ? (
                              <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-foreground">{entry.invoice.invoiceNumber}</span>
                                <span className="font-semibold text-primary text-[11px]">{entry.invoice.amountFormatted}</span>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailSection>
          </>
        )}

        {type === 'user' && (
          <>
            <DetailHero
              icon={Users}
              title={data.name || 'Sans nom'}
              subtitle={data.email}
              badges={
                <>
                  <Badge variant={roleBadgeVariant(data.role)}>{roleLabel(data.role)}</Badge>
                  {orgRoleLabel(data.orgRole, data.isOwner) ? (
                    <Badge variant={data.isOwner ? 'primary' : 'default'}>{orgRoleLabel(data.orgRole, data.isOwner)}</Badge>
                  ) : null}
                  <Badge variant={data.isEmailVerified ? 'success' : 'warning'}>
                    {data.isEmailVerified ? (
                      <><CheckCircle2 className="w-3 h-3" /> E-mail vérifié</>
                    ) : (
                      <><AlertCircle className="w-3 h-3" /> E-mail non vérifié</>
                    )}
                  </Badge>
                </>
              }
            />

            <DetailSection title="Compte" icon={Shield}>
              <DetailRow label="Rôle plateforme">{roleLabel(data.role)}</DetailRow>
              {orgRoleLabel(data.orgRole, data.isOwner) ? (
                <DetailRow label="Rôle organisation">{orgRoleLabel(data.orgRole, data.isOwner)}</DetailRow>
              ) : null}
              <DetailRow label="E-mail">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  {data.email}
                </span>
              </DetailRow>
              {data.phone ? (
                <DetailRow label="Téléphone">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted" />
                    {data.phone}
                  </span>
                </DetailRow>
              ) : null}
              <DetailRow label="Vérification">
                <Badge variant={data.isEmailVerified ? 'success' : 'warning'}>
                  {data.isEmailVerified ? 'Vérifié' : 'En attente'}
                </Badge>
              </DetailRow>
              {data.referralCode ? <DetailRow label="Code parrainage" mono>{data.referralCode}</DetailRow> : null}
              {(data.commissionRate != null || data.renewalCommissionRate != null) ? (
                <DetailRow label="Commissions">
                  {[
                    formatCommissionPercent(data.commissionRate) ? `1er ${formatCommissionPercent(data.commissionRate)}` : null,
                    formatCommissionPercent(data.renewalCommissionRate) ? `renouvellement ${formatCommissionPercent(data.renewalCommissionRate)}` : null,
                  ].filter(Boolean).join(' · ') || '—'}
                </DetailRow>
              ) : null}
              {(data.referredTenantsCount ?? 0) > 0 ? (
                <DetailRow label="Organisations parrainées">{data.referredTenantsCount}</DetailRow>
              ) : null}
              <DetailRow label="Inscrit le">{formatDate(data.createdAt, true)}</DetailRow>
              {data.updatedAt ? <DetailRow label="Mis à jour">{formatDate(data.updatedAt, true)}</DetailRow> : null}
              <DetailRow label="ID utilisateur" mono>{data.id}</DetailRow>
            </DetailSection>

            <DetailSection title="Organisation" icon={Building2}>
              <DetailRow label="Rattachement">
                {data.tenantName && data.tenantName !== '—' && data.tenantName !== 'N/A'
                  ? data.tenantName
                  : data.role === 'SUPER_ADMIN' || data.role === 'COMMERCIAL'
                    ? 'Aucune (rôle plateforme)'
                    : 'Aucune'}
              </DetailRow>
              {data.tenantPlan ? <DetailRow label="Forfait">{data.tenantPlan}</DetailRow> : null}
              {accountKindShortLabel(data.tenantAccountKind) ? (
                <DetailRow label="Type de compte">{accountKindShortLabel(data.tenantAccountKind)}</DetailRow>
              ) : null}
              {data.tenantLicenseActive != null ? (
                <DetailRow label="Licence">
                  <Badge variant={data.tenantLicenseActive ? 'success' : 'danger'}>
                    {data.tenantLicenseActive ? 'Active' : 'Inactive'}
                  </Badge>
                </DetailRow>
              ) : null}
              {data.tenantLicenseExpiresAt ? (
                <DetailRow label="Expire le">{formatDate(data.tenantLicenseExpiresAt)}</DetailRow>
              ) : null}
              {(data.eventStaffCount ?? 0) > 0 || (data.roomStaffCount ?? 0) > 0 ? (
                <DetailRow label="Affectations staff">
                  {[
                    (data.eventStaffCount ?? 0) > 0 ? `${data.eventStaffCount} événement${data.eventStaffCount > 1 ? 's' : ''}` : null,
                    (data.roomStaffCount ?? 0) > 0 ? `${data.roomStaffCount} salle${data.roomStaffCount > 1 ? 's' : ''}` : null,
                  ].filter(Boolean).join(' · ')}
                </DetailRow>
              ) : null}
              {data.tenantId && <DetailRow label="ID organisation" mono>{data.tenantId}</DetailRow>}
            </DetailSection>
          </>
        )}

        {type === 'guest' && (
          <>
            <DetailHero
              icon={Users}
              title={`${data.lastName || ''} ${data.firstName || ''}`.trim() || 'Invité'}
              subtitle={data.email}
              badges={
                <>
                  <Badge variant={rsvpVariant(data.rsvp)}>{rsvpLabel(data.rsvp)}</Badge>
                  {data.category && <Badge variant="default">{data.category}</Badge>}
                </>
              }
            />

            <DetailSection title="Coordonnées" icon={Mail}>
              <DetailRow label="E-mail">
                <span className="select-all">{data.email || '—'}</span>
              </DetailRow>
              <DetailRow label="Catégorie">{data.category || '—'}</DetailRow>
              <DetailRow label="RSVP">
                <Badge variant={rsvpVariant(data.rsvp)}>{rsvpLabel(data.rsvp)}</Badge>
              </DetailRow>
              <DetailRow label="Enregistré le">{formatDate(data.createdAt, true)}</DetailRow>
              <DetailRow label="ID" mono>{data.id}</DetailRow>
            </DetailSection>

            <DetailSection title="Contexte" icon={Calendar}>
              <DetailRow label="Événement">{data.eventTitle || '—'}</DetailRow>
              <DetailRow label="Organisation">{data.tenantName || '—'}</DetailRow>
              {data.eventId && <DetailRow label="ID événement" mono>{data.eventId}</DetailRow>}
            </DetailSection>

            {data.preferences && Object.keys(data.preferences).length > 0 && (
              <DetailSection title="Préférences">
                {Object.entries(data.preferences).map(([key, value]) => (
                  <DetailRow key={key} label={key}>
                    {String(value)}
                  </DetailRow>
                ))}
              </DetailSection>
            )}
          </>
        )}

        {type === 'template' && (
          <>
            <DetailHero
              icon={FileText}
              title={data.name}
              subtitle={`ID · ${data.id}`}
              badges={
                <>
                  <Badge variant={data.isGlobal ? 'primary' : 'default'}>
                    {data.isGlobal ? 'Global (public)' : 'Privé'}
                  </Badge>
                  <Badge variant={data.showOnLanding ? 'success' : 'default'}>
                    Landing {data.showOnLanding ? 'oui' : 'non'}
                  </Badge>
                </>
              }
            />
            <DetailSection title="Métadonnées">
              <DetailRow label="Organisation">{data.tenantName || 'Global'}</DetailRow>
              <DetailRow label="Créé le">{formatDate(data.createdAt, true)}</DetailRow>
              <DetailRow label="Vitrine landing">
                <Badge variant={data.showOnLanding ? 'success' : 'default'}>
                  {data.showOnLanding ? 'Affiché' : 'Masqué'}
                </Badge>
              </DetailRow>
            </DetailSection>
            {(data.content?.subject || data.content?.body || data.content?.elements) && (
              <DetailSection title="Aperçu contenu">
                {data.content?.subject && <DetailRow label="Sujet">{data.content.subject}</DetailRow>}
                {data.content?.body && (
                  <div className="px-3.5 py-2.5">
                    <p className="text-xs text-muted mb-1.5">Message</p>
                    <pre className="text-xs bg-surface-muted border border-border rounded-[var(--radius-button)] p-3 whitespace-pre-wrap text-foreground/80 max-h-32 overflow-y-auto">
                      {data.content.body}
                    </pre>
                  </div>
                )}
                {Array.isArray(data.content?.elements) && (
                  <div className="px-3.5 py-2.5">
                    <p className="text-xs text-muted mb-1.5">Éléments ({data.content.elements.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.content.elements.map((el: any, idx: number) => (
                        <span key={idx} className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md border border-border">
                          {el.type}{el.text ? ` · ${String(el.text).slice(0, 18)}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </DetailSection>
            )}
          </>
        )}

        {type === 'event' && (
          <>
            <DetailHero
              icon={Calendar}
              title={data.title}
              subtitle={`ID · ${data.id}`}
              badges={<Badge variant="primary">{data.tenantName}</Badge>}
            />
            <StatTiles
              items={[
                { label: 'Invités', value: data.guestCount ?? 0 },
                { label: 'Invitations', value: data.invitationCount ?? 0 },
              ]}
            />
            <DetailSection title="Planning" icon={Calendar}>
              <DetailRow label="Date">{formatDate(data.date, true)}</DetailRow>
              <DetailRow label="Lieu">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted" />
                  {data.location || '—'}
                </span>
              </DetailRow>
              <DetailRow label="Rappels">{data.reminderFrequency || '—'}</DetailRow>
              {(data.latitude || data.longitude) && (
                <DetailRow label="GPS" mono>
                  {data.latitude}, {data.longitude}
                </DetailRow>
              )}
            </DetailSection>
            {data.description && (
              <DetailSection title="Description">
                <p className="px-3.5 py-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {data.description}
                </p>
              </DetailSection>
            )}
            <DetailSection title="Organisation" icon={Building2}>
              <DetailRow label="Nom">{data.tenantName || '—'}</DetailRow>
              {data.tenantId && <DetailRow label="ID" mono>{data.tenantId}</DetailRow>}
            </DetailSection>
          </>
        )}
      </div>
    </Modal>
  );
}
