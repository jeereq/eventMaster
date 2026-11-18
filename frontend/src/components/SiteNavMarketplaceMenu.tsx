'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Calendar, ChevronDown, KeyRound, Sparkles, Wine, type LucideIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

export const MARKETPLACE_SECTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/marketplace/salles', label: 'Salles', icon: Building2 },
  { href: '/marketplace/prestataires', label: 'Prestataires', icon: Sparkles },
  { href: '/marketplace/locations', label: 'Matériel', icon: KeyRound },
  { href: '/marketplace/boissons', label: 'Boissons', icon: Wine },
  { href: '/marketplace/evenements', label: 'Événements', icon: Calendar },
];

/**
 * Entrée « Marketplace » du menu principal : le lien mène au hub, la flèche ouvre les rubriques.
 * Ouverture au survol (souris), au clic sur la flèche (toucher, clavier) ; Échap ou sortie du focus referme.
 */
export default function SiteNavMarketplaceMenu({ active, linkClassName }: { active: boolean; linkClassName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const panelId = useId();

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Petit délai : le curseur peut traverser l'espace entre le lien et le panneau sans le refermer.
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      ref={rootRef}
      className="relative flex items-center"
      onPointerEnter={(e) => e.pointerType === 'mouse' && openNow()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Link href="/marketplace" aria-current={active ? 'page' : undefined} className={linkClassName}>
        <span>Marketplace</span>
      </Link>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Fermer les rubriques du marketplace' : 'Ouvrir les rubriques du marketplace'}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-11 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          active ? 'text-primary' : 'text-foreground hover:text-primary',
        )}
      >
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="em-nav-menu absolute left-1/2 top-full z-50 w-60 -translate-x-1/2 pt-2"
      >
        <ul className="rounded-2xl border border-border bg-surface p-1.5 shadow-xl" role="list">
          {MARKETPLACE_SECTIONS.map((section) => {
            const Icon = section.icon;
            const current = pathname.startsWith(section.href);
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={current ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    current ? 'bg-primary/10 font-bold text-primary' : 'font-medium text-foreground hover:bg-surface-muted',
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden />
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
