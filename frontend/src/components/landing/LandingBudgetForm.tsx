'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@/components/icons';
import { LISTING_EVENT_TYPES, type ListingEventTypeId } from '@/lib/listingDetails';
import { cn } from '@/lib/cn';

/** Pré-remplit le simulateur budget avec le type, le nombre d'invités et la date. */
export default function LandingBudgetForm({ className }: { className?: string }) {
  const router = useRouter();
  const [eventType, setEventType] = useState<ListingEventTypeId>('wedding');
  const [guests, setGuests] = useState('150');
  const [date, setDate] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ studio: 'budget', type: eventType });
    const count = Number(guests);
    if (Number.isFinite(count) && count > 0) params.set('guests', String(Math.round(count)));
    if (date) params.set('date', date);
    router.push(`/simulateur?${params.toString()}`);
  };

  const field = 'flex-1 basis-[130px] min-w-0 flex flex-col px-3.5 py-1.5';
  const label = 'text-xs font-semibold text-[#5d5f62]';
  const control =
    'w-full min-w-0 min-h-6 p-0 border-0 bg-transparent text-base font-semibold text-[#1e1f21] focus:outline-none';

  return (
    <form
      onSubmit={submit}
      aria-label="Estimer le budget de mon événement"
      className={cn(
        'em-light-island max-w-[640px] bg-[#ffffff] text-[#1e1f21] rounded-[18px] p-1.5 flex flex-wrap gap-1',
        className,
      )}
    >
      <div className={cn(field, 'sm:border-r sm:border-[#eeeff0]')}>
        <label htmlFor="budget-type" className={label}>Je prépare</label>
        <select id="budget-type" value={eventType} onChange={(e) => setEventType(e.target.value as ListingEventTypeId)} className={control}>
          {LISTING_EVENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className={cn(field, 'basis-[100px] sm:border-r sm:border-[#eeeff0]')}>
        <label htmlFor="budget-guests" className={label}>Invités</label>
        <input
          id="budget-guests"
          type="number"
          inputMode="numeric"
          min={1}
          max={100000}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className={control}
        />
      </div>
      <div className={cn(field, 'basis-[150px]')}>
        <label htmlFor="budget-date" className={label}>Date</label>
        <input id="budget-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={control} />
      </div>
      <button
        type="submit"
        className="flex-1 basis-[200px] whitespace-nowrap min-h-14 px-5 rounded-[13px] bg-primary-solid text-primary-foreground text-base font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary-solid-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31714c] focus-visible:ring-offset-2"
      >
        Estimer mon budget
        <ArrowRight className="w-[18px] h-[18px]" aria-hidden />
      </button>
    </form>
  );
}
