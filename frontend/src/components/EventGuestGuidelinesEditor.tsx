'use client';

import React, { useRef, useState } from 'react';
import {
  Plus, Trash2, Shirt, Save, Eye, ImagePlus, Loader2, ChevronDown,
} from '@/components/icons';
import { cn } from '@/lib/cn';
import {
  type GuestGuidelines,
  type DressCodePresetId,
  type RecommendationType,
  DRESS_CODE_PRESETS,
  RECOMMENDATION_PRESETS,
  MAX_GUIDELINE_IMAGES,
  defaultGuestGuidelines,
  normalizeGuestGuidelines,
  createRecommendation,
  hasVisibleGuestGuidelines,
  formatDressCodeText,
} from '@/lib/guestGuidelines';
import GuestGuidelinesView from '@/components/GuestGuidelinesView';
import { uploadImageFile } from '@/lib/cloudinaryUpload';

const PANEL = 'space-y-4 rounded-[20px] bg-surface p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_rgba(16,24,40,0.18)] sm:p-5';
const FIELD = 'w-full min-h-11 rounded-xl border border-border bg-surface px-3 text-base sm:text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';
const LABEL = 'text-[13px] font-semibold text-muted';
const CHIP = 'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const LINK = 'inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-2';
const ICON_BUTTON = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-rose-500/10 hover:text-rose-600';
const MESSAGE_CODES: Array<[string, string]> = [
  ['{{dressCode}}', 'Tenue'],
  ['{{dressCodeShort}}', 'Tenue, en bref'],
  ['{{recommendations}}', 'Recommandations'],
  ['{{guestNotes}}', 'Notes'],
  ['{{guestGuidelines}}', 'Toutes les infos'],
];

interface EventGuestGuidelinesEditorProps {
  value: GuestGuidelines;
  onChange: (value: GuestGuidelines) => void;
  onSave?: () => void;
  saving?: boolean;
  /** Sans aperçu ni bouton Enregistrer (formulaire de création / édition). */
  compact?: boolean;
}

export default function EventGuestGuidelinesEditor({
  value,
  onChange,
  onSave,
  saving = false,
  compact = false,
}: EventGuestGuidelinesEditorProps) {
  const guidelines = normalizeGuestGuidelines(value);

  const update = (patch: Partial<GuestGuidelines>) => {
    onChange({ ...guidelines, ...patch });
  };

  const updateDressCode = (patch: Partial<GuestGuidelines['dressCode']>) => {
    onChange({ ...guidelines, dressCode: { ...guidelines.dressCode, ...patch } });
  };

  const selectDressPreset = (presetId: DressCodePresetId) => {
    const preset = presetId !== 'custom' ? DRESS_CODE_PRESETS[presetId] : null;
    updateDressCode({
      presetId,
      customText: preset?.defaultText ?? guidelines.dressCode.customText,
      examples: preset?.examples ?? guidelines.dressCode.examples,
    });
  };

  const toggleRecommendation = (id: string, enabled: boolean) => {
    update({
      recommendations: guidelines.recommendations.map((r) =>
        r.id === id ? { ...r, enabled } : r,
      ),
    });
  };

  const updateRecommendation = (id: string, patch: Partial<GuestGuidelines['recommendations'][number]>) => {
    update({
      recommendations: guidelines.recommendations.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    });
  };

  const removeRecommendation = (id: string) => {
    update({ recommendations: guidelines.recommendations.filter((r) => r.id !== id) });
  };

  const addRecommendation = (type: RecommendationType) => {
    if (guidelines.recommendations.some((r) => r.type === type && type !== 'custom')) return;
    update({ recommendations: [...guidelines.recommendations, createRecommendation(type)] });
  };

  const addExample = () => {
    updateDressCode({ examples: [...(guidelines.dressCode.examples ?? []), ''] });
  };

  const updateExample = (index: number, text: string) => {
    const examples = [...(guidelines.dressCode.examples ?? [])];
    examples[index] = text;
    updateDressCode({ examples });
  };

  const removeExample = (index: number) => {
    updateDressCode({ examples: (guidelines.dressCode.examples ?? []).filter((_, i) => i !== index) });
  };

  const hasPreview = hasVisibleGuestGuidelines(guidelines);

  return (
    <div className="space-y-4">
      {!compact && onSave ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-solid px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-solid-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      ) : null}

      <div className={cn('grid grid-cols-1 items-start gap-4', !compact && hasPreview && 'xl:grid-cols-[minmax(0,1fr)_22rem]')}>
        <div className="space-y-4">
          <section className={PANEL}>
            <Toggle
              checked={guidelines.dressCode.enabled}
              onChange={(enabled) => updateDressCode({ enabled })}
              label={
                <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                  <Shirt className="w-4 h-4 text-primary" aria-hidden />
                  Code vestimentaire
                </span>
              }
            />

            {guidelines.dressCode.enabled && (
              <>
                <div role="group" aria-label="Style de tenue" className="flex flex-wrap gap-2">
                  {(Object.keys(DRESS_CODE_PRESETS) as Exclude<DressCodePresetId, 'custom'>[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={guidelines.dressCode.presetId === id}
                      title={DRESS_CODE_PRESETS[id].description}
                      onClick={() => selectDressPreset(id)}
                      className={cn(CHIP, guidelines.dressCode.presetId === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-foreground')}
                    >
                      {DRESS_CODE_PRESETS[id].label}
                    </button>
                  ))}
                </div>

                {guidelines.dressCode.presetId === 'theme_color' && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className={LABEL}>Couleur</span>
                      <input
                        type="color"
                        value={guidelines.dressCode.themeColor ?? '#7c3aed'}
                        onChange={(e) => updateDressCode({ themeColor: e.target.value })}
                        className="h-11 w-full cursor-pointer rounded-xl border border-border"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={LABEL}>Libellé couleurs</span>
                      <input
                        value={guidelines.dressCode.themeColorLabel ?? ''}
                        onChange={(e) => updateDressCode({ themeColorLabel: e.target.value })}
                        placeholder="ex. Violet & or"
                        className={FIELD}
                      />
                    </label>
                  </div>
                )}

                <label className="block space-y-1">
                  <span className={LABEL}>Précisions</span>
                  <textarea
                    value={guidelines.dressCode.customText ?? ''}
                    onChange={(e) => updateDressCode({ customText: e.target.value })}
                    placeholder="Tenue de soirée · Éviter le blanc pour les invités…"
                    className={cn(FIELD, 'h-20 resize-none py-2')}
                  />
                </label>
                {!formatDressCodeText(guidelines) ? (
                  <p role="status" className="text-xs text-amber-700 dark:text-amber-300">Le texte de la tenue est vide.</p>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={LABEL}>Exemples</span>
                    <button type="button" onClick={addExample} className={LINK}>
                      <Plus className="w-4 h-4" /> Ajouter
                    </button>
                  </div>
                  {(guidelines.dressCode.examples ?? []).map((ex, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={ex}
                        onChange={(e) => updateExample(i, e.target.value)}
                        aria-label={`Exemple ${i + 1}`}
                        placeholder="ex. Smoking, robe longue…"
                        className={cn(FIELD, 'flex-1')}
                      />
                      <button type="button" onClick={() => removeExample(i)} aria-label={`Retirer l’exemple ${i + 1}`} className={ICON_BUTTON}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <GuidelineImageField
                  urls={guidelines.dressCode.imageUrls ?? []}
                  onChange={(imageUrls) => updateDressCode({ imageUrls })}
                  label="Photos de tenue"
                />
              </>
            )}
          </section>

          <section className={PANEL}>
            <h3 className="text-[15px] font-semibold text-foreground">Recommandations</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(RECOMMENDATION_PRESETS) as RecommendationType[])
                .filter((t) => t !== 'custom' && !guidelines.recommendations.some((r) => r.type === t))
                .map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addRecommendation(type)}
                    className={cn(CHIP, 'border-border text-foreground hover:border-primary/40')}
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" aria-hidden />
                    {RECOMMENDATION_PRESETS[type].label}
                  </button>
                ))}
              <button type="button" onClick={() => addRecommendation('custom')} className={cn(CHIP, 'border-primary/40 text-primary hover:bg-primary/10')}>
                <Plus className="w-3.5 h-3.5" aria-hidden />
                Autre
              </button>
            </div>

            {guidelines.recommendations.length > 0 ? (
              <div className="space-y-3">
                {guidelines.recommendations.map((rec) => {
                  const title = rec.title || RECOMMENDATION_PRESETS[rec.type]?.label || 'Recommandation';
                  return (
                    <div key={rec.id} className="space-y-2 rounded-2xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={rec.enabled}
                            onChange={(e) => toggleRecommendation(rec.id, e.target.checked)}
                            className="h-4 w-4 rounded border-border text-primary"
                          />
                          {title}
                        </label>
                        <button type="button" onClick={() => removeRecommendation(rec.id)} aria-label={`Retirer ${title}`} className={ICON_BUTTON}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {rec.type === 'custom' && (
                        <input
                          value={rec.title ?? ''}
                          onChange={(e) => updateRecommendation(rec.id, { title: e.target.value })}
                          aria-label="Titre personnalisé"
                          placeholder="Titre personnalisé"
                          className={FIELD}
                        />
                      )}
                      <textarea
                        value={rec.content}
                        onChange={(e) => updateRecommendation(rec.id, { content: e.target.value })}
                        aria-label={title}
                        className={cn(FIELD, 'h-20 resize-none py-2')}
                      />
                      <GuidelineImageField
                        urls={rec.imageUrls ?? []}
                        onChange={(imageUrls) => updateRecommendation(rec.id, { imageUrls })}
                        label="Illustrations"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className={PANEL}>
            <label className="block space-y-2">
              <span className="text-[15px] font-semibold text-foreground">Notes</span>
              <textarea
                value={guidelines.additionalNotes ?? ''}
                onChange={(e) => update({ additionalNotes: e.target.value })}
                placeholder="Informations supplémentaires pour vos invités…"
                className={cn(FIELD, 'h-20 resize-none py-2')}
              />
            </label>
          </section>

          <section className={PANEL}>
            <h3 className="text-[15px] font-semibold text-foreground">Où les afficher</h3>
            <Toggle
              checked={guidelines.showOnRsvp}
              onChange={(showOnRsvp) => update({ showOnRsvp })}
              label="Sur la page de réponse de l’invité"
            />
            <Toggle
              checked={guidelines.showOnInvitation}
              onChange={(showOnInvitation) => update({ showOnInvitation })}
              label="Dans le message d’invitation"
            />
            {!compact && guidelines.showOnInvitation ? (
              <details className="group border-t border-border pt-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  Codes à insérer dans le message
                  <ChevronDown className="w-4 h-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <dl className="space-y-1.5 pb-1 text-[13px]">
                  {MESSAGE_CODES.map(([code, meaning]) => (
                    <div key={code} className="flex flex-wrap items-center justify-between gap-2">
                      <dt className="text-muted">{meaning}</dt>
                      <dd><code className="select-all rounded-md bg-surface-muted px-1.5 py-0.5 text-foreground">{code}</code></dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : null}
          </section>
        </div>

        {!compact && hasPreview ? (
          <aside aria-label="Aperçu invité" className="space-y-2 xl:sticky xl:top-24">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Eye className="w-4 h-4 text-primary" aria-hidden /> Aperçu invité
            </p>
            <GuestGuidelinesView guidelines={guidelines} variant="light" />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** Interrupteur sur une ligne : libellé à gauche, état à droite. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <span className="min-w-0">{label}</span>
      <span aria-hidden className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary-solid' : 'bg-border')}>
        <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

function GuidelineImageField({
  urls,
  onChange,
  label,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const full = urls.length >= MAX_GUIDELINE_IMAGES;

  const onFile = async (file?: File) => {
    if (!file || full) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadImageFile(file);
      if (uploaded.url) onChange([...urls, uploaded.url].slice(0, MAX_GUIDELINE_IMAGES));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload impossible.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <button
          type="button"
          disabled={full || uploading}
          onClick={() => inputRef.current?.click()}
          className="text-xs font-bold text-primary inline-flex items-center gap-1 disabled:opacity-40"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          {full ? 'Maximum atteint' : 'Ajouter une image'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {urls.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <li key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(urls.filter((item) => item !== url))}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white"
                title="Retirer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

export { defaultGuestGuidelines, normalizeGuestGuidelines };
