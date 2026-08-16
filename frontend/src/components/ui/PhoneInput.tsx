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

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-muted">
          {label}
          {required ? ' *' : ''}
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
              'h-[42px] min-w-[7.5rem] max-w-[9.5rem] appearance-none rounded-[var(--radius-button)]',
              'border border-border bg-surface-muted pl-3 pr-7 text-sm font-medium text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
              'disabled:opacity-60',
            )}
            aria-label="Indicatif pays"
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
            <Phone className="w-4 h-4" />
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
            className={cn(
              'block w-full h-[42px] pl-10 pr-3.5 rounded-[var(--radius-button)]',
              'bg-surface-muted border border-border text-sm text-foreground',
              'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
              'disabled:opacity-60',
            )}
          />
        </div>
      </div>
      {hint && <p className="text-[11px] text-muted leading-relaxed">{hint}</p>}
      {(countryCode || national) && (
        <p className="text-[10px] font-mono text-muted">
          Enregistré : {composeE164(countryCode, national) || '—'}
        </p>
      )}
    </div>
  );
}
