'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';

export default function LandingMobileStickyBar({
  ctaLabel = 'Créer mon événement',
  ctaHref = '/register',
}: {
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Afficher la barre dès qu'on a fait défiler de 400px
      if (window.scrollY > 400) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <aside
      aria-label="Accès rapide inscription"
      className="fixed bottom-0 inset-x-0 z-40 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden bg-surface/95 backdrop-blur-md border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.1)] animate-slide-up"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[color:var(--festive-accent)] shrink-0" />
            100% dans le navigateur
          </p>
          <p className="text-[10px] text-muted truncate">Sans carte bancaire · Essai gratuit</p>
        </div>

        <Link href={ctaHref} className="shrink-0">
          <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            {ctaLabel}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
