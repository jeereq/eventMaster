'use client';

import React from 'react';
import { FileText, Info, Phone, Shield, Sparkles, Wallet } from 'lucide-react';
import {
  amenityLabel,
  eventTypeLabel,
  type ListingDetails,
} from '@/lib/listingDetails';

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5 sm:p-4 space-y-2.5">
      <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
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
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const rentalLogistics = [
    details.securityDepositFc ? { label: 'Caution (FC)', value: Number(details.securityDepositFc).toLocaleString('fr-FR') } : null,
    details.deliveryMode === 'pickup' ? { label: 'Livraison', value: 'Retrait sur place' } :
    details.deliveryMode === 'included' ? { label: 'Livraison', value: 'Livraison incluse' } :
    details.deliveryMode === 'extra_fee' ? { label: 'Livraison', value: 'En supplément' } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="space-y-4">
      {amenities.length > 0 && (
        <Section title={kind === 'venue' ? 'Équipements' : 'Atouts'} icon={<Sparkles className="w-4 h-4" />}>
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((id) => (
              <span key={id} className="px-2.5 py-1 rounded-[var(--radius-button)] text-[11px] font-medium bg-surface-muted border border-border">
                {amenityLabel(id)}
              </span>
            ))}
          </div>
        </Section>
      )}
      {eventTypes.length > 0 && (
        <Section title="Types d’événements" icon={<Sparkles className="w-4 h-4" />}>
          <div className="flex flex-wrap gap-1.5">
            {eventTypes.map((id) => (
              <span key={id} className="px-2.5 py-1 rounded-[var(--radius-button)] text-[11px] font-medium bg-primary/10 text-primary border border-primary/15">
                {eventTypeLabel(id)}
              </span>
            ))}
          </div>
        </Section>
      )}
      {facts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-[var(--radius-card)] border border-border bg-surface-muted/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{fact.label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{fact.value}</p>
            </div>
          ))}
        </div>
      )}
      
      {rentalFacts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {rentalFacts.map((fact) => (
            <div key={fact.label} className="rounded-[var(--radius-card)] border border-border bg-primary/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold">{fact.label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{fact.value}</p>
            </div>
          ))}
        </div>
      )}

      {rentalLogistics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {rentalLogistics.map((fact) => (
            <div key={fact.label} className="rounded-[var(--radius-card)] border border-border bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-700/70 dark:text-amber-500/70 font-semibold">{fact.label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{fact.value}</p>
            </div>
          ))}
        </div>
      )}

      {details.accessories ? (
        <Section title="Accessoires fournis" icon={<Sparkles className="w-4 h-4" />}>
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.accessories}</p>
        </Section>
      ) : null}

      {details.returnRules ? (
        <Section title="Règles de restitution" icon={<Shield className="w-4 h-4" />}>
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.returnRules}</p>
        </Section>
      ) : null}

      {details.included ? (
        <Section title="Inclus dans le tarif" icon={<Wallet className="w-4 h-4" />}>
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.included}</p>
        </Section>
      ) : null}
      {hasContact ? (
        <Section title="Contact" icon={<Phone className="w-4 h-4" />}>
          <div className="flex flex-col gap-1.5 text-sm">
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
                WhatsApp {details.contactWhatsapp}
              </a>
            ) : null}
            {details.instagram ? (
              <a
                href={`https://instagram.com/${details.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
              >
                {details.instagram.startsWith('@') ? details.instagram : `@${details.instagram}`}
              </a>
            ) : null}
          </div>
        </Section>
      ) : null}
      {details.accessNotes ? (
        <Section title="Accès" icon={<Info className="w-4 h-4" />}>
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.accessNotes}</p>
        </Section>
      ) : null}
      {details.extraFees ? (
        <Section title="Suppléments" icon={<Wallet className="w-4 h-4" />}>
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.extraFees}</p>
        </Section>
      ) : null}
      {details.houseRules ? (
        <Section title="Règles" icon={<FileText className="w-4 h-4" />}>
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.houseRules}</p>
        </Section>
      ) : null}
      {details.cancellation ? (
        <Section title="Annulation" icon={<Shield className="w-4 h-4" />}>
          <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{details.cancellation}</p>
        </Section>
      ) : null}
    </div>
  );
}
