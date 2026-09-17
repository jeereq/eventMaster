'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, X } from 'lucide-react';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  AI_TOKENS_INSUFFICIENT_EVENT,
  type AiTokensInsufficientDetail,
} from '@/lib/aiTokenEvents';
import { playFamilyNotificationSound } from '@/lib/audioNotifications';

const DEDUPE_MS = 20_000;
const DEFAULT_MESSAGE = 'Plus de jetons IA disponibles. Rechargez pour continuer la génération.';

export default function AiTokenShortageAlert() {
  const { site } = usePlatformSite();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const lastShown = useRef<{ message: string; at: number } | null>(null);

  const show = useCallback((nextMessage?: string) => {
    const text = (nextMessage || '').trim() || DEFAULT_MESSAGE;
    const now = Date.now();
    if (
      lastShown.current
      && lastShown.current.message === text
      && now - lastShown.current.at < DEDUPE_MS
    ) {
      return;
    }
    lastShown.current = { message: text, at: now };
    setMessage(text);
    setOpen(true);
    playFamilyNotificationSound(site.audioNotifications, 'billing');
  }, [site.audioNotifications]);

  useEffect(() => {
    const onShortage = (event: Event) => {
      const detail = (event as CustomEvent<AiTokensInsufficientDetail>).detail;
      show(detail?.message);
    };
    window.addEventListener(AI_TOKENS_INSUFFICIENT_EVENT, onShortage);
    return () => window.removeEventListener(AI_TOKENS_INSUFFICIENT_EVENT, onShortage);
  }, [show]);

  if (!open && !purchaseOpen) return null;

  return (
    <>
      {open ? (
        <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:left-auto z-[85] w-auto sm:w-[min(24rem,calc(100vw-2rem))]">
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-2xl border border-amber-500/35 bg-surface/95 shadow-xl backdrop-blur-sm px-3.5 py-3"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <Coins className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">Jetons IA insuffisants</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">{message}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseOpen(true);
                    setOpen(false);
                  }}
                  className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-primary-solid px-3 text-[11px] font-bold text-primary-foreground"
                >
                  Recharger des jetons
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-muted"
                aria-label="Fermer l’alerte"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <AiTokenPurchaseModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} />
    </>
  );
}
