'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookmarkPlus, Building2, CalendarPlus, KeyRound, Sparkles, UserPlus } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { isServiceRentalCategory, sizedMediaUrl } from '@/lib/marketplace';
import type { EventPlanAiItem, EventPlanAiPackage, EventPlanAiResult } from '@/lib/eventPlan';
import { AI_TOKEN_PACK_SIZE } from '@/lib/aiTokens';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import EventPrepListingModal, { type EventPrepPreviewTarget } from '@/components/EventPrepListingModal';

export default function AiSimulationPackModal({
  open,
  onClose,
  result,
  selectedId,
  onSelectPack,
  budgetMaxFc,
  eventDate,
  guestCount,
  isLoggedIn,
  canCreateEvents,
  saveBusy,
  saveMessage,
  onSavePack,
  onBuyTokens,
  onApply,
  applyLabel,
  onApplyAll,
  onOpenListing,
}: {
  open: boolean;
  onClose: () => void;
  result: EventPlanAiResult | null;
  selectedId: string | null;
  onSelectPack: (id: string) => void;
  budgetMaxFc: number;
  eventDate?: string;
  guestCount?: number;
  isLoggedIn: boolean;
  canCreateEvents: boolean;
  saveBusy?: boolean;
  saveMessage?: string;
  onSavePack?: () => void;
  onBuyTokens?: () => void;
  onApply?: (pack: EventPlanAiPackage) => void;
  applyLabel?: string;
  onApplyAll?: (packages: EventPlanAiPackage[]) => void;
  onOpenListing?: (target: EventPrepPreviewTarget) => void;
}) {
  const { site } = usePlatformSite();
  const exchangeRate = Number(site?.usdExchangeRateCdf) > 0 ? Number(site.usdExchangeRateCdf) : 2800;

  const [listing, setListing] = useState<EventPrepPreviewTarget | null>(null);
  const packages = result?.packages || [];
  const selected = packages.find((pack) => pack.id === selectedId) || packages[0] || null;
  const leftover = selected && budgetMaxFc > 0 ? budgetMaxFc - selected.estimatedTotalFc : null;
  const totalUsd = selected ? Math.round(selected.estimatedTotalFc / exchangeRate) : 0;
  const leftoverUsd = leftover != null ? Math.round(leftover / exchangeRate) : null;

  const openElement = (target: EventPrepPreviewTarget) => {
    if (onOpenListing) onOpenListing(target);
    else setListing(target);
  };

  return (
    <>
      <Modal
        open={open && Boolean(selected)}
        onClose={onClose}
        size="xl"
        title={selected ? selected.label : 'Éléments de la simulation'}
        description={
          selected
            ? selected.summary || 'Salle, prestataires et matériel composés pour ce projet.'
            : undefined
        }
        footer={
          selected ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base font-bold text-foreground">
                    Total : {totalUsd.toLocaleString('fr-FR')} $
                  </span>
                  <span className="text-xs text-muted">
                    ({formatFc(selected.estimatedTotalFc)})
                  </span>
                </div>
                {leftover != null ? (
                  <p className={cn('text-[11px] font-medium mt-0.5', leftover >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-200')}>
                    {leftover >= 0
                      ? `Reste : ${leftoverUsd != null ? `${leftoverUsd.toLocaleString('fr-FR')} $ · ` : ''}${formatFc(leftover)}`
                      : `Dépassement : ${leftoverUsd != null ? `${Math.abs(leftoverUsd).toLocaleString('fr-FR')} $ · ` : ''}${formatFc(Math.abs(leftover))}`}
                  </p>
                ) : null}
                <p className="text-[10px] text-muted">
                  Taux calculé : 1 $ = {exchangeRate.toLocaleString('fr-FR')} FC
                </p>
                {saveMessage ? <p className="text-[11px] text-muted mt-1">{saveMessage}</p> : null}
              </div>
              {onApply ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!selected.venue && selected.services.length === 0}
                    onClick={() => onApply(selected)}
                  >
                    {applyLabel || 'Appliquer'}
                  </Button>
                  {onApplyAll && packages.length ? (
                    <Button size="sm" variant="secondary" onClick={() => onApplyAll(packages)}>
                      Tout appliquer
                    </Button>
                  ) : null}
                </div>
              ) : isLoggedIn ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {onSavePack ? (
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<BookmarkPlus className="w-3.5 h-3.5" />}
                      loading={saveBusy}
                      disabled={!selected.venue && selected.services.length === 0}
                      onClick={onSavePack}
                    >
                      Retenir ce pack
                    </Button>
                  ) : null}
                  {canCreateEvents ? (
                    <Link href="/dashboard/events?create=1" className="w-full sm:w-auto">
                      <Button size="sm" variant="secondary" fullWidth leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}>
                        Créer l’événement
                      </Button>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Link href="/register?kind=CLIENT&intent=seeker&action=ai_simulator" className="w-full sm:w-auto">
                    <Button size="sm" variant="primary" fullWidth leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                      Créer un compte
                    </Button>
                  </Link>
                  {onBuyTokens ? (
                    <Button size="sm" variant="secondary" onClick={onBuyTokens}>
                      Acheter {AI_TOKEN_PACK_SIZE} sims
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            {packages.length > 1 ? (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
                {packages.map((pack) => {
                  const active = pack.id === selected.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => onSelectPack(pack.id)}
                      className={cn(
                        'shrink-0 px-3 py-1.5 rounded-[var(--radius-button)] text-xs font-semibold border transition',
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'border-border text-muted hover:text-foreground',
                      )}
                    >
                      {pack.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {selected.rationale ? (
              <p className="text-sm text-muted leading-relaxed">{selected.rationale}</p>
            ) : null}

            {selected.warnings.length > 0 ? (
              <ul className="space-y-1 text-[12px] text-amber-800 dark:text-amber-200 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                {selected.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selected.venue ? (
                <li>
                  <ElementRow
                    item={selected.venue}
                    kind="Salle"
                    icon={<Building2 className="w-4 h-4" />}
                    rate={exchangeRate}
                    onOpen={() => openElement({ kind: 'venue', slug: selected.venue!.slug })}
                  />
                </li>
              ) : null}
              {selected.services.map((item) => {
                const rental = isServiceRentalCategory(item.category);
                return (
                  <li key={item.slug}>
                    <ElementRow
                      item={item}
                      kind={rental ? 'Matériel' : 'Prestataire'}
                      icon={rental ? <KeyRound className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                      rate={exchangeRate}
                      onOpen={() => openElement({ kind: 'service', slug: item.slug })}
                    />
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-muted">Touchez un élément pour l’ouvrir — la fiche complète n’est pas quittée.</p>
          </div>
        ) : null}
      </Modal>

      {onOpenListing ? null : (
        <EventPrepListingModal
          target={listing}
          selected={false}
          dateKey={eventDate || ''}
          guestCount={guestCount}
          onClose={() => setListing(null)}
        />
      )}
    </>
  );
}

function ElementRow({
  item,
  kind,
  icon,
  rate = 2800,
  onOpen,
}: {
  item: EventPlanAiItem;
  kind: string;
  icon: React.ReactNode;
  rate?: number;
  onOpen: () => void;
}) {
  const itemUsd = item.estimatedFc > 0 ? Math.round(item.estimatedFc / rate) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-[var(--radius-button)] border border-border px-2.5 py-2 min-h-11 text-left hover:border-primary/40 hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-surface-muted shrink-0">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sizedMediaUrl(item.coverUrl, 96)}
            alt={item.title ? `Visuel de ${item.title}` : 'Visuel'}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">{icon}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted">{kind}</p>
        <span className="text-sm font-semibold truncate block">{item.title}</span>
        <p className="text-[11px] text-muted truncate">
          {[item.categoryLabel, item.orgName, item.location].filter(Boolean).join(' · ')}
        </p>
      </div>
      {item.estimatedFc > 0 ? (
        <div className="text-right shrink-0">
          <span className="text-xs font-bold text-foreground block">
            {itemUsd.toLocaleString('fr-FR')} $
          </span>
          <span className="text-[10px] text-muted block">
            {formatFc(item.estimatedFc)}
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-muted shrink-0">Sur devis</span>
      )}
    </button>
  );
}
