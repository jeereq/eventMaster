'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { PartyPopper, Sun, Moon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

interface AuthFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

interface AuthSplitLayoutProps {
  badge?: string;
  title: string;
  description: string;
  features?: AuthFeature[];
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}

export function AuthSplitLayout({
  badge,
  title,
  description,
  features = [],
  backHref = '/',
  backLabel = 'Retour au site',
  children,
}: AuthSplitLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Panneau marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
            <PartyPopper className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight">EventMaster</span>
        </div>

        <div className="space-y-8 my-auto relative z-10 max-w-lg">
          <div className="space-y-3">
            {badge && (
              <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {badge}
              </span>
            )}
            <h1 className="text-4xl font-bold tracking-tight leading-tight">{title}</h1>
            <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
          </div>

          {features.length > 0 && (
            <div className="space-y-4">
              {features.map((feat) => (
                <div
                  key={feat.title}
                  className="flex gap-4 items-start bg-white/[0.03] border border-white/[0.06] hover:border-white/10 p-4 rounded-xl transition duration-200"
                >
                  <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-xl shrink-0">
                    <feat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white">{feat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 relative z-10 flex justify-between items-center">
          <span>© 2026 EventMaster</span>
          <Link href="/contact" className="hover:text-indigo-400 transition">Support</Link>
        </div>
      </div>

      {/* Formulaire */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-12 lg:p-16 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        <div className="max-w-md w-full mx-auto space-y-6">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {backLabel}
            </Link>
          )}
          {children}
          <p className="text-center text-xs text-slate-400 lg:hidden">© 2026 EventMaster</p>
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
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</p>
      )}
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : `grid-cols-${options.length}`)}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2',
              value === opt.value
                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
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
