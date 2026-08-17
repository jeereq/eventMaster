'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { parseBlockedDates } from '@/lib/marketplace';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayKey() {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function AvailabilityCalendar({
  bookedDates = [],
  blockedDates = [],
  selectedDate,
  onSelectDate,
  editable = false,
  onToggleBlocked,
  minDate,
  title = 'Calendrier',
}: {
  bookedDates?: string[];
  blockedDates?: string[];
  selectedDate?: string;
  onSelectDate?: (key: string) => void;
  editable?: boolean;
  onToggleBlocked?: (key: string) => void;
  minDate?: string;
  title?: string;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const booked = useMemo(() => new Set(parseBlockedDates(bookedDates)), [bookedDates]);
  const blocked = useMemo(() => new Set(parseBlockedDates(blockedDates)), [blockedDates]);
  const floor = minDate || todayKey();

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

  const handleDay = (key: string) => {
    if (key < floor) return;
    if (booked.has(key)) return;
    if (editable && onToggleBlocked) {
      onToggleBlocked(key);
      return;
    }
    if (blocked.has(key)) return;
    onSelectDate?.(key);
  };

  return (
    <div className="border border-border rounded-[var(--radius-card)] bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold capitalize">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded-md border border-border text-muted hover:text-foreground"
            onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold min-w-[8.5rem] text-center capitalize">{monthLabel}</span>
          <button
            type="button"
            className="p-1.5 rounded-md border border-border text-muted hover:text-foreground"
            onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

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
          const isSelected = selectedDate === cell.key;
          const clickable = !isPast && (editable ? !isBooked : Boolean(onSelectDate) && !isBooked && !isBlocked);
          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable}
              onClick={() => handleDay(cell.key)}
              className={cn(
                'aspect-square rounded-md text-xs font-medium border',
                isBooked && 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
                !isBooked && isBlocked && 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
                isSelected && !isBooked && !isBlocked && 'bg-primary text-white border-primary',
                !isBooked && !isBlocked && !isSelected && !isPast && 'border-transparent hover:border-border hover:bg-surface-muted',
                isPast && 'text-muted/50 border-transparent',
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-500/40" />
          Réservé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 border border-amber-500/40" />
          Indisponible
        </span>
        {onSelectDate && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
            Date choisie
          </span>
        )}
        {editable && <span>Cliquez un jour libre pour le marquer déjà booké.</span>}
      </div>
    </div>
  );
}
