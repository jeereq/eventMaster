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
}: {
  bookedDates?: string[];
  blockedDates?: string[];
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
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [hint, setHint] = useState('');
  const booked = useMemo(() => new Set(parseBlockedDates(bookedDates)), [bookedDates]);
  const blocked = useMemo(() => new Set(parseBlockedDates(blockedDates)), [blockedDates]);
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

  const rangeBusy = (from: string, to: string) => {
    return eachDateKey(from, to).some((key) => booked.has(key) || blocked.has(key) || key < floor);
  };

  const clearSelection = () => {
    setHint('');
    if (rangeMode && onSelectRange) onSelectRange('', '');
    else onSelectDate?.('');
  };

  const handleDay = (key: string) => {
    setHint('');
    if (key < floor) return;
    if (booked.has(key) && !allowBookedSelection) {
      setHint('Ce jour est déjà réservé.');
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
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className={cn('font-semibold capitalize', compact ? 'text-xs' : 'text-sm')}>{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="px-2 py-1 rounded-lg border border-border text-[10px] font-semibold text-muted hover:text-foreground"
            onClick={() => {
              const t = todayKey();
              const p = parseKey(t);
              setCursor(p);
            }}
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            className="min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 inline-flex items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
            onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold min-w-[7rem] sm:min-w-[8rem] text-center capitalize">{monthLabel}</span>
          <button
            type="button"
            className="min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 inline-flex items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
            onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {rangeMode ? (
        <p className="text-[11px] text-muted leading-relaxed">
          {selectingSecond
            ? 'Sélectionnez la fin de période (ou recliquez le même jour).'
            : '1er clic = début · 2e clic = fin. Un seul jour suffit aussi.'}
        </p>
      ) : null}

      {selectionLabel && (onSelectDate || onSelectRange) ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
            {selectionLabel}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-[11px] font-semibold text-muted hover:text-foreground underline-offset-2 hover:underline"
          >
            Effacer
          </button>
        </div>
      ) : selectionLabel && !onSelectDate && !onSelectRange ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 w-fit">
          {selectionLabel}
        </span>
      ) : null}

      {hint ? (
        <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 rounded-xl px-2.5 py-1.5">
          {hint}
        </p>
      ) : null}

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((label) => (
          <div key={label} className="text-[10px] font-semibold uppercase tracking-wide text-muted py-1">
            {label}
          </div>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} />;
          const isPast = cell.key < floor;
          const isBooked = booked.has(cell.key);
          const isBlocked = blocked.has(cell.key);
          const isToday = cell.key === today;
          const inRange = Boolean(rangeStart && rangeEnd && cell.key >= rangeStart && cell.key <= rangeEnd);
          const isEdge = cell.key === rangeStart || cell.key === rangeEnd;
          const isSelected = !rangeMode && selectedDate === cell.key;
          const selectable = Boolean(onSelectRange || onSelectDate);
          const clickable = !isPast && (
            editable
              ? !isBooked
              : selectable && (allowBookedSelection || (!isBooked && !isBlocked))
          );
          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable && !isBooked && !isBlocked}
              onClick={() => handleDay(cell.key)}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'aspect-square min-h-9 sm:min-h-0 rounded-lg text-sm sm:text-xs font-medium border relative',
                isBooked && !isEdge && !isSelected && !inRange && 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
                isBooked && (isEdge || isSelected || inRange) && 'bg-primary text-white border-primary shadow-sm',
                !isBooked && isBlocked && !isEdge && !isSelected && 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
                isEdge && !isBooked && !isBlocked && 'bg-primary text-white border-primary shadow-sm',
                inRange && !isEdge && !isBooked && !isBlocked && 'bg-primary/20 text-foreground border-primary/25',
                isSelected && !isBooked && !isBlocked && 'bg-primary text-white border-primary shadow-sm',
                !isBooked && !isBlocked && !inRange && !isSelected && !isPast && 'border-transparent hover:border-border hover:bg-surface-muted',
                isPast && 'text-muted/45 border-transparent',
                isToday && !isEdge && !isSelected && 'ring-1 ring-primary/50',
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-500/40" />
          Réservé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 border border-amber-500/40" />
          Indisponible
        </span>
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
