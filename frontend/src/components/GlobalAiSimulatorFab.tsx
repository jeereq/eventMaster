'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Wand2 } from 'lucide-react';
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

export default function GlobalAiSimulatorFab() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [allowance, setAllowance] = useState<AiAllowance>(getAiSimulationAllowance);

  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[60] bottom-24 right-4 sm:bottom-6 inline-flex items-center gap-2 min-h-12 pl-3 pr-4 rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:bg-primary-hover transition cursor-pointer touch-manipulation"
        aria-label="Lancer une simulation IA"
      >
        <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <Wand2 className="w-4 h-4" />
        </span>
        <span className="text-xs font-bold">Simuler</span>
        {showCounter ? (
          <span className="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full bg-white/20">
            {allowance.totalRemaining}
          </span>
        ) : null}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title="Simulation IA"
        description="Générez 3 packs à partir du catalogue. Rouvrir un historique n’utilise pas de jeton."
      >
        <EventPrepAiSimulator
          defaultOpen
          onAllowanceChange={(next) => setAllowance(next)}
        />
      </Modal>
    </>
  );
}
