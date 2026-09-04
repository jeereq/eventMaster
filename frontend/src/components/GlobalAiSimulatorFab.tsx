'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Wand2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import EventPrepAiSimulator from '@/components/EventPrepAiSimulator';
import { isAiSimulationThresholdReached } from '@/components/AiSimulationCounter';
import { api } from '@/lib/api';
import {
  AI_ALLOWANCE_CHANGED,
  getAiSimulationAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';

const HIDDEN_PREFIXES = ['/rsvp/', '/invite/', '/print'];
const LISTING_DETAIL = /^\/marketplace\/(salles|prestataires|evenements)\/[^/]+/;

export default function GlobalAiSimulatorFab() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [allowance, setAllowance] = useState<AiAllowance>(getAiSimulationAllowance);

  const hidden =
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    LISTING_DETAIL.test(pathname);

  useEffect(() => {
    const sync = () => setAllowance(getAiSimulationAllowance());
    sync();
    void syncDeviceAiTokensWithBackend(api).then((serverAllowance) => {
      setAllowance(serverAllowance);
    });
    window.addEventListener(AI_ALLOWANCE_CHANGED, sync);
    return () => window.removeEventListener(AI_ALLOWANCE_CHANGED, sync);
  }, [open, pathname]);

  if (hidden) return null;

  const showCounter = isAiSimulationThresholdReached(allowance);
  const onTemplates = pathname.startsWith('/dashboard/templates');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[60] right-[max(1rem,env(safe-area-inset-right))] bottom-[var(--em-site-fab-bottom)] md:bottom-6 md:right-6 inline-flex items-center gap-2.5 min-h-12 pl-3 pr-3.5 sm:pr-4 rounded-2xl bg-primary-solid text-primary-foreground shadow-xl shadow-primary/30 hover:bg-primary-solid-hover transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary-solid text-left"
        aria-label="Jetons IA : modèles d’invitation et simulation budget"
        title="1 jeton = 1 simulation budget · 2 jetons = 1 invitation IA"
      >
        <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <Wand2 className="w-4 h-4" />
        </span>
        <span className="flex flex-col leading-tight min-w-0">
          <span className="text-xs font-bold tracking-tight">Budget IA</span>
          <span className="text-[9px] font-semibold text-primary-foreground/80 truncate max-w-[9.5rem] sm:max-w-none">
            Invitations · Simulation
          </span>
        </span>
        {showCounter ? (
          <span className="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full bg-white/20 shrink-0">
            {allowance.totalRemaining}
          </span>
        ) : null}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title="Crédits & simulation IA"
        description="1 jeton pour une simulation budget, 2 jetons pour une génération d’invitation IA."
      >
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Modèles d’invitation IA</p>
                <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                  Images + brief → nouvelle invitation éditable (2 jetons).
                </p>
              </div>
            </div>
            {!onTemplates ? (
              <Link
                href="/dashboard/templates"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 hover:opacity-95 transition"
              >
                Ouvrir le studio
              </Link>
            ) : (
              <p className="text-[11px] font-semibold text-primary shrink-0">
                Utilisez « Créer avec l’IA » dans le studio.
              </p>
            )}
          </div>

          <EventPrepAiSimulator
            defaultOpen
            onAllowanceChange={(next) => setAllowance(next)}
          />
        </div>
      </Modal>
    </>
  );
}
