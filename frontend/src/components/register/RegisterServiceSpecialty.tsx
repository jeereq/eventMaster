'use client';

import React from 'react';
import { Briefcase, Package, ChevronLeft } from 'lucide-react';
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  type ServiceCategory,
} from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import type { VendorServiceGroup } from '@/lib/registerVendorIntent';

const GROUPS: Array<{
  id: VendorServiceGroup;
  title: string;
  hint: string;
  icon: typeof Briefcase;
}> = [
  {
    id: 'trade',
    title: 'Une prestation',
    hint: 'Vous vous déplacez ou intervenez le jour J.',
    icon: Briefcase,
  },
  {
    id: 'rental',
    title: 'Du matériel à louer',
    hint: 'Habits, sono, mobilier, véhicules, tentes…',
    icon: Package,
  },
];

export default function RegisterServiceSpecialty({
  group,
  category,
  onGroup,
  onCategory,
  onBack,
}: {
  group: VendorServiceGroup | null;
  category: ServiceCategory | null;
  onGroup: (group: VendorServiceGroup) => void;
  onCategory: (category: ServiceCategory) => void;
  onBack: () => void;
}) {
  const options = group === 'rental' ? SERVICE_RENTAL_CATEGORIES : SERVICE_TRADE_CATEGORIES;

  return (
    <div className="space-y-3.5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 min-h-11 text-xs font-semibold text-muted hover:text-foreground mb-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
          Quel est votre métier ?
        </h2>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          Choisissez d’abord le type d’offre, puis votre spécialité. Vous pourrez en ajouter d’autres après.
        </p>
      </div>

      <div role="radiogroup" aria-label="Type d’offre" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GROUPS.map((item) => {
          const Icon = item.icon;
          const selected = group === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onGroup(item.id)}
              className={cn(
                'flex items-start gap-2.5 min-h-11 p-3 rounded-[var(--radius-card)] border text-left transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-surface hover:border-primary/40',
              )}
            >
              <span className={cn(
                'w-9 h-9 rounded-[var(--radius-button)] flex items-center justify-center shrink-0',
                selected ? 'bg-primary/15 text-primary' : 'bg-surface-muted text-muted',
              )}>
                <Icon className="w-4 h-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                <span className="block text-xs text-muted mt-0.5 leading-relaxed">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {group && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            {group === 'rental' ? 'Quel matériel louez-vous ?' : 'Quelle prestation proposez-vous ?'}
          </p>
          <div role="radiogroup" aria-label="Spécialité" className="flex flex-wrap gap-1.5">
            {options.map((id) => {
              const selected = category === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onCategory(id)}
                  className={cn(
                    'min-h-11 px-3 py-2 rounded-full border text-xs font-semibold transition touch-manipulation',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    selected
                      ? 'border-primary bg-primary-solid text-primary-foreground'
                      : 'border-border bg-surface text-foreground hover:border-primary/40',
                  )}
                >
                  {SERVICE_CATEGORY_LABELS[id]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
