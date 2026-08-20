'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
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
    <section id={id} className={cn('py-16 sm:py-20 bg-surface border-t border-border scroll-mt-16', className)}>
      <div className="page-container">
        <div className="max-w-2xl mb-8 space-y-2">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h2>
          <p className="text-sm text-muted leading-relaxed">{subtitle}</p>
        </div>

        <div className="space-y-2 max-w-3xl">
          {items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="bg-background border border-border rounded-[var(--radius-card)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-surface-muted/50 transition"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-foreground">{item.question}</span>
                  <ChevronDown
                    className={cn('w-4 h-4 text-muted shrink-0 transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-sm text-muted leading-relaxed border-t border-border pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showContactLink && (
          <p className="text-xs text-muted mt-8">
            Pas de réponse ?{' '}
            <Link href="/contact" className="font-medium text-foreground underline underline-offset-2 hover:no-underline">
              Contactez-nous
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
