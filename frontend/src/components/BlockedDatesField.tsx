'use client';

import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { parseBlockedDates } from '@/lib/marketplace';

export default function BlockedDatesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const dates = parseBlockedDates(value);

  const add = () => {
    const key = draft.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!key) return;
    onChange(parseBlockedDates([...dates, key]));
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-muted">Dates indisponibles</span>
      <p className="text-[11px] text-muted leading-relaxed">
        Bloquez manuellement les jours déjà pris (hors réservations EventMaster, qui se bloquent à la confirmation).
      </p>
      <div className="flex gap-2">
        <label className="flex-1 relative">
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          />
        </label>
        <button
          type="button"
          onClick={add}
          disabled={!draft}
          className="px-3 py-2 text-xs font-semibold rounded-[var(--radius-button)] border border-border text-foreground disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>
      {dates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dates.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-muted border border-border text-[11px]"
            >
              {new Date(`${key}T12:00:00`).toLocaleDateString('fr-FR')}
              <button type="button" onClick={() => onChange(dates.filter((d) => d !== key))} aria-label="Retirer">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
