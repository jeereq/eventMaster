'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
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
}

export default function FaqSection({
  id = 'faq',
  title = 'Questions fréquentes',
  subtitle = 'Forfaits, invitations, accueil le jour J, marketplace et support.',
  showContactLink = true,
  className = '',
  itemIds,
}: FaqSectionProps) {
  const { site } = usePlatformSite();
  const source = useMemo(() => {
    if (!itemIds?.length) return FAQ_ITEMS;
    return itemIds
      .map((itemId) => FAQ_ITEMS.find((item) => item.id === itemId))
      .filter((item): item is (typeof FAQ_ITEMS)[number] => Boolean(item));
  }, [itemIds]);

  const [openId, setOpenId] = useState<string | null>(source[0]?.id ?? null);

  useEffect(() => {
    setOpenId(source[0]?.id ?? null);
  }, [source]);

  const items = source.map((item) => ({
    ...item,
    answer:
      item.id === 'support'
        ? `Utilisez le formulaire de contact, écrivez à ${site.supportEmail} ou appelez le ${site.supportPhone} (${site.whatsappNote}). Notre équipe répond aux questions commerciales, techniques et de facturation.`
        : interpolateRates(item.answer, site),
  }));

  return (
    <section id={id} className={cn('em-landing-defer py-16 sm:py-20 bg-surface/80 dark:bg-background/80 border-t border-border scroll-mt-16 em-landing-section-glow', className)}>
      <div className="page-container relative z-10">
        <div className="max-w-2xl mb-8 space-y-2.5">
          <span className="em-festive-chip">
            <Sparkles className="w-3 h-3" />
            FAQ & Aide
          </span>
          <h2 className="em-landing-heading text-2xl sm:text-3xl text-foreground">{title}</h2>
          <p className="text-sm text-muted leading-relaxed">{subtitle}</p>
        </div>

        <div className="space-y-2.5 max-w-3xl">
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
                  className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                >
                  <span className={cn('min-w-0 text-sm font-semibold transition-colors', isOpen ? 'text-primary' : 'text-foreground')}>
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform duration-200',
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

        {showContactLink && (
          <div className="mt-8 flex items-center gap-2 text-xs text-muted">
            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
            <span>
              Une question spécifique ?{' '}
              <Link href="/contact" className="font-bold text-primary hover:underline">
                Contactez notre équipe de support →
              </Link>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
