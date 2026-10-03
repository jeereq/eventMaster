'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Search, X } from 'lucide-react';
import { FAQ_ITEMS, type FaqItem } from '@/config/siteContent';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { resolveFaqAnswer } from '@/components/landing/FaqSection';

/** Thèmes de la FAQ complète : les questions non listées tombent dans « Autres questions ». */
const FAQ_CATEGORIES: Array<{ id: string; label: string; itemIds: string[] }> = [
  {
    id: 'demarrer',
    label: 'Démarrer',
    itemIds: ['what-is-eventmaster', 'free-trial', 'mobile-app', 'client-account'],
  },
  {
    id: 'invites',
    label: 'Invitations et jour J',
    itemIds: ['placement-delivery', 'shared-tickets-personalization', 'ai-invitations-context', 'protocol-qr', 'roles'],
  },
  {
    id: 'billetterie',
    label: 'Billetterie et dons',
    itemIds: ['public-events', 'event-donations', 'collection-payouts'],
  },
  {
    id: 'marketplace',
    label: 'Salles et prestataires',
    itemIds: [
      'marketplace-venues',
      'marketplace-booking',
      'marketplace-drinks',
      'rental-delivery',
      'venue-subscription',
      'service-subscription',
      'event-packs',
    ],
  },
  {
    id: 'forfaits',
    label: 'Forfaits et paiement',
    itemIds: ['plans-quotas', 'guest-quota-period', 'room-editor-plans', 'b2c-annual', 'upgrade', 'invoices'],
  },
  {
    id: 'securite',
    label: 'Sécurité et support',
    itemIds: ['data-responsibility', 'security', 'support'],
  },
];

/** Recherche tolérante : sans accents ni majuscules. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function groupItems(items: FaqItem[]) {
  const used = new Set<string>();
  const groups = FAQ_CATEGORIES.map((category) => {
    const groupItemsList = category.itemIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is FaqItem => Boolean(item));
    groupItemsList.forEach((item) => used.add(item.id));
    return { id: category.id, label: category.label, items: groupItemsList };
  });
  const rest = items.filter((item) => !used.has(item.id));
  if (rest.length > 0) groups.push({ id: 'autres', label: 'Autres questions', items: rest });
  return groups.filter((group) => group.items.length > 0);
}

/**
 * FAQ complète : recherche, thèmes cliquables et questions regroupées.
 * Un lien /faq#<id> ouvre directement la question demandée.
 */
export default function FaqExplorer() {
  const { site } = usePlatformSite();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(
    () => FAQ_ITEMS.map((item) => ({ ...item, answer: resolveFaqAnswer(item, site) })),
    [site],
  );

  useEffect(() => {
    const openFromHash = () => {
      const hash = decodeURIComponent(window.location.hash.replace('#', ''));
      if (!hash || !FAQ_ITEMS.some((item) => item.id === hash)) return;
      setQuery('');
      setCategory('all');
      setOpenId(hash);
      window.setTimeout(() => {
        document.getElementById(`faq-trigger-${hash}`)?.scrollIntoView({ block: 'center' });
      }, 60);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  const groups = useMemo(() => {
    const needle = normalize(query.trim());
    const matching = needle
      ? items.filter((item) => normalize(`${item.question} ${item.answer}`).includes(needle))
      : items;
    const grouped = groupItems(matching);
    return category === 'all' ? grouped : grouped.filter((group) => group.id === category);
  }, [items, query, category]);

  const allGroups = useMemo(() => groupItems(items), [items]);
  const resultCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <section className="py-6 sm:py-12">
      <div className="page-container lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 lg:items-start">
        <aside className="lg:sticky lg:top-28 space-y-4 mb-6 lg:mb-0">
          <label className="relative block">
            <span className="sr-only">Rechercher une question</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher une question…"
              className="w-full min-h-12 pl-10 pr-10 rounded-[var(--radius-button)] border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full text-muted hover:text-foreground hover:bg-surface-muted"
                aria-label="Effacer la recherche"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            ) : null}
          </label>

          <nav aria-label="Thèmes de la FAQ">
            <ul
              className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 lg:mx-0 lg:px-0"
              role="list"
            >
              {[{ id: 'all', label: 'Toutes les questions', count: items.length }, ...allGroups.map((g) => ({ id: g.id, label: g.label, count: g.items.length }))].map((entry) => {
                const active = category === entry.id;
                return (
                  <li key={entry.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setCategory(entry.id)}
                      aria-pressed={active}
                      className={cn(
                        'w-full inline-flex items-center justify-between gap-3 min-h-10 px-3.5 rounded-full lg:rounded-[var(--radius-button)] border lg:border-transparent text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        active
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-surface lg:bg-transparent border-border text-foreground hover:bg-surface-muted',
                      )}
                    >
                      <span className="whitespace-nowrap">{entry.label}</span>
                      <span className={cn('text-xs tabular-nums', active ? 'text-primary' : 'text-muted')}>{entry.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden lg:block rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" aria-hidden />
              Pas trouvé ?
            </p>
            <p className="text-xs text-muted leading-relaxed">Notre équipe répond du lundi au samedi, 8h à 20h (heure de Kinshasa).</p>
            <Link href="/contact" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline">
              Écrire au support →
            </Link>
          </div>
        </aside>

        <div className="space-y-8 min-w-0" aria-live="polite">
          {query ? (
            <p className="text-sm text-muted">
              {resultCount === 0
                ? 'Aucune question ne correspond.'
                : `${resultCount} question${resultCount > 1 ? 's' : ''} pour « ${query.trim()} »`}
            </p>
          ) : null}

          {resultCount === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface p-8 text-center space-y-3">
              <p className="font-semibold text-foreground">Essayez un autre mot, ou posez directement votre question.</p>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center px-4 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground text-sm font-semibold hover:bg-primary-solid-hover"
              >
                Écrire au support
              </Link>
            </div>
          ) : null}

          {groups.map((group) => (
            <div key={group.id} className="space-y-3">
              <h2 className="em-landing-heading text-xl sm:text-2xl text-foreground">{group.label}</h2>
              <div className="space-y-2.5">
                {group.items.map((item) => {
                  const isOpen = openId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-[var(--radius-card)] transition-all overflow-hidden border scroll-mt-28',
                        isOpen
                          ? 'border-primary/50 bg-surface shadow-md shadow-primary/5'
                          : 'border-border bg-surface hover:border-primary/30',
                      )}
                    >
                      <button
                        type="button"
                        id={`faq-trigger-${item.id}`}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="w-full min-h-12 flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 text-left transition cursor-pointer touch-manipulation active:bg-surface-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${item.id}`}
                      >
                        <span className={cn('min-w-0 text-[15px] font-semibold', isOpen ? 'text-primary' : 'text-foreground')}>
                          {item.question}
                        </span>
                        <ChevronDown
                          aria-hidden
                          className={cn(
                            'w-4 h-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                            isOpen ? 'rotate-180 text-primary' : 'text-muted',
                          )}
                        />
                      </button>
                      <div
                        id={`faq-panel-${item.id}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${item.id}`}
                        hidden={!isOpen}
                        className="px-4 sm:px-5 pb-4 text-sm text-muted leading-relaxed border-t border-border/80 pt-3.5 whitespace-pre-line break-words"
                      >
                        {item.answer}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
