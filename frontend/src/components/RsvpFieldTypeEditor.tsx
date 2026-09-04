'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Trash, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { RsvpField, RsvpFieldType } from '@/lib/rsvpFormFields';
import {
  RSVP_FIELD_TYPE_LABELS,
  applyRsvpKindPreset,
  createDefaultRsvpField,
  getRsvpFieldKindEntry,
  isAllowedWidgetForKind,
  isMandatoryRsvpField,
  slugifyAnalyticsKey,
  usesPredefinedRsvpOptions,
  validateRsvpFieldsForReporting,
} from '@/lib/rsvpFormFields';

export default function RsvpFieldTypeEditor({
  fields,
  onChange,
  allowExtraFields = true,
  showAddButton = true,
}: {
  fields: RsvpField[];
  onChange: (fields: RsvpField[]) => void;
  allowExtraFields?: boolean;
  /** Quand false, le parent fournit le bouton d’ajout (évite les doublons). */
  showAddButton?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(fields[0]?.id ?? null);

  useEffect(() => {
    if (!fields.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !fields.some((f) => f.id === selectedId)) {
      setSelectedId(fields[0].id);
    }
  }, [fields, selectedId]);

  const selected = fields.find((f) => f.id === selectedId) || null;
  const exportIssues = useMemo(() => validateRsvpFieldsForReporting(fields), [fields]);

  const updateField = (fieldId: string, patch: Partial<RsvpField>) => {
    onChange(
      fields.map((field) => {
        if (field.id !== fieldId) return field;
        const next = { ...field, ...patch };
        const kind = getRsvpFieldKindEntry(next);
        if (kind && patch.type && !isAllowedWidgetForKind(kind.kind, patch.type as RsvpFieldType)) {
          return field;
        }
        if (isMandatoryRsvpField(field) && patch.required === false) {
          next.required = true;
        }
        return next;
      }),
    );
  };

  const addField = () => {
    const created = createDefaultRsvpField({
      analyticsKey: `champ_${fields.length + 1}`,
      label: 'Nouveau champ',
    });
    onChange([...fields, created]);
    setSelectedId(created.id);
  };

  return (
    <div className="space-y-3">
      {exportIssues.length > 0 ? (
        <p role="status" className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 break-words">
          {exportIssues[0]}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Champs du formulaire</p>
        <ul className="border border-border rounded-[var(--radius-card)] divide-y divide-border overflow-hidden bg-surface">
          {fields.map((field, index) => {
            const kind = getRsvpFieldKindEntry(field);
            const mandatory = Boolean(kind);
            const active = field.id === selectedId;
            return (
              <li key={field.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(field.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                    active ? 'bg-primary/10' : 'hover:bg-surface-muted',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-foreground truncate">
                      {field.label || `Champ #${index + 1}`}
                    </span>
                    <span className="block text-[10px] text-muted truncate">
                      {RSVP_FIELD_TYPE_LABELS[field.type] || field.type}
                      {field.analyticsKey ? ` · ${field.analyticsKey}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {mandatory ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Obligatoire
                      </span>
                    ) : null}
                    {field.required && !mandatory ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                        Requis
                      </span>
                    ) : null}
                    <ChevronRight className={cn('w-3.5 h-3.5 text-muted', active && 'text-primary')} />
                  </span>
                </button>
              </li>
            );
          })}
          {!fields.length ? (
            <li className="px-3 py-4 text-xs text-muted text-center">Aucun champ pour l’instant.</li>
          ) : null}
        </ul>
      </div>

      {selected ? (
        <FieldDetail
          field={selected}
          index={fields.findIndex((f) => f.id === selected.id)}
          onChange={(patch) => updateField(selected.id, patch)}
          onReset={() =>
            onChange(fields.map((item) => (item.id === selected.id ? applyRsvpKindPreset(item, 'predefined') : item)))
          }
          onDelete={() => {
            if (isMandatoryRsvpField(selected)) return;
            const next = fields.filter((item) => item.id !== selected.id);
            onChange(next);
            setSelectedId(next[0]?.id ?? null);
          }}
        />
      ) : null}

      {allowExtraFields && showAddButton ? (
        <button
          type="button"
          onClick={addField}
          className="w-full text-xs font-semibold text-primary hover:bg-primary/5 border border-dashed border-primary/30 rounded-[var(--radius-button)] py-2.5 flex items-center justify-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter un champ
        </button>
      ) : null}
    </div>
  );
}

function FieldDetail({
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
  const [keyTouched, setKeyTouched] = useState(Boolean(field.analyticsKey));

  useEffect(() => {
    setOptionMode(usesPredefinedRsvpOptions(field) ? 'predefined' : 'custom');
    setCustomDraft(field.options || kind?.predefinedOptions || '');
    setKeyTouched(Boolean(field.analyticsKey));
  }, [field.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset drafts when switching field

  const exportKey = field.analyticsKey || slugifyAnalyticsKey(field.label);

  return (
    <div className="p-3.5 bg-surface border border-border rounded-[var(--radius-card)] space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            {mandatory ? `Type · ${kind?.label}` : `Champ #${index + 1}`}
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{field.label || 'Sans libellé'}</p>
        </div>
        {!mandatory ? (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-md text-muted hover:text-rose-600 hover:bg-rose-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title="Supprimer ce champ"
            aria-label="Supprimer ce champ"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <label className="space-y-1 block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Libellé affiché à l’invité</span>
        <input
          type="text"
          value={field.label}
          onChange={(e) => {
            const label = e.target.value;
            const patch: Partial<RsvpField> = { label };
            if (!keyTouched && !mandatory) {
              patch.analyticsKey = slugifyAnalyticsKey(label);
            }
            onChange(patch);
          }}
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

      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Champ requis</span>
        <input
          type="checkbox"
          checked={Boolean(field.required) || mandatory}
          disabled={mandatory}
          onChange={(e) => onChange({ required: e.target.checked })}
          className="rounded text-primary focus:ring-primary disabled:opacity-60"
          title={mandatory ? 'Ce champ est toujours requis' : undefined}
        />
      </label>

      {needsOptions && kind?.predefinedOptions ? (
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Options</span>
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
              Prédéfinies
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Options (séparées par des virgules)</span>
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

      <label className="space-y-1 block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Placeholder</span>
        <input
          type="text"
          value={field.placeholder || ''}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:border-primary transition"
          placeholder="Ex. : Votre réponse…"
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Identifiant d’export</span>
        <input
          type="text"
          value={exportKey}
          onChange={(e) => {
            setKeyTouched(true);
            onChange({ analyticsKey: slugifyAnalyticsKey(e.target.value) || slugifyAnalyticsKey(field.label) });
          }}
          disabled={mandatory}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm font-mono text-foreground focus:outline-none focus:border-primary transition disabled:opacity-60"
          title={mandatory ? 'Identifiant fixe pour les stats EventMaster' : 'Utilisé dans les exports et statistiques'}
        />
        <span className="block text-[10px] text-muted leading-relaxed">
          Sert aux exports CSV et aux statistiques. Doit être unique entre les champs.
        </span>
      </label>

      {mandatory ? (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-semibold text-muted hover:text-primary inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
        >
          <RotateCcw className="w-3 h-3" /> Réinitialiser ce type
        </button>
      ) : null}
    </div>
  );
}
