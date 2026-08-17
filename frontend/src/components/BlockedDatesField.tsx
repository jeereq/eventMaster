'use client';

import React, { useState } from 'react';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
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
        title="Dates déjà bookées"
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
            className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted">Au</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          />
        </label>
        <button
          type="button"
          onClick={addRange}
          disabled={!from}
          className="px-3 py-2 text-xs font-semibold rounded-[var(--radius-button)] border border-border text-foreground disabled:opacity-40"
        >
          Bloquer la période
        </button>
      </div>
      <p className="text-[11px] text-muted leading-relaxed">
        Les jours en rouge viennent des réservations EventMaster. Les jours ambre sont ceux que vous marquez déjà pris
        (hors plateforme). Vous pouvez en sélectionner un ou plusieurs.
      </p>
    </div>
  );
}
