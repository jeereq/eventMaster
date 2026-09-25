'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '@/config/siteContent';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { interpolateRates } from '@/lib/platformRates';

interface FaqSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  showContactLink?: boolean;
  className?: string;
  /** Si fourni, n’affiche que ces questions (ordre conservé). */
  itemIds?: string[];
  /** Lien vers la FAQ complète, affiché quand la liste est filtrée. */
  moreHref?: string;
  /** Titre, liens et contact à gauche, questions à droite (grands écrans). */
  split?: boolean;
}

export default function FaqSection({
  id = 'faq',
  title = 'Questions fréquentes',
  subtitle = 'Forfaits, invitations, marketplace, boissons, livraison et support.',
  showContactLink = true,
  className = '',
  itemIds,
  moreHref,
  split = false,
}: FaqSectionProps) {
  const { site } = usePlatformSite();
  const source = useMemo(() => {
    if (!itemIds?.length) return FAQ_ITEMS;
    return itemIds
      .map((itemId) => FAQ_ITEMS.find((item) => item.id === itemId))
      .filter((item): item is (typeof FAQ_ITEMS)[number] => Boolean(item));
  }, [itemIds]);

  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setOpenId(null);
  }, [source]);

  const items = source.map((item) => ({
    ...item,
    answer:
      item.id === 'support'
        ? `Utilisez le formulaire de contact, écrivez à ${site.supportEmail} ou appelez le ${site.supportPhone} (${site.whatsappNote}). Notre équipe répond aux questions commerciales, techniques et de facturation.`
        : interpolateRates(item.answer, site),
  }));

  const links = (
    <>
      {moreHref ? (
        <div className={cn('max-w-3xl', split ? 'mt-2' : 'mt-5')}>
          <Link
            href={moreHref}
            className="inline-flex items-center min-h-11 text-sm font-semibold text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Voir toutes les questions ({FAQ_ITEMS.length}) →
          </Link>
        </div>
      ) : null}

      {showContactLink && (
        <div className={cn('flex items-center gap-2 text-xs text-muted', split ? 'mt-2' : 'mt-8')}>
          <HelpCircle className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <span>
            Une question ?{' '}
            <Link
              href="/contact"
              className="font-bold text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="sm:hidden">Nous écrire</span>
              <span className="hidden sm:inline">Contactez notre équipe de support →</span>
            </Link>
          </span>
        </div>
      )}
    </>
  );

  return (
    <section id={id} className={cn('em-landing-defer py-8 sm:py-20 bg-surface/80 dark:bg-background/80 border-t border-border scroll-mt-16 em-landing-section-glow', className)}>
      <div
        className={cn(
          'page-container relative z-10',
          split && 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16 lg:items-start',
        )}
      >
        <div className={cn('max-w-2xl mb-5 sm:mb-8 space-y-2.5', split && 'lg:mb-0 lg:sticky lg:top-28')}>
          {split ? (
            <span className="block text-xs sm:text-sm font-bold text-primary tracking-[0.06em] uppercase">FAQ</span>
          ) : null}
          <h2 className={cn('em-landing-heading text-foreground', split ? 'text-3xl sm:text-[2.5rem]' : 'text-xl sm:text-3xl')}>
            {title}
          </h2>
          {subtitle ? (
            <p className={cn('text-sm text-muted leading-relaxed', !split && 'hidden sm:block')}>{subtitle}</p>
          ) : null}
          {split ? <div className="hidden lg:block pt-2">{links}</div> : null}
        </div>

        <div className={cn('space-y-2.5', !split && 'max-w-3xl')}>
          {items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-[var(--radius-card)] transition-all overflow-hidden border',
                  isOpen
                    ? 'border-primary/50 bg-background shadow-md shadow-primary/5'
                    : 'border-border bg-background hover:border-primary/30',
                )}
              >
                <button
                  type="button"
                  id={`faq-trigger-${item.id}`}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="relative z-10 w-full min-h-12 flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 text-left transition cursor-pointer touch-manipulation active:bg-surface-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                >
                  <span className={cn('min-w-0 text-sm font-semibold transition-colors', isOpen ? 'text-primary' : 'text-foreground')}>
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
                  className="px-4 sm:px-5 pb-4 text-xs sm:text-sm text-muted leading-relaxed border-t border-border/80 pt-3.5 whitespace-pre-line break-words"
                >
                  {item.answer}
                </div>
              </div>
            );
          })}
        </div>

        {split ? <div className="lg:hidden">{links}</div> : links}
      </div>
    </section>
  );
}
