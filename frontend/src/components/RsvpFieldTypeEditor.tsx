'use client';

import React, { useState } from 'react';
import { Plus, RotateCcw, Trash } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { RsvpField, RsvpFieldType } from '@/lib/rsvpFormFields';
import {
  RSVP_FIELD_TYPE_LABELS,
  applyRsvpKindPreset,
  createDefaultRsvpField,
  getRsvpFieldKindEntry,
  isAllowedWidgetForKind,
  isMandatoryRsvpField,
  usesPredefinedRsvpOptions,
} from '@/lib/rsvpFormFields';

export default function RsvpFieldTypeEditor({
  fields,
  onChange,
  allowExtraFields = true,
}: {
  fields: RsvpField[];
  onChange: (fields: RsvpField[]) => void;
  allowExtraFields?: boolean;
}) {
  const updateField = (fieldId: string, patch: Partial<RsvpField>) => {
    onChange(
      fields.map((field) => {
        if (field.id !== fieldId) return field;
        const next = { ...field, ...patch };
        const kind = getRsvpFieldKindEntry(next);
        if (kind && patch.type && !isAllowedWidgetForKind(kind.kind, patch.type as RsvpFieldType)) {
          return field;
        }
        return next;
      }),
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((field, index) => (
          <FieldCard
            key={field.id}
            field={field}
            index={index}
            onChange={(patch) => updateField(field.id, patch)}
            onReset={() => onChange(fields.map((item) => (item.id === field.id ? applyRsvpKindPreset(item, 'predefined') : item)))}
            onDelete={() => {
              if (isMandatoryRsvpField(field)) return;
              onChange(fields.filter((item) => item.id !== field.id));
            }}
          />
        ))}
      </div>

      {allowExtraFields ? (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...fields,
              createDefaultRsvpField({
                analyticsKey: `champ_${fields.length + 1}`,
                label: 'Nouveau champ',
              }),
            ])
          }
          className="w-full text-xs font-semibold text-primary hover:bg-primary/5 border border-dashed border-primary/30 rounded-[var(--radius-button)] py-2.5 flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter un champ personnalisé
        </button>
      ) : null}
    </div>
  );
}

function FieldCard({
  field,
  index,
  onChange,
  onReset,
  onDelete,
}: {
  field: RsvpField;
  index: number;
  onChange: (patch: Partial<RsvpField>) => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const kind = getRsvpFieldKindEntry(field);
  const mandatory = Boolean(kind);
  const allowedTypes = kind?.allowedTypes || (Object.keys(RSVP_FIELD_TYPE_LABELS) as RsvpFieldType[]);
  const needsOptions = field.type === 'select' || field.type === 'radio';
  const [optionMode, setOptionMode] = useState<'predefined' | 'custom'>(
    usesPredefinedRsvpOptions(field) ? 'predefined' : 'custom',
  );
  const [customDraft, setCustomDraft] = useState(field.options || kind?.predefinedOptions || '');

  return (
    <div className="p-3.5 bg-surface border border-border rounded-[var(--radius-card)] space-y-2.5 relative shadow-none">
      {mandatory ? (
        <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-[var(--radius-button)]">
          {kind?.label || 'Obligatoire'}
        </span>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted hover:text-rose-600 hover:bg-rose-50 transition"
          title="Supprimer ce champ"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted pr-20">
        {mandatory ? `Type · ${kind?.label}` : `Champ #${index + 1}`}
      </p>

      <label className="space-y-1 block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Libellé affiché à l’invité</span>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary transition"
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Affichage</span>
        <select
          value={field.type}
          onChange={(e) => {
            const nextType = e.target.value as RsvpFieldType;
            const nextNeedsOptions = nextType === 'select' || nextType === 'radio';
            onChange({
              type: nextType,
              options: nextNeedsOptions
                ? (field.options || kind?.predefinedOptions || '')
                : field.options,
            });
          }}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary transition"
        >
          {allowedTypes.map((type) => (
            <option key={type} value={type}>
              {RSVP_FIELD_TYPE_LABELS[type] || type}
            </option>
          ))}
        </select>
      </label>

      {needsOptions && kind?.predefinedOptions ? (
        <div className="space-y-2">
          <div className="inline-flex p-0.5 rounded-[var(--radius-button)] bg-surface-muted border border-border">
            <button
              type="button"
              onClick={() => {
                setOptionMode('predefined');
                onChange({ options: kind.predefinedOptions });
              }}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold transition',
                optionMode === 'predefined' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
              )}
            >
              Valeurs prédéfinies
            </button>
            <button
              type="button"
              onClick={() => {
                setOptionMode('custom');
                setCustomDraft(field.options || kind.predefinedOptions || '');
              }}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold transition',
                optionMode === 'custom' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
              )}
            >
              Personnalisées
            </button>
          </div>
          {optionMode === 'predefined' ? (
            <p className="text-xs text-muted leading-relaxed">{kind.predefinedOptions}</p>
          ) : (
            <textarea
              value={customDraft}
              onChange={(e) => {
                setCustomDraft(e.target.value);
                onChange({ options: e.target.value });
              }}
              rows={2}
              className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:border-primary transition resize-none"
              placeholder="Option 1, Option 2, Option 3"
            />
          )}
        </div>
      ) : needsOptions ? (
        <label className="space-y-1 block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Options (virgules)</span>
          <input
            type="text"
            value={field.options || ''}
            onChange={(e) => onChange({ options: e.target.value })}
            className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:border-primary transition"
          />
        </label>
      ) : null}

      <label className="space-y-1 block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Texte d’aide</span>
        <input
          type="text"
          value={field.helpText || ''}
          onChange={(e) => onChange({ helpText: e.target.value })}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:border-primary transition"
          placeholder={kind?.helpText || 'Optionnel'}
        />
      </label>

      {mandatory ? (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-semibold text-muted hover:text-primary inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Réinitialiser ce type
        </button>
      ) : null}
    </div>
  );
}
