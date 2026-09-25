'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import GuestPortalShell, { GuestEventHero } from '@/components/GuestPortalShell';
import GuestGuidelinesView from '@/components/GuestGuidelinesView';
import GuestDonationForm from '@/components/rsvp/GuestDonationForm';
import {
  MapPin, Loader2, Clock, Heart, PartyPopper, HeartHandshake, Navigation, ArrowDown,
} from 'lucide-react';
import {
  type RsvpField,
  ensureMandatoryRsvpFields,
  ensureMandatoryRsvpFieldsOnElements,
  parseEventRsvpForm,
  getCanvasStyle,
  parseFieldOptions,
} from '@/lib/rsvpFormFields';
import ShareButton from '@/components/ShareButton';
import { guestRsvpUrl } from '@/lib/share';
import { applyOrgInvitationThemeIfNeeded } from '@/lib/templateColorThemes';
import { DEFAULT_BRAND_PALETTE } from '@/lib/brandTheme';
import type { GuestRsvpData } from './guestRsvpTypes';
import { templateImageStyleClass, templateImageStyleExtra } from '@/lib/templateImageStyle';

const darkenColor = (hex: string, percent = 30) => {
  if (!hex || !hex.startsWith('#')) return hex || '#000000';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const lightenColor = (hex: string, percent = 30) => {
  if (!hex || !hex.startsWith('#')) return hex || '#ffffff';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const fieldLabelClass = 'block text-sm font-semibold text-foreground mb-1.5';
const fieldInputClass =
  'w-full min-h-12 px-3.5 py-2.5 border border-transparent rounded-xl text-base sm:text-sm text-foreground bg-surface-muted focus:outline-none focus:border-primary focus:bg-surface transition placeholder:text-muted disabled:opacity-60';

/** Deux grandes tuiles « Je viens » / « Je ne peux pas » : le cœur de la réponse. */
function RsvpChoice({
  value,
  onChange,
  disabled,
}: {
  value: 'ACCEPTED' | 'DECLINED';
  onChange: (status: 'ACCEPTED' | 'DECLINED') => void;
  disabled: boolean;
}) {
  const options = [
    { id: 'ACCEPTED' as const, label: 'Je viens', icon: PartyPopper },
    { id: 'DECLINED' as const, label: 'Je ne peux pas', icon: HeartHandshake },
  ];
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Serez-vous parmi nous ?">
      {options.map((option) => {
        const selected = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => !disabled && onChange(option.id)}
            className={cn(
              'relative min-h-[5.5rem] px-3 py-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-sm font-semibold transition touch-manipulation active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:active:scale-100',
              selected
                ? option.id === 'ACCEPTED'
                  ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                  : 'border-foreground/70 bg-surface-muted text-foreground'
                : 'border-border bg-surface text-foreground hover:border-primary/40',
            )}
          >
            <Icon className={cn('w-7 h-7', !selected && 'text-primary')} aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function GuestPendingInvitationView({
  guest,
  guestId,
  rsvpStatus,
  setRsvpStatus,
  rsvpLocked,
  submitting,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phone,
  setPhone,
  additionalNotes,
  setAdditionalNotes,
  customFieldValues,
  setCustomFieldValues,
  onSubmit,
  submitError,
}: {
  guest: GuestRsvpData;
  guestId: string;
  rsvpStatus: 'ACCEPTED' | 'DECLINED';
  setRsvpStatus: (status: 'ACCEPTED' | 'DECLINED') => void;
  rsvpLocked: boolean;
  submitting: boolean;
  firstName?: string;
  setFirstName?: (val: string) => void;
  lastName?: string;
  setLastName?: (val: string) => void;
  phone?: string;
  setPhone?: (val: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (value: string) => void;
  customFieldValues: Record<string, any>;
  setCustomFieldValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onSubmit: (e: React.FormEvent) => void;
  submitError?: string;
}) {
  const { site } = usePlatformSite();
  const [showAnswerShortcut, setShowAnswerShortcut] = useState(false);

  // Invitation longue : un bouton flottant mène au formulaire tant qu'il est plus bas dans la page.
  useEffect(() => {
    if (rsvpLocked || typeof IntersectionObserver === 'undefined') return;
    const target = document.getElementById('rsvp-section');
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowAnswerShortcut(!entry.isIntersecting && entry.boundingClientRect.top > 0);
      },
      { threshold: 0.05 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [rsvpLocked]);

  const scrollToAnswer = () => {
    const target = document.getElementById('rsvp-section');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getBackgroundStyle = (type: string, color: string, url: string, pattern: string) => {
    if (type === 'color') return { backgroundColor: color };
    if (type === 'image' && url) return { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (type === 'pattern') {
      if (pattern === 'paper') {
        return {
          backgroundColor: color || '#faf8f5',
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.02) 1px, transparent 0)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 4px 4px',
        };
      }
      if (pattern === 'watercolor') {
        return {
          background: `radial-gradient(circle at 10% 10%, rgba(243, 224, 217, 0.6) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(225, 212, 198, 0.6) 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${color || '#fdfbf7'} 0%, 100%)`,
        };
      }
      if (pattern === 'boho') {
        return { backgroundColor: color || '#faf6f0' };
      }
      if (pattern === 'linen') {
        return {
          backgroundColor: color || '#f4f1ea',
          backgroundImage: `
            linear-gradient(90deg, rgba(180,170,150,0.08) 1px, transparent 1px),
            linear-gradient(rgba(180,170,150,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '4px 4px',
        };
      }
      if (pattern === 'marble') {
        return {
          backgroundColor: color || '#f5f5f5',
          backgroundImage: `
            radial-gradient(circle at 30% 20%, rgba(197,160,89,0.04) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(197,160,89,0.04) 0%, transparent 40%),
            linear-gradient(135deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.01) 10%, transparent 10%, transparent 50%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.01) 60%, transparent 60%, transparent 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 40px 40px',
        };
      }
      if (pattern === 'gold-dust') {
        return {
          backgroundColor: color || '#1e1b18',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(197,160,89,0.2) 1px, transparent 1px),
            radial-gradient(circle at 75% 40%, rgba(197,160,89,0.2) 2px, transparent 2px),
            radial-gradient(circle at 50% 80%, rgba(197,160,89,0.15) 1.5px, transparent 1.5px),
            radial-gradient(circle at 10% 75%, rgba(197,160,89,0.12) 2.5px, transparent 2.5px),
            radial-gradient(circle at 90% 15%, rgba(197,160,89,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 150px 150px, 100px 100px, 180px 180px, 140px 140px',
        };
      }
      if (pattern === 'parchment') {
        return {
          background: `radial-gradient(circle, ${color || '#f1e6d2'} 0%, #e4d3b2 100%)`,
          boxShadow: 'inset 0 0 40px rgba(139,90,43,0.15)',
        };
      }
      if (pattern === 'velvet') {
        return {
          background: `radial-gradient(circle at 50% 30%, ${color || '#4a0e17'} 0%, #1a0307 100%)`,
        };
      }
    }
    return { backgroundColor: '#ffffff' };
  };

  const formatText = (text: string) => {
    if (!text) return '';
    let formatted = text
      .replace(/\{\{firstName\}\}/g, guest.firstName)
      .replace(/\{\{lastName\}\}/g, guest.lastName);
    
    if (guest.event) {
      formatted = formatted
        .replace(/\{\{title\}\}/g, guest.event.title)
        .replace(/\{\{description\}\}/g, guest.event.description || '')
        .replace(/\{\{location\}\}/g, guest.event.location)
        .replace(/\{\{date\}\}/g, new Date(guest.event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }
    return formatted;
  };

  const template = guest.event.invitations?.[0]?.template;
  const global = template?.content?.global || {};
  const themedInvitation = applyOrgInvitationThemeIfNeeded(
    global,
    (template?.content?.elements || []) as Array<{ id: string; type: string; rsvpPlacement?: string; color?: string; fontSize?: string; text?: string; [key: string]: unknown }>,
    guest.branding,
  );
  const bgType = global.bgType || 'color';
  const bgColor = themedInvitation.background || global.bgColor || '#ffffff';
  const bgImageUrl = global.bgImageUrl || '';
  const bgPattern = global.bgPattern || 'none';
  const frameType = global.frameType || 'none';
  const floralColor = global.floralColor || guest.branding?.accent || '#b91c1c';
  const floralType = global.floralType || 'roses';
  const floralDensity = global.floralDensity !== undefined ? global.floralDensity : 40;
  const canvasStyle = getCanvasStyle(global);
  const templateElements = ensureMandatoryRsvpFieldsOnElements(themedInvitation.elements);
  const inlineTemplateElements = templateElements.filter(
    (el) => el.type !== 'rsvp-block' || el.rsvpPlacement !== 'outside',
  );
  const outsideRsvpElements = templateElements.filter(
    (el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside',
  );

  const updateCustomField = (fieldId: string, value: string | number | boolean) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderRsvpFieldInput = (field: RsvpField) => {
    const options = parseFieldOptions(field.options);
    const inputClass = fieldInputClass;
    const value = customFieldValues[field.id];
    const inputId = `rsvp-field-${field.id}`;

    if (field.type === 'textarea') {
      return (
        <textarea
          id={inputId}
          value={value || ''}
          onChange={(e) => updateCustomField(field.id, e.target.value)}
          required={field.required}
          rows={3}
          placeholder={field.placeholder || 'Votre réponse...'}
          className={`${inputClass} resize-none`}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <select
          id={inputId}
          value={value || ''}
          onChange={(e) => updateCustomField(field.id, e.target.value)}
          required={field.required}
          className={inputClass}
        >
          <option value="">Sélectionnez une option...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'radio') {
      return (
        <fieldset className="space-y-2 m-0 p-0 border-0">
          <legend className="sr-only">{field.label}</legend>
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer select-none min-h-11">
              <input
                type="radio"
                name={inputId}
                checked={value === opt}
                onChange={() => updateCustomField(field.id, opt)}
                required={field.required}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">{opt}</span>
            </label>
          ))}
        </fieldset>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateCustomField(field.id, e.target.checked)}
            required={field.required}
            className="rounded text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">{field.label}</span>
        </label>
      );
    }

    if (field.type === 'yes_no') {
      return (
        <fieldset className="grid grid-cols-2 gap-2 m-0 p-0 border-0">
          <legend className="sr-only">{field.label}</legend>
          {[
            { label: 'Oui', val: true },
            { label: 'Non', val: false },
          ].map(({ label, val }) => (
            <button
              key={label}
              type="button"
              aria-pressed={value === val}
              onClick={() => updateCustomField(field.id, val)}
              className={`min-h-11 py-2 px-3 rounded-xl text-xs font-bold border transition ${
 value === val
 ? 'border-primary bg-primary/10 text-primary'
 : 'border-border text-muted hover:bg-surface-muted'
 }`}
            >
              {label}
            </button>
          ))}
        </fieldset>
      );
    }

    if (field.type === 'rating') {
      return (
        <fieldset className="flex gap-1 m-0 p-0 border-0">
          <legend className="sr-only">{field.label}</legend>
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              aria-pressed={Number(value) === rating}
              aria-label={`${rating} sur 5`}
              onClick={() => updateCustomField(field.id, rating)}
              className={`min-h-11 min-w-11 rounded-lg text-sm font-bold border transition ${
 Number(value) === rating
 ? 'border-festive-accent bg-festive-accent-soft text-festive-accent'
 : 'border-border text-muted hover:bg-surface-muted'
 }`}
            >
              {rating}
            </button>
          ))}
        </fieldset>
      );
    }

    const inputType =
      field.type === 'number' ? 'number'
      : field.type === 'email' ? 'email'
      : field.type === 'phone' ? 'tel'
      : field.type === 'date' ? 'date'
      : 'text';

    return (
      <input
        id={inputId}
        type={inputType}
        value={value ?? ''}
        onChange={(e) => updateCustomField(
          field.id,
          field.type === 'number' ? Number(e.target.value) : e.target.value
        )}
        required={field.required}
        placeholder={field.placeholder || 'Votre réponse...'}
        className={inputClass}
        min={field.type === 'number' ? 0 : undefined}
      />
    );
  };

  const renderRsvpLockedBanner = () =>
    rsvpLocked ? (
      <div className="bg-surface-muted rounded-2xl p-3.5 flex items-center gap-3 text-left">
        <Clock className="w-5 h-5 flex-shrink-0 text-muted" aria-hidden />
        <p className="text-sm text-foreground">L&apos;événement est passé : les réponses sont fermées.</p>
      </div>
    ) : null;

  const renderIdentityFields = (idPrefix: string) => (
    <div className="space-y-3">
      <p className="font-display text-base font-semibold text-foreground">Votre nom sur le pass</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-first-name`} className={fieldLabelClass}>
            Prénom <span className="text-danger" aria-hidden>*</span>
          </label>
          <input
            id={`${idPrefix}-first-name`}
            type="text"
            value={firstName ?? guest.firstName}
            onChange={(e) => setFirstName?.(e.target.value)}
            disabled={rsvpLocked}
            className={fieldInputClass}
            placeholder="Votre prénom"
            autoComplete="given-name"
            required
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-last-name`} className={fieldLabelClass}>
            Nom
          </label>
          <input
            id={`${idPrefix}-last-name`}
            type="text"
            value={lastName ?? guest.lastName}
            onChange={(e) => setLastName?.(e.target.value)}
            disabled={rsvpLocked}
            className={fieldInputClass}
            placeholder="Votre nom"
            autoComplete="family-name"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className={fieldLabelClass}>
          WhatsApp
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          value={phone ?? guest.phone ?? ''}
          onChange={(e) => setPhone?.(e.target.value)}
          disabled={rsvpLocked}
          className={fieldInputClass}
          placeholder="+243 812 345 678"
          autoComplete="tel"
        />
      </div>
    </div>
  );

  const renderFieldList = (fields: RsvpField[]) =>
    fields.map((field: RsvpField) => (
      <div key={field.id} className="space-y-1">
        {field.type !== 'checkbox' && (
          <label htmlFor={`rsvp-field-${field.id}`} className={fieldLabelClass}>
            {field.label} {field.required && <span className="text-danger" aria-hidden>*</span>}
          </label>
        )}
        {field.helpText && <p className="text-xs text-muted">{field.helpText}</p>}
        {renderRsvpFieldInput(field)}
      </div>
    ));

  const renderNotesField = (idPrefix: string) => (
    <div>
      <label htmlFor={`${idPrefix}-notes`} className={fieldLabelClass}>
        Un mot pour l&apos;organisateur <span className="font-normal text-muted">(facultatif)</span>
      </label>
      <textarea
        id={`${idPrefix}-notes`}
        value={additionalNotes}
        onChange={(e) => setAdditionalNotes(e.target.value)}
        disabled={rsvpLocked}
        className={cn(fieldInputClass, 'resize-none')}
        placeholder="Ex. : je viendrai avec…"
        rows={2}
      />
    </div>
  );

  const renderSubmitButton = (label: string) => (
    <button
      type="submit"
      disabled={submitting || rsvpLocked}
      className="w-full min-h-[3.25rem] py-3 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-semibold rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation text-base active:scale-[0.99]"
    >
      {submitting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          Envoi…
        </>
      ) : (
        label
      )}
    </button>
  );

  const renderSubmitError = () =>
    submitError ? (
      <div className="bg-danger/10 text-danger px-4 py-3 rounded-2xl text-sm font-semibold text-left" role="alert">
        {submitError}
      </div>
    ) : null;

  const renderRsvpFormControls = (el: any, variant: 'inline' | 'outside' = 'inline') => {
    const isOutside = variant === 'outside';
    return (
      <div
        className={cn(
          'bg-surface border border-border rounded-3xl text-left relative w-full',
          isOutside ? 'p-5 sm:p-7' : 'p-5',
        )}
      >
        <div className="space-y-5">
          {renderRsvpLockedBanner()}
          {renderSubmitError()}
          <div className={cn('font-display font-semibold text-foreground text-center', isOutside ? 'text-xl' : 'text-lg')}>
            {formatText(el.text)}
          </div>

          <RsvpChoice value={rsvpStatus} onChange={setRsvpStatus} disabled={rsvpLocked} />

          {rsvpStatus === 'ACCEPTED' && (
            <div className="space-y-5 border-t border-border pt-5 animate-fade-in">
              {renderIdentityFields(`rsvp-${variant}`)}
              {renderFieldList(ensureMandatoryRsvpFields(el.rsvpFields || []))}
              {renderNotesField(`rsvp-${variant}`)}
            </div>
          )}

          {renderSubmitButton(rsvpStatus === 'ACCEPTED' ? 'Confirmer ma venue' : 'Envoyer ma réponse')}
        </div>
      </div>
    );
  };

  const InvitationWrapper = template ? 'form' : 'div';
  const invitationWrapperProps = template
    ? {
        onSubmit: onSubmit,
        className: 'w-full max-w-full flex flex-col items-center gap-6',
        style: { maxWidth: canvasStyle.maxWidth },
      }
    : {
        className: 'w-full max-w-full flex flex-col items-center gap-6',
        style: { maxWidth: canvasStyle.maxWidth },
      };

  return (
    <GuestPortalShell
      title={guest.event.title}
      guestId={guestId}
      organizationName={guest.organizationName}
      headerRight={
        <ShareButton
          title={`${guest.event.title} · Invitation`}
          text={`Invitation ${site.platformName} pour ${guest.firstName}.`}
          url={guestRsvpUrl(guestId)}
          className="!rounded-full !shadow-none !text-foreground"
        />
      }
      contentClassName="flex flex-col items-center gap-5 max-w-none w-full overflow-x-clip pb-24"
    >
      {guest.donations?.enabled && (
        <a
          href="#donations-section"
          className="inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-500/15 transition-colors"
        >
          <Heart className="w-3.5 h-3.5" aria-hidden />
          <span>Soutenir l&apos;événement</span>
        </a>
      )}
      <InvitationWrapper {...invitationWrapperProps}>
      <div
        style={
          template
            ? {
                ...getBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern),
                maxWidth: canvasStyle.maxWidth,
                minHeight: canvasStyle.minHeight,
              }
            : { maxWidth: '36rem' }
        }
        className={
          template
            ? `w-full max-w-full border border-border shadow-[var(--shadow-soft)] relative z-10 overflow-hidden flex flex-col transition-all duration-300 ${
                frameType === 'arch' ? 'rounded-t-[min(240px,40vw)] border border-amber-200/60' : 'rounded-[var(--radius-card)]'
              }`
            : 'w-full max-w-full relative z-10'
        }
      >

        {/* Double Border Frame */}
        {template && frameType === 'double-border' && (
          <>
            <div className="absolute inset-3 border border-amber-500/20 rounded-2xl pointer-events-none" />
            <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />
          </>
        )}

        {/* Gold Border Frame */}
        {template && frameType === 'gold-border' && (
          <div className="absolute inset-3 border border-amber-500/30 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(197,160,89,0.05)]" />
        )}

        {/* Floral Wreath Frame */}
        {template && frameType === 'floral-wreath' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <svg className="w-80 h-80 text-amber-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
              <circle cx="50" cy="50" r="35" strokeDasharray="2 2" />
              {[...Array(16)].map((_, i) => {
                const angle = (i * 22.5 * Math.PI) / 180;
                const x = 50 + 35 * Math.cos(angle);
                const y = 50 + 35 * Math.sin(angle);
                return (
                  <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 22.5 + 90})`}>
                    <path d="M0,0 C-3,-6 0,-10 3,-6 C6,-3 3,0 0,0" fill="currentColor" fillOpacity="0.3" />
                    <path d="M0,0 C3,-6 0,-10 -3,-6 C-6,-3 -3,0 0,0" fill="currentColor" fillOpacity="0.3" />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Floral Arch Frame */}
        {template && frameType === 'floral-arch' && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <svg className="w-full h-full" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id={`floral-arch-grad-${floralColor.replace('#', '')}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={lightenColor(floralColor, 40)} />
                  <stop offset="60%" stopColor={floralColor} />
                  <stop offset="100%" stopColor={darkenColor(floralColor, 40)} />
                </radialGradient>
              </defs>

              {/* Main Arch branches */}
              <path 
                d="M15,500 Q15,80 200,30 T385,500" 
                stroke={floralType === 'gold-leaves' ? '#d4af37' : '#3f492a'} 
                strokeWidth="3" 
                fill="none" 
                opacity="0.4"
              />
              <path 
                d="M30,500 Q30,100 200,50 T370,500" 
                stroke={floralType === 'gold-leaves' ? '#b59410' : '#2d361e'} 
                strokeWidth="2" 
                fill="none" 
                opacity="0.3"
              />

              {/* Generate dense flowers and leaves along the arch */}
              {[...Array(floralDensity)].map((_, i) => {
                const t = i / (floralDensity - 1);
                // Parabolic arch formula:
                // x goes from 15 to 385
                const x = 15 + t * 370;
                // y is a parabola: high in the middle (y=30), low at the ends (y=480)
                const y = 30 + 4 * (480 - 30) * Math.pow(t - 0.5, 2);

                // Deterministic pseudo-random offsets for organic look
                const seed1 = Math.sin(i * 123.45);
                const seed2 = Math.cos(i * 678.90);
                const offsetX = seed1 * 15;
                const offsetY = seed2 * 15;
                const scale = 0.7 + Math.abs(seed1) * 0.6; // Scale between 0.7 and 1.3
                const rotation = seed2 * 180; // Random rotation

                const px = x + offsetX;
                const py = y + offsetY;

                // Skip some flowers near the bottom to make it cascade naturally (thinner at the bottom)
                const isNearBottom = t < 0.1 || t > 0.9;
                const skipFlower = isNearBottom && (i % 3 === 0);

                return (
                  <g key={i} transform={`translate(${px}, ${py}) scale(${scale}) rotate(${rotation})`}>
                    {/* Leaves (always render leaves behind flowers) */}
                    {floralType !== 'gold-leaves' && (
                      <>
                        {/* Leaf 1 */}
                        <path 
                          d="M0,0 C-10,-15 -25,-10 -20,5 C-15,10 -5,5 0,0" 
                          fill={floralType === 'eucalyptus' ? '#7d8c5c' : '#4d7c0f'} 
                          opacity="0.85" 
                        />
                        {/* Leaf 2 */}
                        <path 
                          d="M0,0 C10,-15 25,-10 20,5 C15,10 5,5 0,0" 
                          fill={floralType === 'eucalyptus' ? '#92a173' : '#3f6212'} 
                          opacity="0.85" 
                        />
                      </>
                    )}

                    {/* Specific Flower Types */}
                    {!skipFlower && (
                      <>
                        {floralType === 'roses' && (
                          <>
                            {/* Red Rose Petals */}
                            <circle cx="0" cy="0" r="10" fill={`url(#floral-arch-grad-${floralColor.replace('#', '')})`} />
                            <path d="M-6,-4 C-10,-10 -2,-12 -4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
                            <path d="M6,-4 C10,-10 2,-12 4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
                            <path d="M-6,4 C-10,10 -2,12 -4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
                            <path d="M6,4 C10,10 2,12 4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
                            {/* Rose Center */}
                            <circle cx="0" cy="0" r="4" fill={darkenColor(floralColor, 30)} />
                            <circle cx="0" cy="0" r="2" fill="#fef08a" opacity="0.8" />
                          </>
                        )}

                        {floralType === 'cherry-blossom' && (
                          <>
                            {/* 5 Blossoms petals */}
                            {[...Array(5)].map((_, j) => {
                              const angle = (j * 72 * Math.PI) / 180;
                              const rx = 8 * Math.cos(angle);
                              const ry = 8 * Math.sin(angle);
                              return (
                                <path 
                                  key={j}
                                  d={`M0,0 C${rx * 1.5},${ry * 0.5} ${rx * 1.5},${ry * 1.5} 0,0`} 
                                  fill={floralColor} 
                                  stroke={darkenColor(floralColor, 20)}
                                  strokeWidth="0.5"
                                />
                              );
                            })}
                            <circle cx="0" cy="0" r="3" fill="#fef08a" />
                            <circle cx="0" cy="0" r="1" fill="#ca8a04" />
                          </>
                        )}

                        {floralType === 'gold-leaves' && (
                          <>
                            {/* Gold Leaf 1 */}
                            <path 
                              d="M0,0 C-8,-12 -18,-8 -15,4 C-12,8 -4,4 0,0" 
                              fill={floralColor} 
                              stroke={darkenColor(floralColor, 20)}
                              strokeWidth="0.5"
                            />
                            {/* Gold Leaf 2 */}
                            <path 
                              d="M0,0 C8,-12 18,-8 15,4 C12,8 4,4 0,0" 
                              fill={lightenColor(floralColor, 20)} 
                              stroke={darkenColor(floralColor, 10)}
                              strokeWidth="0.5"
                            />
                            {/* Gold Berries */}
                            <circle cx="-2" cy="-6" r="2" fill="#ffffff" stroke={floralColor} strokeWidth="0.5" />
                            <circle cx="2" cy="-6" r="1.5" fill="#fef3c7" stroke={floralColor} strokeWidth="0.5" />
                          </>
                        )}

                        {floralType === 'sunflowers' && (
                          <>
                            {/* Sunflower Petals */}
                            {[...Array(12)].map((_, j) => {
                              const rot = j * 30;
                              return (
                                <ellipse 
                                  key={j}
                                  cx="0"
                                  cy="-8"
                                  rx="3"
                                  ry="7"
                                  fill={floralColor}
                                  transform={`rotate(${rot})`}
                                />
                              );
                            })}
                            {/* Center seed head */}
                            <circle cx="0" cy="0" r="5" fill="#451a03" />
                            <circle cx="0" cy="0" r="4" fill="#1c1917" stroke="#78350f" strokeWidth="0.5" />
                          </>
                        )}

                        {floralType === 'eucalyptus' && (
                          <>
                            {/* Eucalyptus round leaves */}
                            <circle cx="-5" cy="-5" r="8" fill={floralColor} opacity="0.9" />
                            <circle cx="5" cy="5" r="7" fill={lightenColor(floralColor, 15)} opacity="0.9" />
                            <circle cx="-2" cy="6" r="6" fill={darkenColor(floralColor, 15)} opacity="0.8" />
                            {/* White berries */}
                            <circle cx="4" cy="-4" r="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
                            <circle cx="7" cy="-2" r="1.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
                          </>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Boho Dried Frame */}
        {template && frameType === 'boho-dried' && (
          <>
            <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
                <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
                <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800 transform rotate-180">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
                <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
                <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
          </>
        )}

        {/* Gold Leaves Circle Frame */}
        {template && frameType === 'gold-leaves-circle' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-80 h-80 text-amber-500" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" />
              {[...Array(20)].map((_, i) => {
                const angle = (i * 18 * Math.PI) / 180;
                const x = 50 + 38 * Math.cos(angle);
                const y = 50 + 38 * Math.sin(angle);
                return (
                  <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 18 + 45})`}>
                    <path d="M0,0 C2,-5 6,-7 8,-2 C6,3 2,3 0,0" fill="currentColor" fillOpacity="0.6" />
                    <circle cx="-2" cy="-2" r="1" fill="#fef3c7" stroke="currentColor" strokeWidth="0.1" />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Minimal Leaves Frame */}
        {template && frameType === 'minimal-leaves' && (
          <>
            <div className="absolute top-4 right-4 w-24 h-24 pointer-events-none opacity-30 text-primary">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M10,90 Q50,50 90,10" />
                <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
                <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
                <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </div>
            <div className="absolute bottom-4 left-4 w-24 h-24 pointer-events-none opacity-30 text-primary transform rotate-180">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M10,90 Q50,50 90,10" />
                <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
                <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
                <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </div>
          </>
        )}

        {/* Art Déco Gatsby Frame */}
        {template && frameType === 'art-deco' && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <svg className="w-full h-full text-amber-500" viewBox="0 0 400 600" fill="none" preserveAspectRatio="none">
              <path d="M20,50 L20,20 L50,20 M350,20 L380,20 L380,50 M380,550 L380,580 L350,580 M50,580 L20,580 L20,550" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
              <rect x="26" y="26" width="348" height="548" stroke="currentColor" strokeWidth="0.8" strokeDasharray="6 3" opacity="0.4" />
              <rect x="32" y="32" width="336" height="536" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
              <g transform="translate(200, 32)">
                <path d="M-30,0 L0,-16 L30,0 L0,16 Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
                <line x1="-80" y1="0" x2="-35" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                <line x1="35" y1="0" x2="80" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                <circle cx="0" cy="0" r="3" fill="currentColor" />
              </g>
              <g transform="translate(200, 568)">
                <path d="M-30,0 L0,-16 L30,0 L0,16 Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
                <line x1="-80" y1="0" x2="-35" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                <line x1="35" y1="0" x2="80" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                <circle cx="0" cy="0" r="3" fill="currentColor" />
              </g>
              <path d="M20,20 L45,45 M380,20 L355,45 M20,580 L45,555 M380,580 L355,555" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </svg>
          </div>
        )}

        {/* Deckled Edge Frame (Papier artisanal à bords frangés) */}
        {template && frameType === 'deckled' && (
          <div className="absolute inset-2 border-2 border-dashed border-amber-600/35 rounded-2xl pointer-events-none shadow-[inset_0_0_24px_rgba(197,160,89,0.12)]">
            <div className="absolute inset-1.5 border border-amber-500/25 rounded-xl" />
          </div>
        )}

        {/* Embossed Arch Frame (Gaufrage à sec architectural) */}
        {template && frameType === 'embossed-arch' && (
          <div className="absolute inset-3 rounded-t-[min(200px,36vw)] rounded-b-2xl pointer-events-none border border-black/5 dark:border-white/10 shadow-[inset_0_2px_5px_rgba(255,255,255,0.7),inset_0_-2px_5px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="absolute inset-2 rounded-t-[min(190px,34vw)] rounded-b-xl border border-black/5 dark:border-white/5 opacity-60" />
          </div>
        )}

        {/* Passport VIP Frame */}
        {template && frameType === 'passport-vip' && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute inset-3 border-2 border-amber-500/40 rounded-xl" />
            <div className="absolute inset-4 border border-amber-500/25 rounded-lg border-dashed" />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-amber-500/70 text-[9px] font-black uppercase tracking-[0.25em] whitespace-nowrap">
              <span>★</span>
              <span>PASS OFFICIEL VIP</span>
              <span>★</span>
            </div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-amber-500/50 text-[8px] font-mono tracking-widest whitespace-nowrap">
              <span>№ 2026-VIP-OFFICIAL</span>
            </div>
          </div>
        )}

        {/* Frosted Glass Frame */}
        {template && frameType === 'frosted-glass' && (
          <div className="absolute inset-2 rounded-2xl border border-white/60 dark:border-white/20 bg-white/20 dark:bg-white/5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] pointer-events-none" />
        )}

        {/* Boho Botanical Corners */}
        {template && bgPattern === 'boho' && (
          <>
            {/* Top-Left Branch */}
            <svg className="absolute top-2 left-2 w-20 h-24 text-amber-800/15 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10,10 C30,15 60,35 70,70" />
              <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
              <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
              <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
              <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
            </svg>
            {/* Bottom-Right Branch */}
            <svg className="absolute bottom-2 right-2 w-20 h-24 text-amber-800/15 pointer-events-none transform rotate-180" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10,10 C30,15 60,35 70,70" />
              <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
              <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
              <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
              <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
            </svg>
          </>
        )}

        {/* Event Card Content */}
        <div className={!template ? 'relative z-10' : `${global.layoutMode === 'free' ? 'relative flex-1 z-10' : 'p-8 space-y-8 flex-1 relative z-10'}`}>
          {/* Header */}
          {template ? (
            <div
              className={
                global.layoutMode === 'free'
                  ? 'relative w-full h-full min-h-full'
                  : 'flex flex-wrap gap-y-4 -mx-2 pt-2'
              }
              style={
                global.layoutMode === 'free'
                  ? { minHeight: canvasStyle.minHeight }
                  : undefined
              }
            >
              {inlineTemplateElements.map((el: any, index: number) => {
                const isFree = global.layoutMode === 'free' || el.positionMode === 'absolute';
                const widthClass = isFree
                  ? ''
                  : el.width === 'half'
                    ? 'w-1/2 px-2'
                    : el.width === 'third'
                      ? 'w-1/3 px-2'
                      : 'w-full px-2';
                
                return (
                  <div
                    key={el.id}
                    className={widthClass}
                    style={
                      isFree
                        ? {
                            position: 'absolute',
                            left: `${el.xPct ?? 8}%`,
                            top: `${el.yPct ?? 8}%`,
                            width: `${el.wPct ?? 84}%`,
                            zIndex: el.zIndex ?? index + 1,
                          }
                        : undefined
                    }
                  >
                    {el.type === 'text' && (
                      <div 
                        style={{ 
                          color: el.color, 
                          fontSize: el.fontSize, 
                          textAlign: el.align,
                          fontFamily: el.fontFamily || 'Cormorant Garamond',
                          letterSpacing: el.letterSpacing || 'normal',
                          fontWeight: el.bold ? 'bold' : 'normal',
                          fontStyle: el.italic ? 'italic' : 'normal'
                        }}
                        className="leading-relaxed break-words whitespace-pre-line"
                      >
                        {formatText(el.text)}
                      </div>
                    )}
                    {el.type === 'button' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                        {el.buttonLink ? (
                          el.buttonLink === '{{rsvpLink}}' || el.buttonLink === '#rsvp' || el.buttonLink === '#rsvp-section' ? (
                            <button 
                              type="button"
                              onClick={() => {
                                document.getElementById('rsvp-section')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              style={{ 
                                backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || DEFAULT_BRAND_PALETTE.primary, 
                                color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || DEFAULT_BRAND_PALETTE.primary : '#ffffff', 
                                borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || DEFAULT_BRAND_PALETTE.primary : 'transparent',
                                fontSize: el.fontSize,
                                fontFamily: el.fontFamily || 'Cormorant Garamond',
                                letterSpacing: el.letterSpacing || 'normal',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal'
                              }}
                              className={`font-bold text-center inline-block transition-all cursor-pointer ${
 el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
 el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
 el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
 el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
 el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
 'px-5 py-2.5 rounded-xl shadow-md shadow-primary/10'
 }`}
                            >
                              {formatText(el.text)}
                            </button>
                          ) : (
                            <a 
                              href={formatText(el.buttonLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || DEFAULT_BRAND_PALETTE.primary, 
                                color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || DEFAULT_BRAND_PALETTE.primary : '#ffffff', 
                                borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || DEFAULT_BRAND_PALETTE.primary : 'transparent',
                                fontSize: el.fontSize,
                                fontFamily: el.fontFamily || 'Cormorant Garamond',
                                letterSpacing: el.letterSpacing || 'normal',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal',
                                display: 'inline-block'
                              }}
                              className={`font-bold text-center transition-all cursor-pointer ${
 el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
 el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
 el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
 el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
 el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
 'px-5 py-2.5 rounded-xl shadow-md shadow-primary/10'
 }`}
                            >
                              {formatText(el.text)}
                            </a>
                          )
                        ) : (
                          <div 
                            style={{ 
                              backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || DEFAULT_BRAND_PALETTE.primary, 
                              color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || DEFAULT_BRAND_PALETTE.primary : '#ffffff', 
                              borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || DEFAULT_BRAND_PALETTE.primary : 'transparent',
                              fontSize: el.fontSize,
                              fontFamily: el.fontFamily || 'Cormorant Garamond',
                              letterSpacing: el.letterSpacing || 'normal',
                              fontWeight: el.bold ? 'bold' : 'normal',
                              fontStyle: el.italic ? 'italic' : 'normal'
                            }}
                            className={`font-bold text-center inline-block transition-all ${
 el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
 el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
 el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
 el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
 el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
 'px-5 py-2.5 rounded-xl shadow-md shadow-primary/10'
 }`}
                          >
                            {formatText(el.text)}
                          </div>
                        )}
                      </div>
                    )}
                    {el.type === 'image' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                        {el.imageUrl ? (
                          <img 
                            src={el.imageUrl} 
                            alt="Invitation" 
                            style={{ width: el.imageWidth || '100%', height: el.imageHeight || 'auto', objectFit: el.imageObjectFit || 'cover', ...templateImageStyleExtra(el.imageStyle) }}
                            className={templateImageStyleClass(el.imageStyle)}
                          />
                        ) : (
                          <div className="bg-surface-muted border border-border rounded-xl p-6 text-center text-xs text-muted font-semibold w-full">
                            {el.text || "Image d'illustration"}
                          </div>
                        )}
                      </div>
                    )}
                    {el.type === 'divider' && (
                      <div className={`flex items-center justify-center gap-3 py-2 text-${el.align}`}>
                        {el.dividerStyle === 'solid' && (
                          <div className="w-full border-t" style={{ borderColor: el.color }} />
                        )}
                        {el.dividerStyle === 'dashed' && (
                          <div className="w-full border-t border-dashed" style={{ borderColor: el.color }} />
                        )}
                        {el.dividerStyle === 'ornament-flower' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-sm select-none">❀</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-diamond' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-xs tracking-widest select-none">✦ ❖ ✦</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-star' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-sm select-none">✦</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-leaves' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-sm select-none">🌿 ❀ 🌿</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-lace' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-xs tracking-widest select-none">⚜ ⚜ ⚜</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                      </div>
                    )}
                    {el.type === 'curve' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-2`}>
                        <svg className="w-full max-w-[300px]" height="30" viewBox="0 0 300 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path 
                            d={
                              el.curveStyle === 'arc' ? "M10,25 Q 150,2, 290,25" :
                              el.curveStyle === 'flourish-1' ? "M30,15 C70,5 110,25 150,15 C190,5 230,25 270,15 M30,15 C20,15 15,10 20,5 C25,0 35,10 30,15 M270,15 C280,15 285,10 280,5 C275,0 265,10 270,15" :
                              el.curveStyle === 'flourish-2' ? "M10,15 L110,15 C120,15 125,5 135,5 C145,5 145,25 150,25 C155,25 155,5 165,5 C175,5 180,15 190,15 L290,15" :
                              el.curveStyle === 'spiral' ? "M150,15 C120,15 100,25 80,25 C60,25 50,15 60,10 C70,5 80,20 70,22 C65,23 60,15 65,13 M150,15 C180,15 200,25 220,25 C240,25 250,15 240,10 C230,5 220,20 230,22 C235,23 240,15 235,13" :
                              el.curveStyle === 'infinity' ? "M110,15 C110,25 130,25 150,15 C170,5 190,5 190,15 C190,25 170,25 150,15 C130,5 110,5 110,15 Z" :
                              "M0 15 Q 75 0, 150 15 T 300 15"
                            } 
                            stroke={el.color || '#cbd5e1'} 
                            strokeWidth={el.strokeWidth || '3px'} 
                            fill="none" 
                          />
                        </svg>
                      </div>
                    )}
                    {el.type === 'triangle' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-2`}>
                        <svg 
                          width={el.shapeSize || '60px'} 
                          height={el.shapeSize || '60px'} 
                          viewBox="0 0 100 100" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <polygon points="50,15 90,85 10,85" fill={el.color || '#cbd5e1'} />
                        </svg>
                      </div>
                    )}
                    {el.type === 'rsvp-block' && (
                      <div id="rsvp-section">
                        {renderRsvpFormControls(el)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <GuestEventHero
                greeting={`Pour ${guest.firstName} ${guest.lastName}`.trim()}
                title={guest.event.title}
                date={guest.event.date}
                location={guest.event.location}
                badge={
                  guest.organizationName ? (
                    <span className="em-guest-chip em-guest-chip--glass">{guest.organizationName}</span>
                  ) : null
                }
              />

              {guest.event.description?.trim() ? (
                <div className="rounded-[1.125rem] border border-border bg-surface p-4">
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{guest.event.description}</p>
                </div>
              ) : null}

              <GuestGuidelinesView guidelines={guest.event.guestGuidelines} />

              {/* Formulaire de réponse par défaut */}
              <form
                id="rsvp-section"
                onSubmit={onSubmit}
                className="bg-surface border border-border rounded-3xl p-5 space-y-5 scroll-mt-20"
              >
                {renderRsvpLockedBanner()}
                {renderSubmitError()}
                <h2 className="font-display text-xl font-semibold text-foreground text-center">
                  Serez-vous des nôtres&nbsp;?
                </h2>

                <RsvpChoice value={rsvpStatus} onChange={setRsvpStatus} disabled={rsvpLocked} />

                {rsvpStatus === 'DECLINED' && guest.donations?.enabled && (
                  <a
                    href="#donations-section"
                    className="flex items-center gap-3 rounded-2xl bg-rose-500/[0.07] p-3.5 text-left hover:bg-rose-500/10 transition animate-fade-in"
                  >
                    <Heart className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-300" aria-hidden />
                    <span className="text-sm text-foreground">Vous pouvez quand même soutenir l&apos;événement.</span>
                  </a>
                )}

                {rsvpStatus === 'ACCEPTED' && (
                  <div className="space-y-5 border-t border-border pt-5 animate-fade-in">
                    {renderIdentityFields('rsvp-default')}
                    {parseEventRsvpForm(guest.event.rsvpForm).length > 0 && (
                      <div className="space-y-4">
                        <p className="font-display text-base font-semibold text-foreground">Vos préférences</p>
                        {renderFieldList(parseEventRsvpForm(guest.event.rsvpForm))}
                      </div>
                    )}
                  </div>
                )}

                {renderNotesField('rsvp-default')}

                {renderSubmitButton(rsvpStatus === 'ACCEPTED' ? 'Confirmer ma venue' : 'Envoyer ma réponse')}
              </form>
            </div>
          )}
        </div>
      </div>

      {template &&
        outsideRsvpElements.map((el: any) => (
          <div key={el.id} id="rsvp-section" className="w-full">
            {renderRsvpFormControls(el, 'outside')}
          </div>
        ))}

      </InvitationWrapper>

      {/* Campagne solidaire si active */}
      {guest.donations && guest.donations.enabled && (
        <div id="donations-section" className="w-full max-w-xl space-y-2 scroll-mt-20">
          <GuestDonationForm
            guestId={guestId}
            guestName={`${firstName || guest.firstName} ${lastName || guest.lastName}`.trim()}
            guestEmail={guest.email}
            guestPhone={phone || guest.phone}
            donations={guest.donations}
          />
        </div>
      )}

      {/* Lieu et itinéraire */}
      {guest && guest.event?.location && (
        <div className="w-full max-w-xl bg-surface rounded-3xl border border-border p-4 space-y-3.5">
          <div className="flex items-center gap-3">
            <span className="em-guest-icon"><MapPin className="w-5 h-5" aria-hidden /></span>
            <div className="min-w-0">
              <p className="text-xs text-muted">Lieu</p>
              <p className="text-sm font-semibold text-foreground leading-snug">{guest.event.location}</p>
            </div>
          </div>

          {guest.placementAccessible ? (
            <>
              <div className="w-full overflow-hidden rounded-2xl border border-border h-[220px] relative bg-surface-muted">
                <iframe
                  title={`Carte : ${guest.event.location}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={
                    guest.event.latitude && guest.event.longitude
                      ? `https://maps.google.com/maps?q=${guest.event.latitude},${guest.event.longitude}&z=16&output=embed`
                      : `https://maps.google.com/maps?q=${encodeURIComponent(guest.event.location)}&z=15&output=embed`
                  }
                  className="absolute inset-0"
                ></iframe>
              </div>

              <div className="flex gap-2">
                <a
                  href={
                    guest.event.latitude && guest.event.longitude
                      ? `https://www.google.com/maps/search/?api=1&query=${guest.event.latitude},${guest.event.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(guest.event.location)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-full bg-surface-muted hover:bg-primary/10 text-foreground font-semibold text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Navigation className="w-4 h-4 text-primary" aria-hidden />
                  Google Maps
                </a>
                {guest.event.latitude && guest.event.longitude && (
                  <a
                    href={`https://www.waze.com/ul?ll=${guest.event.latitude},${guest.event.longitude}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-full bg-surface-muted hover:bg-primary/10 text-foreground font-semibold text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    Waze
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted">L&apos;itinéraire s&apos;affiche après votre réponse.</p>
          )}
        </div>
      )}

      {/* Raccourci « Répondre » tant que le formulaire n'est pas à l'écran */}
      {showAnswerShortcut && (
        <button
          type="button"
          onClick={scrollToAnswer}
          className="fixed z-30 left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] inline-flex items-center gap-2 h-12 px-5 rounded-full bg-primary-solid text-primary-foreground text-sm font-semibold shadow-[0_10px_24px_-6px_rgba(4,120,87,0.55)] hover:bg-primary-solid-hover active:scale-95 transition animate-fade-in touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowDown className="w-4 h-4" aria-hidden />
          Répondre à l&apos;invitation
        </button>
      )}
    </GuestPortalShell>
  );

}
