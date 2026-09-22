'use client';

import { formatFc } from '@/config/landingPricing';
import { indicativeDeliveryFc } from '@/lib/listingDetails';
import { communesForCity } from '@/lib/rdcCities';
import { cn } from '@/lib/cn';

const fieldClass =
  'w-full min-h-[44px] px-3.5 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

export default function DeliveryCommuneField({
  commune,
  onCommuneChange,
  deliveryPriceFc,
  deliveryByCommune,
  proposedFc,
  onProposedChange,
}: {
  commune: string;
  onCommuneChange: (value: string) => void;
  deliveryPriceFc?: number | null;
  deliveryByCommune?: Record<string, string> | null;
  proposedFc?: string;
  onProposedChange?: (value: string) => void;
}) {
  const published = indicativeDeliveryFc({
    deliveryMode: 'extra_fee',
    deliveryPriceFc,
    byCommune: deliveryByCommune,
    commune,
  });

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">Commune de livraison à Kinshasa</span>
        <select
          required
          value={commune}
          onChange={(event) => onCommuneChange(event.target.value)}
          className={fieldClass}
        >
          <option value="">Choisir une commune</option>
          {communesForCity('Kinshasa').map((item) => (
            <option key={item.name} value={item.name}>{item.name}</option>
          ))}
        </select>
      </label>
      {commune ? (
        <p className="text-sm text-muted leading-relaxed">
          {published.source === 'commune'
            ? `Tarif publié pour ${published.commune} : ${formatFc(published.amountFc)}, une seule fois.`
            : published.source === 'default'
              ? `Pas de prix propre pour ${commune}. Tarif par défaut : ${formatFc(published.amountFc)}, une seule fois.`
              : `Pas encore de tarif publié pour ${commune}.`}
          {' '}Ce montant est indicatif : vous pouvez en proposer un autre, le prestataire le confirme dans le devis.
        </p>
      ) : (
        <p className="text-sm text-muted leading-relaxed">
          Le prix dépend de la commune. Il reste discutable dans le devis.
        </p>
      )}
      {onProposedChange ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Autre montant de livraison proposé (FC)</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={proposedFc || ''}
            onChange={(event) => onProposedChange(event.target.value)}
            className={cn(fieldClass)}
            placeholder="Laisser vide pour partir du tarif publié"
          />
        </label>
      ) : null}
    </div>
  );
}
