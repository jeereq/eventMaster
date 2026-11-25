'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@/components/icons';
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

  const navButton = 'h-9 w-9 inline-flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const bookedDot = bookedTone === 'emerald' ? 'bg-emerald-500' : 'bg-danger';
  const legend = [
    booked.size > 0 ? { dot: bookedDot, label: bookedLabel } : null,
    pending.size > 0 ? { dot: 'bg-amber-500', label: pendingLabel } : null,
    editable || blocked.size > 0 ? { dot: 'bg-festive-accent', label: blockedLabel } : null,
  ].filter(Boolean) as Array<{ dot: string; label: string }>;

  return (
    <div
      className={cn(
        'border border-border rounded-[var(--radius-card)] bg-surface space-y-3',
        compact ? 'p-3' : 'p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {title ? <h2 className="text-base font-semibold text-foreground first-letter:uppercase">{title}</h2> : null}
          <p className="text-sm text-muted capitalize tabular-nums" aria-live="polite">{monthLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isCurrentMonth ? (
            <button
              type="button"
              className="h-9 px-3 rounded-full text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={goToday}
            >
              Aujourd’hui
            </button>
          ) : null}
          <button type="button" className={navButton} onClick={goPrev} aria-label="Mois précédent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" className={navButton} onClick={goNext} aria-label="Mois suivant">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((label) => (
          <div key={label} className="pb-0.5 text-[11px] font-medium text-muted">
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
          const picked = isSelected || (rangeMode && isEdge);
          const selectable = Boolean(onSelectRange || onSelectDate);
          const occupied = isBooked || isBlocked || isPending;
          const clickable = !isPast && (
            editable
              ? !isBooked && !isPending
              : selectable && (allowBookedSelection || !occupied)
          );
          const dot = isBooked ? bookedDot : isPending ? 'bg-amber-500' : isBlocked ? 'bg-festive-accent' : null;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable && !occupied}
              onClick={() => handleDay(cell.key)}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={selectable ? picked || (rangeMode && inRange) : undefined}
              className={cn(
                'relative h-11 w-full rounded-xl text-sm tabular-nums transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                picked
                  ? 'bg-primary-solid text-primary-foreground font-semibold shadow-[var(--shadow-soft)]'
                  : isPast
                    ? 'text-muted/35 cursor-default'
                    : rangeMode && inRange
                      ? 'bg-primary/25 text-foreground font-semibold'
                      : occupied
                        ? 'bg-surface-muted/40 text-muted line-through decoration-muted/50'
                        : 'bg-primary/15 text-primary font-semibold ring-1 ring-inset ring-primary/35',
                !picked && !isPast && isToday && 'ring-2 ring-inset ring-primary text-primary font-bold',
                !picked && clickable && !inRange && 'hover:bg-primary/25',
                !picked && !clickable && !occupied && !isPast && 'cursor-default',
              )}
            >
              {cell.day}
              {dot && !picked && !isPast ? (
                <span aria-hidden className={cn('absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full', dot)} />
              ) : null}
            </button>
          );
        })}
      </div>

      {selectionLabel || hint ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/70 pt-3 min-h-11">
          {hint ? (
            <p className="text-xs text-muted" role="status">{hint}</p>
          ) : (
            <p className="text-sm font-semibold text-foreground tabular-nums">{selectionLabel}</p>
          )}
          {selectionLabel && (onSelectDate || onSelectRange) ? (
            <button
              type="button"
              onClick={clearSelection}
              className="min-h-9 px-2 -mr-2 rounded-full text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Effacer
            </button>
          ) : null}
        </div>
      ) : null}

      {legend.length || editable ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', item.dot)} />
              {item.label}
            </span>
          ))}
          {editable ? <span>Cliquez un jour libre pour le bloquer.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
