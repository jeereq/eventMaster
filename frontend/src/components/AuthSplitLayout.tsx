'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { PartyPopper, Sun, Moon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import PublicAccentPicker from '@/components/PublicAccentPicker';
import PWAInstallCta from '@/components/PWAInstallCta';
import CelebrateMood from '@/components/CelebrateMood';

interface AuthFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  step?: number;
}

interface AuthSplitLayoutProps {
  badge?: string;
  title: string;
  description: string;
  features?: AuthFeature[];
  backHref?: string;
  backLabel?: string;
  maxWidthClassName?: string;
  children: React.ReactNode;
}

export function AuthSplitLayout({
  badge,
  title,
  description,
  features = [],
  backHref = '/',
  backLabel = 'Retour au site',
  maxWidthClassName,
  children,
}: AuthSplitLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <CelebrateMood />
      {/* Panneau marketing — couleurs via --auth-* / --primary */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-1/2 text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden border-r border-white/10"
        style={{
          background: `linear-gradient(145deg, var(--auth-from) 0%, var(--auth-via) 48%, var(--auth-to) 100%)`,
        }}
      >
        <div
          className="absolute top-[-18%] left-[-18%] w-[55%] h-[55%] rounded-full blur-[110px] pointer-events-none opacity-40"
          style={{ background: `rgb(var(--auth-glow))` }}
        />
        <div
          className="absolute bottom-[-22%] right-[-12%] w-[50%] h-[50%] rounded-full blur-[100px] pointer-events-none opacity-25"
          style={{ background: `rgb(var(--celebrate-glow))` }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 0.5px, transparent 0.5px), radial-gradient(circle at 80% 60%, white 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px',
          }}
        />

        <Link href="/" className="flex items-center gap-3 relative z-10 group">
          <div className="bg-primary p-2.5 rounded-[var(--radius-button)] text-white shadow-lg transition group-hover:bg-primary-hover">
            <PartyPopper className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">EventMaster</span>
        </Link>

        <div className="space-y-8 my-auto relative z-10 max-w-md">
          <div className="space-y-3">
            {badge && (
              <span className="inline-flex text-[10px] bg-white/10 border border-white/15 text-white/90 font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
                {badge}
              </span>
            )}
            <h1 className="text-3xl xl:text-4xl font-display font-semibold tracking-tight leading-tight">{title}</h1>
            <p className="text-white/70 text-sm leading-relaxed">{description}</p>
          </div>

          {features.length > 0 && (
            <ol className="space-y-2.5">
              {features.map((feat, index) => {
                const step = feat.step ?? index + 1;
                return (
                  <li
                    key={feat.title}
                    className="flex gap-3.5 items-start bg-white/[0.04] border border-white/[0.08] p-3.5 rounded-[var(--radius-card)]"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] border border-white/20 text-xs font-semibold tabular-nums text-white/90">
                      {step}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-white">{feat.title}</h3>
                      <p className="text-xs text-white/55 leading-relaxed mt-0.5">{feat.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="text-xs text-white/40 relative z-10 flex justify-between items-center">
          <span>© {new Date().getFullYear()} EventMaster</span>
          <Link href="/contact" className="hover:text-white/80 transition">Support</Link>
        </div>
      </div>

      {/* Formulaire */}
      <div className="w-full lg:w-[54%] xl:w-1/2 flex flex-col justify-center p-5 sm:p-10 lg:p-14 relative bg-background">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-2">
          <PWAInstallCta variant="inline" />
          <Link
            href="/"
            className="lg:hidden inline-flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <span className="bg-primary p-1.5 rounded-[var(--radius-button)] text-white">
              <PartyPopper className="w-3.5 h-3.5" />
            </span>
            EventMaster
          </Link>
          <PublicAccentPicker />
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-[var(--radius-button)] border border-border bg-surface text-muted hover:bg-surface-muted hover:text-foreground transition"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        <div className={cn(maxWidthClassName || 'max-w-md', 'w-full mx-auto space-y-4 pt-8 lg:pt-0')}>
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {backLabel}
            </Link>
          )}
          {children}
          <p className="text-center text-xs text-muted lg:hidden">© {new Date().getFullYear()} EventMaster</p>
        </div>
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
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold text-muted">{label}</p>
      )}
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'py-2.5 px-3 rounded-[var(--radius-button)] border text-xs font-semibold transition flex items-center justify-center gap-2',
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
    </div>
  );
}

export const AUTH_FEATURES = [
  { icon: PartyPopper, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
] as const;
