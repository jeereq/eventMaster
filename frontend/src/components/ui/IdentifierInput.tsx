'use client';

import React from 'react';
import { Mail } from 'lucide-react';
import Input from './Input';
import PhoneInput from './PhoneInput';
import { composeE164, DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';

export type IdentifierMode = 'email' | 'phone';

export function identifierValue(
  mode: IdentifierMode,
  email: string,
  countryCode: string,
  national: string,
): string {
  if (mode === 'email') return email.trim();
  return composeE164(countryCode, national) || '';
}

export default function IdentifierInput({
  mode,
  onModeChange,
  email,
  onEmailChange,
  countryCode,
  national,
  onCountryCodeChange,
  onNationalChange,
  required = true,
  label = 'Identifiant',
}: {
  mode: IdentifierMode;
  onModeChange: (mode: IdentifierMode) => void;
  email: string;
  onEmailChange: (value: string) => void;
  countryCode: string;
  national: string;
  onCountryCodeChange: (code: string) => void;
  onNationalChange: (national: string) => void;
  required?: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as IdentifierMode)}
          className="w-full h-[42px] px-3 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm font-medium text-foreground"
        >
          <option value="email">E-mail</option>
          <option value="phone">Téléphone</option>
        </select>
      </label>
      {mode === 'email' ? (
        <Input
          label="Adresse e-mail"
          id="identifier-email"
          type="email"
          autoComplete="email"
          required={required}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="nom@exemple.com"
          leftIcon={<Mail className="w-4 h-4" />}
        />
      ) : (
        <PhoneInput
          id="identifier-phone"
          label="Numéro WhatsApp"
          countryCode={countryCode || DEFAULT_PHONE_COUNTRY_CODE}
          national={national}
          onCountryCodeChange={onCountryCodeChange}
          onNationalChange={onNationalChange}
          required={required}
          hint="Indicatif pays + numéro national (sans le 0)."
        />
      )}
    </div>
  );
}
