'use client';

import { cn } from '@/lib/cn';
import type { InvitationStructuredBrief } from '@/config/invitationStructuredBrief';

type InvitationCardInfoFieldsProps = {
  id: string;
  value: InvitationStructuredBrief;
  onChange: (next: InvitationStructuredBrief) => void;
  /** Affiche les cases « Remplacer sur le modèle » */
  showReplaceToggles?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

export default function InvitationCardInfoFields({
  id,
  value,
  onChange,
  showReplaceToggles = false,
  disabled,
  compact,
}: InvitationCardInfoFieldsProps) {
  const fieldClass = cn(
    'w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60',
    compact ? 'min-h-11' : 'min-h-11',
  );

  const rows: Array<{
    key: 'title' | 'honorees' | 'date' | 'description';
    replaceKey: 'replaceTitle' | 'replaceHonorees' | 'replaceDate' | 'replaceDescription';
    label: string;
    placeholder: string;
    multiline?: boolean;
  }> = [
    { key: 'title', replaceKey: 'replaceTitle', label: 'Titre', placeholder: 'Ex. Mariage de Grace & Patrick' },
    { key: 'honorees', replaceKey: 'replaceHonorees', label: 'Noms (couple / cérémonie)', placeholder: 'Ex. Grace & Patrick' },
    { key: 'date', replaceKey: 'replaceDate', label: 'Date', placeholder: 'Ex. Samedi 12 juillet 2026 · 15 h' },
    {
      key: 'description',
      replaceKey: 'replaceDescription',
      label: 'Description',
      placeholder: 'Lieu, dress code, message court…',
      multiline: true,
    },
  ];

  return (
    <div className={cn('space-y-3', compact && 'space-y-2.5')}>
      <div>
        <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
          Infos de la carte
        </p>
        <p className="text-xs text-muted mt-0.5">
          {showReplaceToggles
            ? 'Indiquez les textes à poser ou à remplacer sur le modèle.'
            : 'Ces informations seront posées sur le fond généré (variables dynamiques).'}
        </p>
      </div>

      {rows.map((row) => (
        <div key={row.key} className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`${id}-${row.key}`} className="text-xs font-semibold text-foreground">
              {row.label}
            </label>
            {showReplaceToggles ? (
              <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={value[row.replaceKey]}
                  disabled={disabled || !value[row.key].trim()}
                  onChange={(e) => onChange({ ...value, [row.replaceKey]: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Remplacer sur le modèle
              </label>
            ) : null}
          </div>
          {row.multiline ? (
            <textarea
              id={`${id}-${row.key}`}
              rows={3}
              value={value[row.key]}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [row.key]: e.target.value })}
              placeholder={row.placeholder}
              className={cn(fieldClass, 'resize-y')}
            />
          ) : (
            <input
              id={`${id}-${row.key}`}
              type="text"
              value={value[row.key]}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [row.key]: e.target.value })}
              placeholder={row.placeholder}
              className={fieldClass}
            />
          )}
        </div>
      ))}
    </div>
  );
}
