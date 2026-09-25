'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { PartyPopper, Sun, Moon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import PublicAccentPicker from '@/components/PublicAccentPicker';
import PWAInstallCta from '@/components/PWAInstallCta';
import SiteBrandMark from '@/components/SiteBrandMark';
import CelebrateMood from '@/components/CelebrateMood';
import { usePlatformSite } from '@/context/PlatformSiteContext';

interface AuthFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  step?: number;
}

interface AuthSplitLayoutProps {
  title: string;
  description: string;
  features?: AuthFeature[];
  backHref?: string;
  backLabel?: string;
  maxWidthClassName?: string;
  hideMobileTitle?: boolean;
  children: React.ReactNode;
}

export function AuthSplitLayout({
  title,
  description,
  features = [],
  backHref = '/',
  backLabel = 'Retour au site',
  maxWidthClassName,
  hideMobileTitle = false,
  children,
}: AuthSplitLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { site } = usePlatformSite();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <CelebrateMood />
      {/* Panneau marketing — couleurs via --auth-* / --primary */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-1/2 bg-[#064e3b] text-white p-10 xl:p-14 flex-col justify-between relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[22rem] w-[22rem] rounded-[5rem] border-[3.5rem] border-[#065f46]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-20 -bottom-28 h-72 w-72 rounded-full border-[3rem] border-[#065f46]/70"
        />

        <SiteBrandMark href="/" tone="onDark" className="relative z-10" />

        <div className="space-y-8 my-auto relative z-10 max-w-md">
          <div className="space-y-3">
            <h1 className="text-4xl xl:text-5xl font-display font-bold leading-[1.05]">{title}</h1>
            <p className="text-[#d1fae5] text-base leading-relaxed">{description}</p>
          </div>

          {features.length > 0 && (
            <ol className="space-y-2.5">
              {features.map((feat, index) => {
                const step = feat.step ?? index + 1;
                return (
                  <li
                    key={feat.title}
                    className="flex gap-3.5 items-start bg-white/[0.06] border border-white/10 p-4 rounded-[var(--radius-card)]"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[#10b981] text-[#022c22] text-sm font-bold tabular-nums font-display">
                      {step}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-white">{feat.title}</h3>
                      <p className="text-sm text-[#a7f3d0] leading-relaxed mt-0.5">{feat.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="text-xs text-[#a7f3d0] relative z-10 flex justify-between items-center gap-3">
          <span>© {new Date().getFullYear()} {site.platformName}</span>
          <Link
            href="/contact"
            className="rounded-[var(--radius-button)] px-1.5 py-1 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Support
          </Link>
        </div>
      </div>

      {/* Formulaire */}
      <div className="w-full lg:w-[54%] xl:w-1/2 flex flex-col justify-start sm:justify-center p-5 sm:p-10 lg:p-14 relative bg-background">
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 z-10 flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="inline-flex items-center justify-center gap-2 min-h-11 min-w-11 max-w-[min(100%,16rem)] px-3 rounded-[var(--radius-button)] border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted hover:border-primary/30 transition shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline truncate">{backLabel}</span>
            </Link>
          ) : null}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <PWAInstallCta variant="inline" />
            </div>
            <SiteBrandMark href="/" size="sm" className="lg:hidden" />
            <div className="hidden sm:flex items-center">
              <PublicAccentPicker />
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-2.5 rounded-[var(--radius-button)] border border-border bg-surface text-muted hover:bg-surface-muted hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={theme === 'light' ? 'Passer en thème sombre' : 'Passer en thème clair'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" aria-hidden /> : <Sun className="w-4 h-4" aria-hidden />}
            </button>
          </div>
        </div>

        <main id="main-content" className={cn(maxWidthClassName || 'max-w-md', 'w-full mx-auto space-y-4 pt-16 sm:pt-14 lg:pt-12')}>
          {hideMobileTitle ? null : (
            <h1 className="lg:hidden font-display text-2xl font-bold text-foreground">{title}</h1>
          )}
          {children}
          <p className="text-center text-xs text-muted lg:hidden">© {new Date().getFullYear()} {site.platformName}</p>
        </main>
      </div>
    </div>
  );
}

interface MethodToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon: React.ReactNode }>;
  label?: string;
}

export function MethodToggle<T extends string>({ value, onChange, options, label }: MethodToggleProps<T>) {
  return (
    <fieldset
      role="radiogroup"
      className="space-y-2"
      {...(label ? {} : { 'aria-label': 'Choix de méthode' })}
    >
      {label ? (
        <legend className="text-xs font-semibold text-muted">{label}</legend>
      ) : null}
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-h-11 py-2.5 px-3 rounded-[var(--radius-button)] border text-xs font-semibold transition flex items-center justify-center gap-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              value === opt.value
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-surface border-border text-muted hover:bg-surface-muted hover:text-foreground',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export const AUTH_FEATURES = [
  { icon: PartyPopper, title: "Gestion d'événements et réponses à l’invitation", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
] as const;
