'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from '@/components/icons';
import { cn } from '@/lib/cn';
import { PHONE_COUNTRY_CODES } from '@/lib/phone';

type Country = (typeof PHONE_COUNTRY_CODES)[number];

/** Nom du pays sans l’indicatif : « RDC (+243) » → « RDC ». */
function countryName(c: Country) {
  return c.label.replace(/\s*\(\+\d+\)\s*$/, '');
}

export function Flag({ iso, className }: { iso: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- petites icônes SVG statiques
    <img
      src={`/flags/${iso.toLowerCase()}.svg`}
      alt=""
      width={24}
      height={16}
      className={cn('h-4 w-6 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10', className)}
    />
  );
}

interface CountryCodePickerProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

/** Choix de l’indicatif avec le drapeau du pays (remplace un <select> natif, qui ne sait pas afficher d’image). */
export default function CountryCodePicker({ id, value, onChange, disabled, invalid, describedBy }: CountryCodePickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = Math.max(0, PHONE_COUNTRY_CODES.findIndex((c) => c.code === value));
  const selected = PHONE_COUNTRY_CODES[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (i: number) => {
    onChange(PHONE_COUNTRY_CODES[i].code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = PHONE_COUNTRY_CODES.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(last, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      setOpen(false);
      if (e.key === 'Escape') buttonRef.current?.focus();
    } else if (/^[a-z]$/i.test(e.key)) {
      const k = e.key.toLowerCase();
      const i = PHONE_COUNTRY_CODES.findIndex((c) => countryName(c).toLowerCase().startsWith(k));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Indicatif pays : ${countryName(selected)} ${selected.code}`}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
          }
        }}
        className={cn(
          'inline-flex min-h-10 h-full items-center gap-2 rounded-[var(--radius-button)] border bg-surface-muted pl-3 pr-2.5',
          'text-sm font-medium text-foreground tabular-nums',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary disabled:opacity-60',
          invalid ? 'border-danger/40' : 'border-border',
        )}
      >
        <Flag iso={selected.iso} />
        {selected.code}
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label="Indicatif pays"
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className="absolute left-0 top-full z-50 mt-1.5 max-h-72 w-64 overflow-auto rounded-2xl border border-border bg-surface p-1.5 shadow-xl focus:outline-none"
        >
          {PHONE_COUNTRY_CODES.map((c, i) => {
            const isSelected = c.code === selected.code;
            return (
              <li
                key={c.code}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm text-foreground',
                  i === active && 'bg-surface-muted',
                )}
              >
                <Flag iso={c.iso} />
                <span className="min-w-0 flex-1 truncate">{countryName(c)}</span>
                <span className="tabular-nums text-muted">{c.code}</span>
                <Check className={cn('w-4 h-4 text-primary', !isSelected && 'invisible')} aria-hidden />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
