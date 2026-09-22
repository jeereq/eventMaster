'use client';

import { useId } from 'react';
import { formatFc } from '@/config/landingPricing';
import { indicativeDeliveryFc } from '@/lib/listingDetails';
import { communesForCity } from '@/lib/rdcCities';
import { cn } from '@/lib/cn';

const fieldClass =
  'w-full min-h-[44px] px-3.5 py-2.5 rounded-[var(--radius-button)] border bg-surface-muted text-base sm:text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:border-primary';

export default function DeliveryCommuneField({
  commune,
  onCommuneChange,
  deliveryPriceFc,
  deliveryByCommune,
  proposedFc,
  onProposedChange,
  error,
}: {
  commune: string;
  onCommuneChange: (value: string) => void;
  deliveryPriceFc?: number | null;
  deliveryByCommune?: Record<string, string> | null;
  proposedFc?: string;
  onProposedChange?: (value: string) => void;
  error?: string;
}) {
  const hintId = useId();
  const errorId = useId();
  const published = indicativeDeliveryFc({
    deliveryMode: 'extra_fee',
    deliveryPriceFc,
    byCommune: deliveryByCommune,
    commune,
  });

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          Commune de livraison à Kinshasa
          <span className="text-danger"> *</span>
        </span>
        <select
          required
          value={commune}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          onChange={(event) => onCommuneChange(event.target.value)}
          className={cn(fieldClass, error ? 'border-danger/40 focus-visible:ring-danger/25' : 'border-border focus-visible:ring-primary/25')}
        >
          <option value="">Choisir une commune</option>
          {communesForCity('Kinshasa').map((item) => (
            <option key={item.name} value={item.name}>{item.name}</option>
          ))}
        </select>
      </label>
      <p id={hintId} className="text-sm text-muted leading-relaxed">
        {commune
          ? published.source === 'commune'
            ? `Tarif publié pour ${published.commune} : ${formatFc(published.amountFc)}, une seule fois.`
            : published.source === 'default'
              ? `Pas de prix propre pour ${commune}. Tarif par défaut : ${formatFc(published.amountFc)}, une seule fois.`
              : `Pas encore de tarif publié pour ${commune}.`
          : 'Le prix dépend de la commune.'}
        {' '}
        {onProposedChange
          ? 'Ce tarif est indicatif : proposez un autre montant ci-dessous. Le prestataire confirme dans le devis.'
          : 'Ce tarif est indicatif. Pour en convenir un autre, envoyez un devis.'}
      </p>
      {error ? (
        <p id={errorId} className="text-sm text-danger" role="alert">{error}</p>
      ) : null}
      {onProposedChange ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Autre montant de livraison proposé (FC)</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={proposedFc || ''}
            onChange={(event) => onProposedChange(event.target.value)}
            className={cn(fieldClass, 'border-border focus-visible:ring-primary/25')}
            placeholder="Laisser vide pour partir du tarif publié"
          />
        </label>
      ) : null}
    </div>
  );
}
