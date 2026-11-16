'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { eachDateKey, parseBlockedDates } from '@/lib/marketplace';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayKey() {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseKey(key: string) {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: (m || 1) - 1 };
}

export default function AvailabilityCalendar({
  bookedDates = [],
  blockedDates = [],
  pendingDates = [],
  selectedDate,
  selectedEndDate,
  onSelectDate,
  onSelectRange,
  editable = false,
  onToggleBlocked,
  minDate,
  title = 'Calendrier',
  compact = false,
  /** Permet de sélectionner aussi les jours réservés (filtre récap). */
  allowBookedSelection = false,
  bookedTone = 'danger',
  bookedLabel = 'Réservé',
  pendingLabel = 'En cours',
  blockedLabel = 'Indisponible',
  className,
}: {
  bookedDates?: string[];
  blockedDates?: string[];
  /** Demandes ou acomptes en cours (pas encore confirmés). */
  pendingDates?: string[];
  selectedDate?: string;
  selectedEndDate?: string;
  onSelectDate?: (key: string) => void;
  onSelectRange?: (from: string, to: string) => void;
  editable?: boolean;
  onToggleBlocked?: (key: string) => void;
  minDate?: string;
  title?: string;
  /** Variante plus dense (colonne contact). */
  compact?: boolean;
  allowBookedSelection?: boolean;
  bookedTone?: 'danger' | 'emerald';
  bookedLabel?: string;
  pendingLabel?: string;
  blockedLabel?: string;
  className?: string;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [hint, setHint] = useState('');
  const booked = useMemo(() => new Set(parseBlockedDates(bookedDates)), [bookedDates]);
  const blocked = useMemo(() => new Set(parseBlockedDates(blockedDates)), [blockedDates]);
  const pending = useMemo(() => new Set(parseBlockedDates(pendingDates)), [pendingDates]);
  const floor = minDate || todayKey();
  const today = todayKey();
  const rangeMode = Boolean(onSelectRange) && !editable;
  const rangeStart = selectedDate || '';
  const rangeEnd = selectedEndDate || selectedDate || '';
  const selectingSecond = Boolean(rangeMode && rangeStart && (!rangeEnd || rangeStart === rangeEnd));

  useEffect(() => {
    const focus = selectedEndDate || selectedDate;
    if (!focus) return;
    const next = parseKey(focus);
    if (!Number.isFinite(next.year)) return;
    setCursor((c) => (c.year === next.year && c.month === next.month ? c : next));
  }, [selectedDate, selectedEndDate]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const pad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const items: Array<{ key: string; day: number; inMonth: boolean } | null> = [];
    for (let i = 0; i < pad; i += 1) items.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ key: toKey(cursor.year, cursor.month, day), day, inMonth: true });
    }
    while (items.length % 7 !== 0) items.push(null);
    return items;
  }, [cursor.year, cursor.month]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const goToday = () => setCursor(parseKey(todayKey()));
  const goPrev = () => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const goNext = () => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));

  const rangeBusy = (from: string, to: string) => {
    return eachDateKey(from, to).some((key) => booked.has(key) || blocked.has(key) || pending.has(key) || key < floor);
  };

  const clearSelection = () => {
    setHint('');
    if (rangeMode && onSelectRange) onSelectRange('', '');
    else onSelectDate?.('');
  };

  const handleDay = (key: string) => {
    setHint('');
    if (key < floor) return;
    if ((booked.has(key) || pending.has(key)) && !allowBookedSelection) {
      setHint(booked.has(key) ? 'Ce jour est déjà réservé.' : 'Ce jour est déjà demandé.');
      return;
    }
    if (editable && onToggleBlocked) {
      onToggleBlocked(key);
      return;
    }
    if (blocked.has(key) && !allowBookedSelection) {
      setHint('Ce jour est indisponible.');
      return;
    }
    if (rangeMode && onSelectRange) {
      if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
        onSelectRange(key, key);
        setHint(allowBookedSelection
          ? 'Choisissez la fin de la période à filtrer.'
          : 'Choisissez le dernier jour de la période, ou validez une seule journée.');
        return;
      }
      if (!allowBookedSelection && rangeBusy(rangeStart, key)) {
        setHint('La période chevauche des jours réservés ou indisponibles.');
        return;
      }
      const from = rangeStart <= key ? rangeStart : key;
      const to = rangeStart <= key ? key : rangeStart;
      onSelectRange(from, to);
      setHint('');
      return;
    }
    onSelectDate?.(key);
  };

  const selectionLabel = (() => {
    if (!rangeStart) return null;
    const start = new Date(`${rangeStart}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
    if (!rangeEnd || rangeEnd === rangeStart) return start;
    const end = new Date(`${rangeEnd}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
    const nights = eachDateKey(rangeStart, rangeEnd).length;
    return `${start} → ${end} · ${nights} j`;
  })();

  return (
    <div
      className={cn(
        'border border-border rounded-2xl bg-surface space-y-3',
        compact ? 'p-3' : 'p-3 sm:p-4',
        className,
      )}
    >
      {compact ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold first-letter:uppercase min-w-0">{title}</h2>
            {!isCurrentMonth ? (
              <button
                type="button"
                className="min-h-9 px-2 -mr-2 rounded-[var(--radius-button)] text-xs font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                onClick={goToday}
              >
                Aujourd’hui
              </button>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-button)] bg-surface-muted/70 p-1">
            <button
              type="button"
              className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-[var(--radius-button)] text-muted hover:text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={goPrev}
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold capitalize tabular-nums" aria-live="polite">{monthLabel}</span>
            <button
              type="button"
              className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-[var(--radius-button)] text-muted hover:text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={goNext}
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold first-letter:uppercase min-w-0 text-sm">{title}</h2>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            className="min-h-11 px-2.5 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-muted hover:text-foreground"
            onClick={goToday}
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            className="min-h-11 min-w-11 p-2 inline-flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground"
            onClick={goPrev}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-center capitalize min-w-[7rem] sm:min-w-[8rem]">{monthLabel}</span>
          <button
            type="button"
            className="min-h-11 min-w-11 p-2 inline-flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground"
            onClick={goNext}
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}

      {rangeMode ? (
        <p className="text-xs text-muted leading-relaxed">
          {selectingSecond
            ? 'Choisissez le dernier jour, ou recliquez le même jour.'
            : compact
              ? 'Un jour, ou deux clics pour une période.'
              : '1er clic = début · 2e clic = fin. Un seul jour suffit aussi.'}
        </p>
      ) : null}

      {selectionLabel && (onSelectDate || onSelectRange) ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
            {selectionLabel}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs font-semibold text-muted hover:text-foreground underline-offset-2 hover:underline min-h-11 px-1"
          >
            Effacer
          </button>
        </div>
      ) : selectionLabel && !onSelectDate && !onSelectRange ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 w-fit">
          {selectionLabel}
        </span>
      ) : null}

      {hint ? (
        <p className="text-xs text-festive-accent bg-festive-accent/10 border border-festive-accent/20 rounded-[var(--radius-button)] px-2.5 py-1.5">
          {hint}
        </p>
      ) : null}

      <div className={cn('grid grid-cols-7 text-center', compact ? 'gap-x-1 gap-y-0.5' : 'gap-1')}>
        {WEEKDAYS.map((label) => (
          <div key={label} className={cn('text-xs font-semibold text-muted', compact ? 'pb-1.5' : 'py-1')}>
            {label}
          </div>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} />;
          const isPast = cell.key < floor;
          const isBooked = booked.has(cell.key);
          const isBlocked = blocked.has(cell.key);
          const isPending = pending.has(cell.key) && !isBooked;
          const isToday = cell.key === today;
          const inRange = Boolean(rangeStart && rangeEnd && cell.key >= rangeStart && cell.key <= rangeEnd);
          const isEdge = cell.key === rangeStart || cell.key === rangeEnd;
          const isSelected = !rangeMode && selectedDate === cell.key;
          const selectable = Boolean(onSelectRange || onSelectDate);
          const occupied = isBooked || isBlocked || isPending;
          const clickable = !isPast && (
            editable
              ? !isBooked && !isPending
              : selectable && (allowBookedSelection || !occupied)
          );
          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable && !occupied}
              onClick={() => handleDay(cell.key)}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'rounded-lg font-medium border relative tabular-nums',
                compact ? 'h-10 sm:h-9 text-sm' : 'aspect-square min-h-9 sm:min-h-0 text-sm sm:text-xs',
                isBooked && !isEdge && !isSelected && !inRange && (
                  bookedTone === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/35'
                    : 'bg-danger/10 text-danger border-danger/30'
                ),
                isBooked && (isEdge || isSelected || inRange) && 'bg-primary-solid text-primary-foreground border-primary-solid shadow-[var(--shadow-soft)]',
                !isBooked && isPending && !isEdge && !isSelected && !inRange && 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35',
                !isBooked && isPending && (isEdge || isSelected || inRange) && 'bg-primary-solid text-primary-foreground border-primary-solid shadow-[var(--shadow-soft)]',
                !isBooked && !isPending && isBlocked && !isEdge && !isSelected && 'bg-festive-accent/10 text-festive-accent border-festive-accent/30',
                isEdge && !occupied && 'bg-primary-solid text-primary-foreground border-primary-solid shadow-[var(--shadow-soft)]',
                inRange && !isEdge && !occupied && 'bg-primary/15 text-foreground border-primary/25',
                isSelected && !occupied && 'bg-primary-solid text-primary-foreground border-primary-solid shadow-[var(--shadow-soft)]',
                !occupied && !inRange && !isSelected && !isPast && 'border-transparent hover:border-border hover:bg-surface-muted',
                isPast && (compact ? 'text-muted/35 border-transparent font-normal' : 'text-muted/45 border-transparent'),
                isToday && !isEdge && !isSelected && (compact ? 'ring-1 ring-primary/60 text-primary font-semibold' : 'ring-1 ring-primary/50'),
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className={cn('flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted', compact && 'pt-2.5 border-t border-border/70')}>
        {!compact || booked.size > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn(
            'w-2.5 h-2.5 rounded-sm border',
            bookedTone === 'emerald' ? 'bg-emerald-500/40 border-emerald-500/40' : 'bg-danger/40 border-danger/40',
          )} />
          {bookedLabel}
        </span>
        ) : null}
        {pending.size > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 border border-amber-500/40" />
            {pendingLabel}
          </span>
        ) : null}
        {!compact || editable || blocked.size > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-festive-accent/40 border border-festive-accent/40" />
            {blockedLabel}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm ring-1 ring-primary/50 bg-surface" />
          Aujourd’hui
        </span>
        {(onSelectDate || onSelectRange) && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
            {rangeMode ? 'Période' : 'Choix'}
          </span>
        )}
        {editable && <span>Cliquez un jour libre pour le bloquer.</span>}
      </div>
    </div>
  );
}
