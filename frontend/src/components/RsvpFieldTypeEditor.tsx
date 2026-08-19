'use client';

import React, { useState } from 'react';
import { Plus, RotateCcw, Trash } from 'lucide-react';
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
          className="w-full text-[11px] font-semibold text-primary hover:bg-primary/5 border border-dashed border-primary/30 rounded-xl py-2 flex items-center justify-center gap-1"
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
    <div className="p-3 bg-surface-muted border border-border rounded-xl space-y-2.5 relative">
      {mandatory ? (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          {kind?.label || 'Obligatoire'}
        </span>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2 right-2 text-muted hover:text-rose-600 transition"
          title="Supprimer ce champ"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="text-[10px] font-bold text-muted">
        {mandatory ? `Type de champ · ${kind?.label}` : `Champ #${index + 1}`}
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted uppercase">Libellé affiché à l’invité</label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-2.5 py-1 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted uppercase">Affichage</label>
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
          className="w-full px-2 py-1 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition"
        >
          {allowedTypes.map((type) => (
            <option key={type} value={type}>
              {RSVP_FIELD_TYPE_LABELS[type] || type}
            </option>
          ))}
        </select>
      </div>

      {needsOptions && kind?.predefinedOptions ? (
        <div className="space-y-2">
          <div className="inline-flex p-0.5 rounded-lg bg-surface border border-border">
            <button
              type="button"
              onClick={() => {
                setOptionMode('predefined');
                onChange({ options: kind.predefinedOptions });
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold ${
                optionMode === 'predefined' ? 'bg-primary/10 text-primary' : 'text-muted'
              }`}
            >
              Valeurs prédéfinies
            </button>
            <button
              type="button"
              onClick={() => {
                setOptionMode('custom');
                setCustomDraft(field.options || kind.predefinedOptions || '');
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold ${
                optionMode === 'custom' ? 'bg-primary/10 text-primary' : 'text-muted'
              }`}
            >
              Personnalisées
            </button>
          </div>
          {optionMode === 'predefined' ? (
            <p className="text-[11px] text-muted leading-relaxed">{kind.predefinedOptions}</p>
          ) : (
            <textarea
              value={customDraft}
              onChange={(e) => {
                setCustomDraft(e.target.value);
                onChange({ options: e.target.value });
              }}
              rows={2}
              className="w-full px-2.5 py-1 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition resize-none"
              placeholder="Option 1, Option 2, Option 3"
            />
          )}
        </div>
      ) : needsOptions ? (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted uppercase">Options (virgules)</label>
          <input
            type="text"
            value={field.options || ''}
            onChange={(e) => onChange({ options: e.target.value })}
            className="w-full px-2.5 py-1 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted uppercase">Texte d’aide</label>
        <input
          type="text"
          value={field.helpText || ''}
          onChange={(e) => onChange({ helpText: e.target.value })}
          className="w-full px-2.5 py-1 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition"
          placeholder={kind?.helpText || 'Optionnel'}
        />
      </div>

      {mandatory ? (
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] font-semibold text-muted hover:text-primary inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Réinitialiser ce type
        </button>
      ) : null}
    </div>
  );
}
