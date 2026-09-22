'use client';

import React from 'react';
import { formatFc } from '@/config/landingPricing';
import { goToListingInquire } from '@/lib/listingInquire';
import {
  amenityLabel,
  eventTypeLabel,
  kinshasaDeliveryPrices,
  listingConditionLabel,
  listingDeliveryLabel,
  type ListingDetails,
  type ListingPublicKind,
} from '@/lib/listingDetails';

function Facts({ items }: { items: Array<{ label: string; value: string }> }) {
  if (!items.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {items.map((fact) => (
        <div key={fact.label}>
          <dt className="text-xs font-semibold text-muted">{fact.label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground break-words">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function KinshasaDeliveryPrices({
  prices,
  fallbackLabel,
}: {
  prices: Array<{ commune: string; priceFc: number }>;
  fallbackLabel: string;
}) {
  const [query, setQuery] = React.useState('');
  const needle = query.trim().toLowerCase();
  const visible = needle ? prices.filter((row) => row.commune.toLowerCase().includes(needle)) : prices;

  return (
    <Block title="Livraison selon la commune de Kinshasa">
      <p className="text-sm text-muted leading-relaxed">
        Tarifs indicatifs. Le devis peut les changer.
      </p>
      {prices.length > 6 ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Chercher une commune</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Gombe, Lemba…"
            className="min-h-[44px] w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 text-base text-foreground placeholder:text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 sm:text-sm"
          />
        </label>
      ) : null}
      {visible.length === 0 ? (
        <p className="text-sm text-muted" role="status">Aucune commune pour « {query.trim()} ».</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((row) => (
            <li key={row.commune} className="flex min-h-[44px] items-center justify-between gap-3 text-sm">
              <span>{row.commune}</span>
              <span className="tabular-nums font-medium">{formatFc(row.priceFc)}</span>
            </li>
          ))}
        </ul>
      )}
      {fallbackLabel ? (
        <p className="text-sm text-muted">{fallbackLabel}</p>
      ) : null}
    </Block>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex items-center rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function contactHref(kind: 'tel' | 'whatsapp' | 'instagram', value: string) {
  if (kind === 'tel') return `tel:${value}`;
  if (kind === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
  return `https://instagram.com/${value.replace(/^@/, '')}`;
}

export default function ListingPublicDetails({
  details,
  kind,
}: {
  details?: ListingDetails | null;
  kind: ListingPublicKind;
}) {
  if (!details) return null;

  const amenities = details.amenities || [];
  const eventTypes = details.eventTypes || [];
  const hours = [details.openingHours, details.closingHours].filter(Boolean).join(' – ');
  const amenityLabels = amenities.map((id) => amenityLabel(id));
  const eventLabels = eventTypes.map((id) => eventTypeLabel(id));

  const venueFacts = [
    hours ? { label: 'Horaires', value: hours } : null,
    details.surfaceM2 ? { label: 'Surface', value: `${details.surfaceM2} m²` } : null,
    details.minNoticeHours ? { label: 'Préavis', value: `${details.minNoticeHours} h` } : null,
    details.languages ? { label: 'Langues', value: details.languages } : null,
    details.depositPercent ? { label: 'Acompte', value: `${details.depositPercent} %` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const serviceFacts = [
    details.teamSize ? { label: 'Équipe', value: `${details.teamSize} pers.` } : null,
    details.experienceYears ? { label: 'Expérience', value: `${details.experienceYears} ans` } : null,
    details.minNoticeHours ? { label: 'Préavis', value: `${details.minNoticeHours} h` } : null,
    details.languages ? { label: 'Langues', value: details.languages } : null,
    details.depositPercent ? { label: 'Acompte', value: `${details.depositPercent} %` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const communePrices = kinshasaDeliveryPrices(details.deliveryByCommune);
  const deliveryByPlace = details.deliveryMode === 'extra_fee' && communePrices.length > 0;
  const rentalFacts = [
    details.brand ? { label: 'Marque', value: details.brand } : null,
    details.modelName ? { label: 'Modèle', value: details.modelName } : null,
    details.year ? { label: 'Année', value: details.year } : null,
    listingConditionLabel(details.condition)
      ? { label: 'État', value: listingConditionLabel(details.condition) }
      : null,
    details.colors ? { label: 'Couleurs', value: details.colors } : null,
    details.dimensions ? { label: 'Dimensions', value: details.dimensions } : null,
    details.capacity ? { label: 'Capacité', value: details.capacity } : null,
    details.securityDepositFc
      ? { label: 'Caution', value: formatFc(details.securityDepositFc) }
      : null,
    deliveryByPlace
      ? { label: 'Livraison', value: 'En supplément, selon la commune' }
      : listingDeliveryLabel(details.deliveryMode, details.deliveryPriceFc)
        ? { label: 'Livraison', value: listingDeliveryLabel(details.deliveryMode, details.deliveryPriceFc) }
        : null,
    details.minNoticeHours ? { label: 'Préavis', value: `${details.minNoticeHours} h` } : null,
    details.languages ? { label: 'Langues', value: details.languages } : null,
    details.depositPercent ? { label: 'Acompte', value: `${details.depositPercent} %` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const facts = kind === 'venue' ? venueFacts : kind === 'rental' ? rentalFacts : serviceFacts;
  const amenityTitle = kind === 'venue' ? 'Équipements' : kind === 'rental' ? 'Inclus' : 'Atouts';
  const hasContact = Boolean(details.contactPhone || details.contactWhatsapp || details.instagram);
  const hasBody = Boolean(
    facts.length
    || amenityLabels.length
    || eventLabels.length
    || details.included
    || hasContact
    || details.accessNotes
    || details.extraFees
    || details.houseRules
    || details.cancellation
    || details.accessories
    || details.returnRules
    || deliveryByPlace,
  );
  if (!hasBody) return null;

  const contacts = [
    details.contactPhone
      ? { href: contactHref('tel', details.contactPhone), label: details.contactPhone, external: false }
      : null,
    details.contactWhatsapp
      ? { href: contactHref('whatsapp', details.contactWhatsapp), label: 'WhatsApp', external: true }
      : null,
    details.instagram
      ? {
          href: contactHref('instagram', details.instagram),
          label: details.instagram.startsWith('@') ? details.instagram : `@${details.instagram}`,
          external: true,
        }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; external: boolean }>;

  return (
    <div className="space-y-8">
      {facts.length > 0 ? (
        <Block title={kind === 'rental' ? 'Caractéristiques' : 'À retenir'}>
          <Facts items={facts} />
        </Block>
      ) : null}

      {deliveryByPlace ? (
        <KinshasaDeliveryPrices
          prices={communePrices}
          fallbackLabel={details.deliveryPriceFc ? `Autres communes : ${formatFc(details.deliveryPriceFc)}, une seule fois.` : ''}
        />
      ) : null}

      {amenityLabels.length > 0 ? (
        <Block title={amenityTitle}>
          <ChipList items={amenityLabels} />
        </Block>
      ) : null}

      {eventLabels.length > 0 ? (
        <Block title="Occasions">
          <ChipList items={eventLabels} />
        </Block>
      ) : null}

      {details.accessories ? (
        <Block title="Accessoires fournis">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{details.accessories}</p>
        </Block>
      ) : null}
      {details.returnRules ? (
        <Block title="Restitution">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{details.returnRules}</p>
        </Block>
      ) : null}
      {details.included ? (
        <Block title="Inclus dans le tarif">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{details.included}</p>
        </Block>
      ) : null}
      {hasContact ? (
        <Block title="Joindre directement">
          <p className="text-xs text-muted leading-relaxed">
            Ces liens ouvrent le téléphone, WhatsApp ou Instagram, hors EventMaster. Pour un devis ou une réservation suivis sur la plateforme, utilisez Devis ou Réserver.
          </p>
          <div className="flex flex-wrap gap-2">
            {contacts.map((item) => (
              <a
                key={item.href}
                href={item.href}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={goToListingInquire}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-button)] bg-primary-solid px-3 text-sm font-semibold text-primary-foreground hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Aller au devis
            </button>
          </div>
        </Block>
      ) : null}
      {details.accessNotes ? (
        <Block title="Accès">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{details.accessNotes}</p>
        </Block>
      ) : null}
      {details.extraFees ? (
        <Block title="Suppléments">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{details.extraFees}</p>
        </Block>
      ) : null}
      {details.houseRules ? (
        <Block title="Règles">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{details.houseRules}</p>
        </Block>
      ) : null}
      {details.cancellation ? (
        <Block title="Annulation">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{details.cancellation}</p>
        </Block>
      ) : null}
    </div>
  );
}
