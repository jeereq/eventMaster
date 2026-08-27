'use client';

import React from 'react';
import { Building2, CreditCard, Clock, FileText, UserCheck } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import { formatFc, invoiceCatalogLabel, isAnnualDurationDays } from '@/config/landingPricing';

export interface AdminSubscriptionRequestItem {
  id: string;
  requestedPlan: string;
  durationDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  proofOfPayment?: string | null;
  createdAt: string;
  updatedAt?: string;
  baseAmount?: number | null;
  approvedAmount?: number | null;
  specialDiscountPercent?: number | null;
  paymentProvider?: string | null;
  flexPayChannel?: string | null;
  flexPayAmountCustomer?: number | null;
  flexPayProviderReference?: string | null;
  tenant?: {
    name?: string;
    plan?: string;
    licenseActive?: boolean;
    licenseExpiresAt?: string | null;
    referredByCommercial?: { id: string; name: string | null; email: string } | null;
    referredByOrgUser?: { id: string; name: string | null; email: string; orgRole?: string | null } | null;
  };
  platformInvoice?: {
    id: string;
    invoiceNumber: string;
    amount: number;
    status: string;
  } | null;
}

function statusVariant(status: string): 'warning' | 'success' | 'danger' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'warning';
}

function statusLabel(status: string) {
  if (status === 'APPROVED') return 'Approuvée';
  if (status === 'REJECTED') return 'Rejetée';
  return 'En attente';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <div className="text-sm font-medium text-foreground text-right min-w-0">{children}</div>
    </div>
  );
}

export default function SubscriptionRequestDetailModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: AdminSubscriptionRequestItem | null;
  onClose: () => void;
  onApprove?: (request: AdminSubscriptionRequestItem) => void;
  onReject?: (id: string) => void;
}) {
  const pending = request?.status === 'PENDING';
  const commercials: Array<{ name: string; email?: string; kind: string }> = [];
  if (request?.tenant?.referredByCommercial) {
    commercials.push({
      name: request.tenant.referredByCommercial.name || 'Commercial plateforme',
      email: request.tenant.referredByCommercial.email,
      kind: 'Plateforme',
    });
  }
  if (request?.tenant?.referredByOrgUser?.orgRole === 'COMMERCIAL') {
    commercials.push({
      name: request.tenant.referredByOrgUser.name || 'Commercial organisation',
      email: request.tenant.referredByOrgUser.email,
      kind: 'Organisation',
    });
  }

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title="Demande d’abonnement"
      size="md"
      footer={
        pending ? (
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Fermer
            </Button>
            {onReject && request && (
              <Button type="button" variant="danger" onClick={() => onReject(request.id)}>
                Rejeter
              </Button>
            )}
            {onApprove && request && (
              <Button type="button" onClick={() => onApprove(request)}>
                Approuver
              </Button>
            )}
          </div>
        ) : (
          <div className="flex w-full justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )
      }
    >
      {request && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-card)] border border-border bg-surface-muted">
            <div className="w-10 h-10 rounded-[var(--radius-button)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-foreground truncate">{request.tenant?.name || 'Organisation'}</h4>
              <p className="text-xs text-muted mt-0.5">
                {(request.tenant?.plan || 'FREE')} → {request.requestedPlan}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant={statusVariant(request.status)}>{statusLabel(request.status)}</Badge>
                {isAnnualDurationDays(request.durationDays) && (
                  <Badge variant="primary">Annuel</Badge>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Forfait
            </p>
            <Row label="Forfait demandé">{request.requestedPlan}</Row>
            <Row label="Forfait actuel">{request.tenant?.plan || 'FREE'}</Row>
            <Row label="Durée">
              {request.durationDays} j · {invoiceCatalogLabel(request.requestedPlan, request.durationDays)}
            </Row>
            {request.tenant?.licenseExpiresAt && (
              <Row label="Licence actuelle">{formatDate(request.tenant.licenseExpiresAt)}</Row>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Suivi
            </p>
            <Row label="Soumise le">{formatDate(request.createdAt)}</Row>
            {request.status !== 'PENDING' && (
              <Row label="Traitée le">{formatDate(request.updatedAt)}</Row>
            )}
            {request.baseAmount != null && (
              <Row label="Catalogue">{formatFc(request.baseAmount)}</Row>
            )}
            {request.specialDiscountPercent != null && request.specialDiscountPercent > 0 && (
              <Row label="Réduction">{request.specialDiscountPercent} %</Row>
            )}
            {request.approvedAmount != null && (
              <Row label="Montant approuvé">{formatFc(request.approvedAmount)}</Row>
            )}
            {request.paymentProvider && (
              <Row label="Paiement">{request.paymentProvider}</Row>
            )}
            {request.flexPayChannel && (
              <Row label="Canal FlexPay">{request.flexPayChannel}</Row>
            )}
            {request.flexPayAmountCustomer != null && (
              <Row label="Payé client">{formatFc(request.flexPayAmountCustomer)}</Row>
            )}
            {request.flexPayProviderReference && (
              <Row label="Réf. opérateur">{request.flexPayProviderReference}</Row>
            )}
          </div>

          {request.proofOfPayment && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Preuve de paiement</p>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words rounded-xl border border-border bg-surface-muted px-3 py-2">
                {request.proofOfPayment}
              </p>
            </div>
          )}

          {request.platformInvoice && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Facture
              </p>
              <Row label="Numéro">{request.platformInvoice.invoiceNumber}</Row>
              <Row label="Montant">{formatFc(request.platformInvoice.amount)}</Row>
              <Row label="Statut">{request.platformInvoice.status}</Row>
            </div>
          )}

          {commercials.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Commerciaux
              </p>
              {commercials.map((c) => (
                <Row key={`${c.kind}-${c.email || c.name}`} label={c.kind}>
                  <span className="block truncate">{c.name}</span>
                  {c.email && <span className="block text-xs text-muted font-normal">{c.email}</span>}
                </Row>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
