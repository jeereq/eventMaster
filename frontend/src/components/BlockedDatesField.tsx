'use client';

import React, { useState } from 'react';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { Button } from '@/components/ui';
import { eachDateKey, parseBlockedDates } from '@/lib/marketplace';

export default function BlockedDatesField({
  value,
  onChange,
  bookedDates = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  bookedDates?: string[];
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const dates = parseBlockedDates(value);
  const booked = parseBlockedDates(bookedDates);

  const toggle = (key: string) => {
    onChange(dates.includes(key) ? dates.filter((d) => d !== key) : parseBlockedDates([...dates, key]));
  };

  const addRange = () => {
    if (!from) return;
    const keys = eachDateKey(from, to || from).filter((key) => !booked.includes(key));
    onChange(parseBlockedDates([...dates, ...keys]));
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-3">
      <AvailabilityCalendar
        title="Calendrier d’indisponibilité"
        bookedDates={booked}
        blockedDates={dates}
        editable
        onToggleBlocked={toggle}
      />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted">Du</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full min-h-11 px-3.5 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-base sm:text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted">Au</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="w-full min-h-11 px-3.5 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-base sm:text-sm"
          />
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={addRange} disabled={!from}>
          Bloquer la période
        </Button>
      </div>
      <p className="text-xs text-muted leading-relaxed">
        Rouge : réservations EventMaster. Ambre : jours que vous bloquez vous-même. Cliquez un jour libre pour le
        marquer indisponible.
      </p>
    </div>
  );
}
