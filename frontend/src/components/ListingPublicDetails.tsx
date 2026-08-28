'use client';

import React from 'react';
import {
  amenityLabel,
  eventTypeLabel,
  type ListingDetails,
} from '@/lib/listingDetails';

function Facts({ items }: { items: Array<{ label: string; value: string }> }) {
  if (!items.length) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
      {items.map((fact) => (
        <div key={fact.label} className="flex items-baseline justify-between gap-4 sm:block">
          <dt className="text-xs text-muted">{fact.label}</dt>
          <dd className="text-sm font-medium text-foreground sm:mt-0.5">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
      {children}
    </section>
  );
}

export default function ListingPublicDetails({
  details,
  kind,
}: {
  details?: ListingDetails | null;
  kind: 'venue' | 'service';
}) {
  if (!details) return null;
  const amenities = details.amenities || [];
  const eventTypes = details.eventTypes || [];
  const hours = [details.openingHours, details.closingHours].filter(Boolean).join(' – ');
  const facts = [
    hours ? { label: 'Horaires', value: hours } : null,
    details.surfaceM2 ? { label: 'Surface', value: `${details.surfaceM2} m²` } : null,
    details.teamSize ? { label: 'Équipe', value: `${details.teamSize} pers.` } : null,
    details.experienceYears ? { label: 'Expérience', value: `${details.experienceYears} ans` } : null,
    details.minNoticeHours ? { label: 'Préavis', value: `${details.minNoticeHours} h` } : null,
    details.languages ? { label: 'Langues', value: details.languages } : null,
    details.depositPercent ? { label: 'Acompte', value: `${details.depositPercent} %` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const hasContact = details.contactPhone || details.contactWhatsapp || details.instagram;
  const hasBody = amenities.length || eventTypes.length || details.included || facts.length
    || hasContact || details.accessNotes || details.extraFees || details.houseRules || details.cancellation
    || details.brand || details.modelName || details.capacity || details.accessories;
  if (!hasBody) return null;

  const rentalFacts = [
    details.brand ? { label: 'Marque', value: details.brand } : null,
    details.modelName ? { label: 'Modèle', value: details.modelName } : null,
    details.year ? { label: 'Année', value: details.year } : null,
    details.condition === 'new' ? { label: 'État', value: 'Neuf' } :
    details.condition === 'very_good' ? { label: 'État', value: 'Très bon état' } :
    details.condition === 'good' ? { label: 'État', value: 'Bon état' } :
    details.condition === 'vintage' ? { label: 'État', value: 'Vintage' } : null,
    details.colors ? { label: 'Couleurs', value: details.colors } : null,
    details.dimensions ? { label: 'Dimensions', value: details.dimensions } : null,
    details.capacity ? { label: 'Capacité', value: details.capacity } : null,
    details.securityDepositFc ? { label: 'Caution', value: `${Number(details.securityDepositFc).toLocaleString('fr-FR')} FC` } : null,
    details.deliveryMode === 'pickup' ? { label: 'Livraison', value: 'Retrait sur place' } :
    details.deliveryMode === 'included' ? { label: 'Livraison', value: 'Livraison incluse' } :
    details.deliveryMode === 'extra_fee' ? { label: 'Livraison', value: 'En supplément' } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const allFacts = [...facts, ...rentalFacts];

  return (
    <div className="space-y-8">
      {allFacts.length > 0 ? <Facts items={allFacts} /> : null}

      {amenities.length > 0 && (
        <Block title={kind === 'venue' ? 'Équipements' : 'Atouts'}>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {amenities.map((id) => amenityLabel(id)).join(' · ')}
          </p>
        </Block>
      )}
      {eventTypes.length > 0 && (
        <Block title="Types d’événements">
          <p className="text-sm text-foreground/90 leading-relaxed">
            {eventTypes.map((id) => eventTypeLabel(id)).join(' · ')}
          </p>
        </Block>
      )}
      {details.accessories ? (
        <Block title="Accessoires fournis">
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.accessories}</p>
        </Block>
      ) : null}
      {details.returnRules ? (
        <Block title="Restitution">
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.returnRules}</p>
        </Block>
      ) : null}
      {details.included ? (
        <Block title="Inclus dans le tarif">
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.included}</p>
        </Block>
      ) : null}
      {hasContact ? (
        <Block title="Contact">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {details.contactPhone ? (
              <a href={`tel:${details.contactPhone}`} className="text-primary font-medium hover:underline">
                {details.contactPhone}
              </a>
            ) : null}
            {details.contactWhatsapp ? (
              <a
                href={`https://wa.me/${details.contactWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline"
              >
                WhatsApp
              </a>
            ) : null}
            {details.instagram ? (
              <a
                href={`https://instagram.com/${details.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline"
              >
                {details.instagram.startsWith('@') ? details.instagram : `@${details.instagram}`}
              </a>
            ) : null}
          </div>
        </Block>
      ) : null}
      {details.accessNotes ? (
        <Block title="Accès">
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.accessNotes}</p>
        </Block>
      ) : null}
      {details.extraFees ? (
        <Block title="Suppléments">
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.extraFees}</p>
        </Block>
      ) : null}
      {details.houseRules ? (
        <Block title="Règles">
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.houseRules}</p>
        </Block>
      ) : null}
      {details.cancellation ? (
        <Block title="Annulation">
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.cancellation}</p>
        </Block>
      ) : null}
    </div>
  );
}
