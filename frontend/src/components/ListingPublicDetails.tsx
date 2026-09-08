'use client';

import React from 'react';
import { formatFc } from '@/config/landingPricing';
import {
  amenityLabel,
  eventTypeLabel,
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
    listingDeliveryLabel(details.deliveryMode)
      ? { label: 'Livraison', value: listingDeliveryLabel(details.deliveryMode) }
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
    || details.returnRules,
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
        <Block title="Contact">
          <div className="flex flex-wrap gap-2">
            {contacts.map((item) => (
              <a
                key={item.href}
                href={item.href}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm font-semibold text-primary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {item.label}
              </a>
            ))}
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
