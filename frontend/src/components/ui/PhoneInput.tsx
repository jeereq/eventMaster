'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  PHONE_COUNTRY_CODES,
  composeE164,
  normalizeCountryCode,
  normalizeNationalNumber,
  splitPhone,
} from '@/lib/phone';

export interface PhoneInputValue {
  countryCode: string;
  national: string;
  /** Numéro E.164 complet, ou chaîne vide */
  e164: string;
}

interface PhoneInputProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  countryCode: string;
  national: string;
  onCountryCodeChange: (code: string) => void;
  onNationalChange: (national: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function phonePartsToValue(countryCode: string, national: string): PhoneInputValue {
  const cc = normalizeCountryCode(countryCode);
  const nat = normalizeNationalNumber(national);
  return {
    countryCode: cc,
    national: nat,
    e164: composeE164(cc, nat) || '',
  };
}

export function parseStoredPhone(
  phone?: string | null,
  phoneCountryCode?: string | null,
): { countryCode: string; national: string } {
  if (phoneCountryCode && phone) {
    // phone peut déjà être E.164 ou national
    if (phone.trim().startsWith('+')) {
      return splitPhone(phone, phoneCountryCode);
    }
    return {
      countryCode: normalizeCountryCode(phoneCountryCode),
      national: normalizeNationalNumber(phone),
    };
  }
  return splitPhone(phone, phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE);
}

export default function PhoneInput({
  id,
  label = 'Téléphone',
  hint,
  error,
  countryCode,
  national,
  onCountryCodeChange,
  onNationalChange,
  required,
  disabled,
  className,
  placeholder = '812345678',
}: PhoneInputProps) {
  const selectId = id ? `${id}-cc` : undefined;
  const inputId = id || undefined;
  const errorId = id ? `${id}-error` : undefined;
  const hintId = id ? `${id}-hint` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-muted">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <label htmlFor={selectId} className="sr-only">
            Indicatif pays
          </label>
          <select
            id={selectId}
            value={normalizeCountryCode(countryCode)}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'min-h-11 min-w-[7.5rem] max-w-[9.5rem] appearance-none rounded-[var(--radius-button)]',
              'border bg-surface-muted pl-3 pr-7 text-sm font-medium text-foreground',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary',
              'disabled:opacity-60',
              error ? 'border-danger/40' : 'border-border',
            )}
            aria-label="Indicatif pays"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
          >
            {PHONE_COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.iso}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            <Phone className="w-4 h-4" aria-hidden />
          </div>
          <input
            id={inputId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={national}
            onChange={(e) => onNationalChange(e.target.value.replace(/[^\d\s]/g, ''))}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              'block w-full min-h-11 pl-10 pr-3.5 rounded-[var(--radius-button)]',
              'bg-surface-muted border text-sm text-foreground',
              'placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary',
              'disabled:opacity-60',
              error ? 'border-danger/40' : 'border-border',
            )}
          />
        </div>
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted leading-relaxed">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger font-medium" role="alert">{error}</p>
      )}
      {(countryCode || national) && (
        <p className="text-xs font-mono text-muted">
          Enregistré : {composeE164(countryCode, national) || '—'}
        </p>
      )}
    </div>
  );
}
