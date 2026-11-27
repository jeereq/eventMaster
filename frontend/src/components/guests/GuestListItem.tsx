'use client';

import React from 'react';
import {
  Armchair,
  CheckCircle2,
  Clock,
  DoorOpen,
  Mail,
  Phone,
  Send,
  Users,
  Utensils,
  XCircle,
  AlertTriangle,
} from '@/components/icons';
import { cn } from '@/lib/cn';

export type GuestRsvp = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type GuestRsvpFilter = 'ALL' | GuestRsvp;

/** Teintes d’avatar (initiales) — dérivées de l’id pour rester stables d’un affichage à l’autre. */
const AVATAR_TONES = [
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
] as const;

function toneFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function guestInitials(firstName?: string, lastName?: string): string {
  const a = (firstName || '').trim().charAt(0);
  const b = (lastName || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

const RSVP_META: Record<GuestRsvp, { label: string; className: string; dot: string; Icon: typeof CheckCircle2 }> = {
  ACCEPTED: {
    label: 'Confirmé',
    className: 'bg-primary/10 text-primary',
    dot: 'bg-primary',
    Icon: CheckCircle2,
  },
  PENDING: {
    label: 'En attente',
    className: 'bg-festive-accent-soft text-festive-accent',
    dot: 'bg-festive-accent',
    Icon: Clock,
  },
  DECLINED: {
    label: 'Décliné',
    className: 'bg-danger/10 text-danger',
    dot: 'bg-danger',
    Icon: XCircle,
  },
};

export function GuestRsvpBadge({ rsvp, className }: { rsvp: GuestRsvp; className?: string }) {
  const meta = RSVP_META[rsvp] || RSVP_META.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
        meta.className,
        className,
      )}
    >
      <meta.Icon className="w-3.5 h-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

function MiniTag({
  children,
  tone = 'muted',
  title,
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'primary' | 'danger' | 'accent';
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap',
        tone === 'muted' && 'bg-surface-muted text-muted border border-border',
        tone === 'primary' && 'bg-primary/10 text-primary',
        tone === 'danger' && 'bg-danger/10 text-danger',
        tone === 'accent' && 'bg-festive-accent-soft text-festive-accent',
      )}
    >
      {children}
    </span>
  );
}

const SPECIAL_MEAL_LABELS: Record<string, string> = {
  vegetarian: 'Végétarien',
  vegan: 'Vegan',
  halal: 'Halal',
  kosher: 'Casher',
};

export interface GuestListItemPreferences {
  specialMeal?: string | null;
  allergies?: string | null;
  plusOne?: boolean | null;
  invitationSentAt?: string | null;
  invitationLastStatus?: string | null;
  invitationLastError?: string | null;
}

export interface GuestListItemData {
  id: string;
  firstName: string;
  lastName: string;
  category?: string | null;
  rsvp: GuestRsvp;
  checkedInAt?: string | null;
  preferences?: GuestListItemPreferences | null;
}

export interface GuestListItemProps {
  guest: GuestListItemData;
  layout: 'list' | 'grid';
  /** E-mail affichable (déjà filtré des adresses techniques) */
  email?: string;
  phone?: string | null;
  /** Nom de la table si l’invité est placé */
  tableName?: string | null;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onOpen: () => void;
  actions: React.ReactNode;
  missingContactLabel: string;
}

/** Ligne / carte compacte d’un invité : identité, contact, réponse, envoi, table et jour J d’un coup d’œil. */
export function GuestListItem({
  guest: g,
  layout,
  email,
  phone,
  tableName,
  selected,
  onToggleSelect,
  onOpen,
  actions,
  missingContactLabel,
}: GuestListItemProps) {
  const fullName = `${g.firstName} ${g.lastName}`.trim();
  const prefs: GuestListItemPreferences = g.preferences || {};
  const specialMeal = prefs.specialMeal && prefs.specialMeal !== 'none' ? SPECIAL_MEAL_LABELS[prefs.specialMeal] || prefs.specialMeal : null;
  const inviteFailed = prefs.invitationLastStatus === 'FAILED';
  const inviteSent = !inviteFailed && Boolean(prefs.invitationSentAt);

  const contact = email || phone ? (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
      {email ? (
        <span className="inline-flex min-w-0 items-center gap-1">
          <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="truncate">{email}</span>
        </span>
      ) : null}
      {phone ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {phone}
        </span>
      ) : null}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-festive-accent">
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
      {missingContactLabel}
    </span>
  );

  const tags = (
    <>
      <MiniTag>{g.category || 'Général'}</MiniTag>
      {inviteFailed ? (
        <MiniTag tone="danger" title={prefs.invitationLastError || 'Échec d’envoi'}>
          <AlertTriangle className="w-3 h-3" aria-hidden />
          Envoi échoué
        </MiniTag>
      ) : inviteSent ? (
        <MiniTag tone="primary">
          <Send className="w-3 h-3" aria-hidden />
          Invité
        </MiniTag>
      ) : (
        <MiniTag tone="accent">
          <Send className="w-3 h-3" aria-hidden />
          Pas encore invité
        </MiniTag>
      )}
      {tableName ? (
        <MiniTag>
          <Armchair className="w-3 h-3" aria-hidden />
          {tableName}
        </MiniTag>
      ) : null}
      {g.checkedInAt ? (
        <MiniTag tone="primary">
          <DoorOpen className="w-3 h-3" aria-hidden />
          Entré
        </MiniTag>
      ) : null}
      {prefs.plusOne === true ? (
        <MiniTag title="Vient accompagné(e)">
          <Users className="w-3 h-3" aria-hidden />
          +1
        </MiniTag>
      ) : null}
      {specialMeal || prefs.allergies ? (
        <MiniTag tone="accent" title={[specialMeal, prefs.allergies && `Allergies : ${prefs.allergies}`].filter(Boolean).join(' · ')}>
          <Utensils className="w-3 h-3" aria-hidden />
          {specialMeal || 'Allergies'}
        </MiniTag>
      ) : null}
    </>
  );

  const checkbox = (
    <label
      className="flex shrink-0 items-center justify-center min-h-11 min-w-11 -m-2 cursor-pointer touch-manipulation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggleSelect(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
        aria-label={`Sélectionner ${fullName}`}
      />
    </label>
  );

  const avatar = (
    <span
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        toneFromId(g.id),
      )}
      aria-hidden
    >
      {guestInitials(g.firstName, g.lastName)}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface',
          (RSVP_META[g.rsvp] || RSVP_META.PENDING).dot,
        )}
      />
    </span>
  );

  const openProps = {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    },
    'aria-label': `Voir la fiche de ${fullName}`,
  };

  if (layout === 'list') {
    return (
      <div
        {...openProps}
        className={cn(
          'group flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors',
          'hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:bg-surface-muted/60',
          selected && 'bg-primary/5',
        )}
      >
        {checkbox}
        {avatar}
        <div className="min-w-0 flex-1 grid gap-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] md:items-center md:gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
            {contact}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">{tags}</div>
        </div>
        <GuestRsvpBadge rsvp={g.rsvp} className="hidden sm:inline-flex w-[6.75rem] justify-center" />
        <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div
      {...openProps}
      className={cn(
        'group flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3.5 cursor-pointer',
        'shadow-[var(--shadow-soft)] transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        selected && 'border-primary/50 ring-2 ring-primary/20',
      )}
    >
      <div className="flex items-start gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
          <div className="mt-0.5">{contact}</div>
        </div>
        {checkbox}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{tags}</div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2">
        <GuestRsvpBadge rsvp={g.rsvp} />
        <div className="flex items-center -mr-1.5" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </div>
    </div>
  );
}

export interface GuestRsvpCounts {
  total: number;
  ACCEPTED: number;
  PENDING: number;
  DECLINED: number;
  checkedIn: number;
  invited: number;
}

export function countGuestRsvp(guests: GuestListItemData[]): GuestRsvpCounts {
  const counts: GuestRsvpCounts = { total: guests.length, ACCEPTED: 0, PENDING: 0, DECLINED: 0, checkedIn: 0, invited: 0 };
  for (const g of guests) {
    if (g.rsvp in RSVP_META) counts[g.rsvp] += 1;
    else counts.PENDING += 1;
    if (g.checkedInAt) counts.checkedIn += 1;
    if (g.preferences?.invitationSentAt) counts.invited += 1;
  }
  return counts;
}

/** Synthèse des réponses : barre de répartition + compteurs cliquables qui servent de filtre rapide. */
export function GuestRsvpSummary({
  counts,
  value,
  onChange,
  specialMealCount,
}: {
  counts: GuestRsvpCounts;
  value: GuestRsvpFilter;
  onChange: (next: GuestRsvpFilter) => void;
  specialMealCount: number;
}) {
  const responded = counts.ACCEPTED + counts.DECLINED;
  const pct = (n: number) => (counts.total > 0 ? (n / counts.total) * 100 : 0);
  const items: { key: GuestRsvpFilter; label: string; count: number; dot?: string }[] = [
    { key: 'ALL', label: 'Tous', count: counts.total },
    { key: 'ACCEPTED', label: 'Confirmés', count: counts.ACCEPTED, dot: RSVP_META.ACCEPTED.dot },
    { key: 'PENDING', label: 'En attente', count: counts.PENDING, dot: RSVP_META.PENDING.dot },
    { key: 'DECLINED', label: 'Déclinés', count: counts.DECLINED, dot: RSVP_META.DECLINED.dot },
  ];

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-semibold text-foreground">
          {responded} réponse{responded > 1 ? 's' : ''} sur {counts.total}
          <span className="ml-1.5 font-normal text-muted tabular-nums">({Math.round(pct(responded))} %)</span>
        </p>
        <p className="text-xs text-muted tabular-nums">
          {counts.invited} invité{counts.invited > 1 ? 's' : ''} contacté{counts.invited > 1 ? 's' : ''}
          {counts.checkedIn > 0 ? ` · ${counts.checkedIn} entré${counts.checkedIn > 1 ? 's' : ''} le jour J` : ''}
          {specialMealCount > 0 ? ` · ${specialMealCount} ${specialMealCount > 1 ? 'régimes spéciaux' : 'régime spécial'}` : ''}
        </p>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <span className="h-full bg-primary transition-all" style={{ width: `${pct(counts.ACCEPTED)}%` }} />
        <span className="h-full bg-festive-accent transition-all" style={{ width: `${pct(counts.PENDING)}%` }} />
        <span className="h-full bg-danger transition-all" style={{ width: `${pct(counts.DECLINED)}%` }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Filtrer par réponse">
        {items.map((item) => {
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active && item.key !== 'ALL' ? 'ALL' : item.key)}
              className={cn(
                'flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-button)] border px-3 py-2 text-left transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                active
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border bg-surface-muted/50 text-muted hover:bg-surface-muted hover:text-foreground',
              )}
            >
              <span className="inline-flex items-center gap-2 text-xs font-semibold">
                {item.dot ? <span className={cn('h-2 w-2 rounded-full', item.dot)} aria-hidden /> : null}
                {item.label}
              </span>
              <span className="text-base font-semibold tabular-nums text-foreground">{item.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
