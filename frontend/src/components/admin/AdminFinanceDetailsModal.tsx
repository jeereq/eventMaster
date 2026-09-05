'use client';

import React from 'react';
import { Coins, CreditCard, Eye, Mail, Phone, User } from 'lucide-react';
import { Badge, Button, Modal } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';

export type AdminPaymentDetail = {
  id: string;
  kind: 'ticket' | 'subscription' | 'ai_tokens';
  kindLabel: string;
  status: 'paid' | 'pending' | 'failed';
  statusLabel: string;
  amountFc: number;
  currency: string;
  channel: string;
  channelLabel: string;
  paymentProvider: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  reference: string | null;
  flexPayOrderNumber: string | null;
  flexPayProviderReference: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string | null;
  paidAt: string | null;
  entityId?: string | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  quantity?: number | null;
  tokensCount?: number | null;
  requestedPlan?: string | null;
  tenantName?: string | null;
  proofOfPayment?: string | null;
  rawStatus?: string | null;
};

export type AdminTokenDetail = {
  id: string;
  action: string;
  actionLabel: string;
  source: string;
  sourceLabel: string;
  tokensDelta: number;
  tokensFromFree: number;
  tokensFromBonus: number;
  tokensFromGranted?: number;
  pool: string;
  poolLabel: string;
  moneyKind?: 'revenue' | 'non_revenue' | 'mixed';
  relatedId: string | null;
  deviceId: string | null;
  userId?: string | null;
  userName: string | null;
  userEmail: string | null;
  tenantId?: string | null;
  tenantName: string | null;
  createdAt: string;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">{title}</h3>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function paymentStatusBadge(status: AdminPaymentDetail['status'], label: string) {
  if (status === 'paid') return <Badge variant="success">{label}</Badge>;
  if (status === 'failed') return <Badge variant="danger">{label}</Badge>;
  return <Badge variant="warning">{label}</Badge>;
}

function moneyBadge(kind?: AdminTokenDetail['moneyKind']) {
  if (kind === 'revenue') return <Badge variant="success">Revenu</Badge>;
  if (kind === 'mixed') return <Badge variant="warning">Mixte</Badge>;
  return <Badge variant="default">Sans revenu</Badge>;
}

export default function AdminFinanceDetailsModal({
  open,
  onClose,
  payment,
  token,
}: {
  open: boolean;
  onClose: () => void;
  payment?: AdminPaymentDetail | null;
  token?: AdminTokenDetail | null;
}) {
  const isPayment = Boolean(payment);
  const title = isPayment ? 'Tentative de paiement' : 'Mouvement de jetons';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          {title}
        </span>
      }
      description={
        isPayment
          ? 'Montant, payeur, canal FlexPay et références de la tentative.'
          : 'Action, pools consommés et rattachement utilisateur.'
      }
      size="lg"
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      }
    >
      {payment ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-card)] border border-border bg-surface-muted">
            <div className="w-10 h-10 rounded-[var(--radius-button)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{payment.summary}</p>
              <p className="text-xs text-muted mt-0.5">{formatFc(payment.amountFc)} · {payment.currency}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {paymentStatusBadge(payment.status, payment.statusLabel)}
                <Badge variant="default">{payment.kindLabel}</Badge>
                <Badge variant="default">{payment.channelLabel}</Badge>
              </div>
            </div>
          </div>

          <DetailSection title="Payeur">
            <DetailRow label="Nom">
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted" />
                {payment.payerName || '—'}
              </span>
            </DetailRow>
            <DetailRow label="E-mail">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted" />
                {payment.payerEmail || '—'}
              </span>
            </DetailRow>
            <DetailRow label="Téléphone">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted" />
                {payment.payerPhone || '—'}
              </span>
            </DetailRow>
            {payment.tenantName ? <DetailRow label="Organisation">{payment.tenantName}</DetailRow> : null}
          </DetailSection>

          <DetailSection title="Transaction">
            <DetailRow label="Montant">{formatFc(payment.amountFc)}</DetailRow>
            <DetailRow label="Devise">{payment.currency}</DetailRow>
            <DetailRow label="Canal">{payment.channelLabel}</DetailRow>
            <DetailRow label="Fournisseur">{payment.paymentProvider || '—'}</DetailRow>
            {payment.requestedPlan ? <DetailRow label="Forfait demandé">{payment.requestedPlan}</DetailRow> : null}
            {payment.tokensCount != null ? <DetailRow label="Jetons">{payment.tokensCount}</DetailRow> : null}
            {payment.quantity != null ? <DetailRow label="Quantité">{payment.quantity}</DetailRow> : null}
            {payment.eventTitle ? <DetailRow label="Événement">{payment.eventTitle}</DetailRow> : null}
            {payment.eventSlug ? <DetailRow label="Slug événement" mono>{payment.eventSlug}</DetailRow> : null}
            {payment.rawStatus ? <DetailRow label="Statut source" mono>{payment.rawStatus}</DetailRow> : null}
          </DetailSection>

          <DetailSection title="Références">
            <DetailRow label="Référence" mono>{payment.reference || '—'}</DetailRow>
            <DetailRow label="Order FlexPay" mono>{payment.flexPayOrderNumber || '—'}</DetailRow>
            <DetailRow label="Opération FlexPay" mono>{payment.flexPayProviderReference || '—'}</DetailRow>
            <DetailRow label="ID interne" mono>{payment.entityId || payment.id}</DetailRow>
            {payment.proofOfPayment ? (
              <DetailRow label="Preuve">
                <a
                  href={payment.proofOfPayment}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Ouvrir le justificatif
                </a>
              </DetailRow>
            ) : null}
          </DetailSection>

          <DetailSection title="Dates">
            <DetailRow label="Créé">{formatWhen(payment.createdAt)}</DetailRow>
            <DetailRow label="Payé">{formatWhen(payment.paidAt)}</DetailRow>
            <DetailRow label="Mis à jour">{formatWhen(payment.updatedAt)}</DetailRow>
          </DetailSection>
        </div>
      ) : token ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-card)] border border-border bg-surface-muted">
            <div className="w-10 h-10 rounded-[var(--radius-button)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{token.actionLabel}</p>
              <p className={cn(
                'text-sm font-semibold tabular-nums mt-0.5',
                token.tokensDelta > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground',
              )}>
                {token.tokensDelta > 0 ? `+${token.tokensDelta}` : token.tokensDelta} jeton{Math.abs(token.tokensDelta) > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="default">{token.poolLabel}</Badge>
                {moneyBadge(token.moneyKind)}
                <Badge variant="default">{token.sourceLabel}</Badge>
              </div>
            </div>
          </div>

          <DetailSection title="Compte">
            <DetailRow label="Organisation">{token.tenantName || '—'}</DetailRow>
            <DetailRow label="Utilisateur">{token.userName || '—'}</DetailRow>
            <DetailRow label="E-mail">{token.userEmail || '—'}</DetailRow>
            <DetailRow label="ID utilisateur" mono>{token.userId || '—'}</DetailRow>
            <DetailRow label="ID organisation" mono>{token.tenantId || '—'}</DetailRow>
            <DetailRow label="Appareil" mono>{token.deviceId || '—'}</DetailRow>
          </DetailSection>

          <DetailSection title="Pools">
            <DetailRow label="Delta">{token.tokensDelta > 0 ? `+${token.tokensDelta}` : token.tokensDelta}</DetailRow>
            <DetailRow label="Essais offerts">{token.tokensFromFree}</DetailRow>
            <DetailRow label="Jetons achetés">{token.tokensFromBonus}</DetailRow>
            <DetailRow label="Jetons offerts">{token.tokensFromGranted ?? 0}</DetailRow>
            <DetailRow label="Pool">{token.poolLabel}</DetailRow>
            <DetailRow label="Revenu">{moneyBadge(token.moneyKind)}</DetailRow>
          </DetailSection>

          <DetailSection title="Liaison">
            <DetailRow label="Action">{token.actionLabel}</DetailRow>
            <DetailRow label="Source">{token.sourceLabel}</DetailRow>
            <DetailRow label="ID lié" mono>{token.relatedId || '—'}</DetailRow>
            <DetailRow label="ID mouvement" mono>{token.id}</DetailRow>
            <DetailRow label="Quand">{formatWhen(token.createdAt)}</DetailRow>
          </DetailSection>
        </div>
      ) : null}
    </Modal>
  );
}
