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
  label = 'Se connecter avec',
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

  const phoneModeLabel =
    allowedPhoneMethods.length === 1 && allowedPhoneMethods[0] === 'SMS'
      ? 'Téléphone (SMS)'
      : allowedPhoneMethods.length === 1 && allowedPhoneMethods[0] === 'WHATSAPP'
        ? 'WhatsApp'
        : 'Téléphone';

  return (
    <div className="space-y-3">
      {allowsEmail && allowsPhone && (
        <div className="space-y-1.5">
          <span id="identifier-mode-label" className="text-xs font-semibold text-muted">{label}</span>
          {/* Deux choix seulement : un sélecteur segmenté, visible d’un coup d’œil, plutôt qu’une liste déroulante. */}
          <div
            role="radiogroup"
            aria-labelledby="identifier-mode-label"
            className="grid grid-cols-2 gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border"
          >
            {([
              { value: 'email' as const, label: 'E-mail', icon: Mail },
              { value: 'phone' as const, label: phoneModeLabel, icon: Smartphone },
            ]).map((option) => {
              const active = mode === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onModeChange(option.value)}
                  className={cn(
                    'min-h-10 px-2 rounded-[calc(var(--radius-button)-2px)] text-sm font-semibold inline-flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    active
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : '')} aria-hidden />
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
