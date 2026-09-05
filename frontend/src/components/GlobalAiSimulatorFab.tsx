'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Building2, Mail, Sparkles, Wand2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import EventPrepAiSimulator from '@/components/EventPrepAiSimulator';
import { isAiSimulationThresholdReached } from '@/components/AiSimulationCounter';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import {
  AI_ALLOWANCE_CHANGED,
  AI_INVITATION_COMPOSE_TOKEN_COST,
  AI_ROOM_PLAN_TOKEN_COST,
  AI_SIMULATION_TOKEN_COST,
  getAiSimulationAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';
import { resolveAiFabPlacement, scrollToPageSection } from '@/lib/aiFabPlacement';

const HIDDEN_PREFIXES = ['/rsvp/', '/invite/', '/print'];
const LISTING_DETAIL = /^\/marketplace\/(salles|prestataires|evenements)\/[^/]+/;

export default function GlobalAiSimulatorFab() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { user, tenant, planFeatures } = useAuth();
  const [open, setOpen] = useState(false);
  const [allowance, setAllowance] = useState<AiAllowance>(getAiSimulationAllowance);

  const hidden =
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    LISTING_DETAIL.test(pathname);

  const canUseRooms = Boolean(
    user &&
    tenant?.accountKind !== 'CLIENT' &&
    planFeatures?.roomEditorLevel &&
    planFeatures.roomEditorLevel !== 'basic',
  );

  const placement = useMemo(
    () => resolveAiFabPlacement({
      pathname,
      search: searchParams?.toString() || '',
      canUseRooms,
      emptyTokens: allowance.totalRemaining <= 0,
    }),
    [pathname, searchParams, canUseRooms, allowance.totalRemaining],
  );

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
  const Icon = placement.highlight === 'invite'
    ? Mail
    : placement.highlight === 'room'
      ? Building2
      : Wand2;

  const handleClick = () => {
    if (placement.click === 'scroll' && placement.scrollId) {
      if (scrollToPageSection(placement.scrollId)) return;
      if (placement.href) {
        window.location.assign(placement.href);
        return;
      }
    }
    if (placement.click === 'href' && placement.href) {
      window.location.assign(placement.href);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'fixed z-[60] right-[max(1rem,env(safe-area-inset-right))] bottom-[var(--em-site-fab-bottom)] md:bottom-6 md:right-6',
          'inline-flex items-center gap-2.5 min-h-12 pl-3 pr-3.5 sm:pr-4 rounded-2xl',
          'transition cursor-pointer touch-manipulation text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          placement.mood === 'celebrate'
            ? 'bg-stage text-stage-foreground shadow-lg hover:bg-stage-elevated focus-visible:ring-festive-on-stage focus-visible:ring-offset-stage'
            : 'bg-primary-solid text-primary-foreground shadow-xl shadow-primary/30 hover:bg-primary-solid-hover focus-visible:ring-primary-foreground focus-visible:ring-offset-primary-solid',
        )}
        aria-label={placement.ariaLabel}
        title={placement.title}
      >
        <span
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            placement.mood === 'celebrate' ? 'bg-festive-on-stage/20 text-festive-on-stage' : 'bg-white/15',
          )}
        >
          <Icon className="w-4 h-4" aria-hidden />
        </span>
        <span className="flex flex-col leading-tight min-w-0">
          <span className="text-xs font-bold tracking-tight">{placement.label}</span>
          <span
            className={cn(
              'text-xs font-semibold truncate max-w-[10rem] sm:max-w-none',
              placement.mood === 'celebrate' ? 'text-stage-foreground/75' : 'text-primary-foreground/80',
            )}
          >
            {placement.subtitle}
          </span>
        </span>
        {showCounter ? (
          <span
            className={cn(
              'text-xs font-black tabular-nums px-1.5 py-0.5 rounded-full shrink-0',
              placement.mood === 'celebrate' ? 'bg-festive-on-stage/20 text-festive-on-stage' : 'bg-white/20',
            )}
          >
            {allowance.totalRemaining}
          </span>
        ) : null}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={placement.modalTitle}
        description={placement.modalDescription}
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <ShortcutCard
              href={placement.catalogueHref}
              icon={Wand2}
              title="Budget"
              detail={`${AI_SIMULATION_TOKEN_COST} jeton · 3 formules`}
              active={placement.highlight === 'budget'}
              onNavigate={() => setOpen(false)}
            />
            <ShortcutCard
              href={placement.inviteHref}
              icon={Mail}
              title="Invitation"
              detail={`${AI_INVITATION_COMPOSE_TOKEN_COST} jetons · carte éditable`}
              active={placement.highlight === 'invite'}
              onNavigate={() => setOpen(false)}
            />
            {canUseRooms ? (
              <ShortcutCard
                href={placement.roomsHref}
                icon={Building2}
                title="Plan de salle"
                detail={`${AI_ROOM_PLAN_TOKEN_COST} jetons · photo`}
                active={placement.highlight === 'room'}
                onNavigate={() => setOpen(false)}
              />
            ) : (
              <ShortcutCard
                href={placement.inviteHref}
                icon={Sparkles}
                title="Même portefeuille"
                detail="Les jetons suivent cet appareil"
                active={placement.highlight === 'tokens'}
                onNavigate={() => setOpen(false)}
              />
            )}
          </div>

          {placement.highlight === 'room' ? (
            <p className="text-sm text-muted leading-relaxed rounded-[var(--radius-card)] border border-border bg-surface-muted/60 px-3.5 py-3">
              À la création d’une salle, choisissez <strong className="text-foreground">Depuis une photo</strong> ou <strong className="text-foreground">À la main</strong>.
              L’IA reprend emplacements, couleurs et matières visibles — sans inventer de décor.
            </p>
          ) : null}

          {placement.highlight === 'invite' && pathname.startsWith('/dashboard/templates') ? (
            <p className="text-sm text-muted leading-relaxed rounded-[var(--radius-card)] border border-border bg-surface-muted/60 px-3.5 py-3">
              Utilisez <strong className="text-foreground">Créer avec l’IA</strong> dans le studio — le bouton ci-dessous sert au budget.
            </p>
          ) : null}

          {placement.embedSimulator ? (
            <EventPrepAiSimulator
              defaultOpen
              onAllowanceChange={(next) => setAllowance(next)}
            />
          ) : (
            <EventPrepAiSimulator
              defaultOpen={false}
              onAllowanceChange={(next) => setAllowance(next)}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  detail,
  active,
  onNavigate,
}: {
  href: string;
  icon: typeof Wand2;
  title: string;
  detail: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'min-h-11 rounded-[var(--radius-card)] border px-3 py-2.5 flex items-start gap-2.5 transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active
          ? 'border-primary bg-primary/8'
          : 'border-border bg-surface hover:bg-surface-muted',
      )}
    >
      <span className="w-8 h-8 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-foreground">{title}</span>
        <span className="block text-xs text-muted leading-snug">{detail}</span>
      </span>
    </Link>
  );
}
