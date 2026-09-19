'use client';

import React from 'react';
import { Mail, MessageSquare, Smartphone } from 'lucide-react';
import Input from './Input';
import PhoneInput from './PhoneInput';
import { composeE164, DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';
import {
  authOtpMethodOptions,
  phoneAuthOtpMethods,
  phoneFieldLabel,
  phoneFieldHint,
  type AuthOtpChannels,
  type PhoneAuthOtpMethod,
} from '@/lib/authOtpChannels';
import { cn } from '@/lib/cn';

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
  label = 'Moyen d’identification',
  authChannels,
  selectedPhoneMethod,
  onPhoneMethodChange,
  showPhoneMethodSelector = false,
  customPhoneLabel,
  customPhoneHint,
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
  authChannels?: AuthOtpChannels;
  selectedPhoneMethod?: PhoneAuthOtpMethod;
  onPhoneMethodChange?: (m: PhoneAuthOtpMethod) => void;
  showPhoneMethodSelector?: boolean;
  customPhoneLabel?: string;
  customPhoneHint?: string;
}) {
  const allowedPhoneMethods = phoneAuthOtpMethods(authChannels);
  const allowsEmail = !authChannels || authOtpMethodOptions(authChannels).includes('EMAIL');
  const allowsPhone = !authChannels || allowedPhoneMethods.length > 0;

  const resolvedPhoneLabel =
    customPhoneLabel ||
    phoneFieldLabel(authChannels, selectedPhoneMethod);

  const resolvedPhoneHint =
    customPhoneHint ||
    phoneFieldHint(authChannels, selectedPhoneMethod);

  return (
    <div className="space-y-3">
      {allowsEmail && allowsPhone && (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">{label}</span>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as IdentifierMode)}
            className="w-full min-h-11 px-3 rounded-[var(--radius-button)] border border-border bg-surface-muted text-base sm:text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary"
          >
            <option value="email">E-mail</option>
            <option value="phone">
              {allowedPhoneMethods.length === 2
                ? 'Téléphone (WhatsApp ou SMS)'
                : allowedPhoneMethods.length === 1 && allowedPhoneMethods[0] === 'SMS'
                  ? 'Téléphone (SMS)'
                  : allowedPhoneMethods.length === 1 && allowedPhoneMethods[0] === 'WHATSAPP'
                    ? 'Téléphone (WhatsApp)'
                    : 'Téléphone'}
            </option>
          </select>
        </label>
      )}

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
        <div className="space-y-3">
          {showPhoneMethodSelector && allowedPhoneMethods.length > 1 && onPhoneMethodChange && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted">
                Canal pour votre téléphone
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onPhoneMethodChange('WHATSAPP')}
                  className={cn(
                    'py-2 px-3 rounded-[var(--radius-button)] border text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                    selectedPhoneMethod === 'WHATSAPP'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                      : 'border-border text-muted hover:text-foreground bg-surface',
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => onPhoneMethodChange('SMS')}
                  className={cn(
                    'py-2 px-3 rounded-[var(--radius-button)] border text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                    selectedPhoneMethod === 'SMS'
                      ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20'
                      : 'border-border text-muted hover:text-foreground bg-surface',
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  SMS
                </button>
              </div>
            </div>
          )}

          <PhoneInput
            id="identifier-phone"
            label={resolvedPhoneLabel}
            countryCode={countryCode || DEFAULT_PHONE_COUNTRY_CODE}
            national={national}
            onCountryCodeChange={onCountryCodeChange}
            onNationalChange={onNationalChange}
            required={required}
            hint={resolvedPhoneHint}
          />
        </div>
      )}
    </div>
  );
}
