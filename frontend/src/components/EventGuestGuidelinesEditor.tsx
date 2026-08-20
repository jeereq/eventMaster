'use client';

import React, { useRef, useState } from 'react';
import {
  Plus, Trash2, Shirt, Save, Eye, ImagePlus, Loader2,
} from 'lucide-react';
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

  return (
    <div className={compact ? 'space-y-5' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
      <div className="space-y-5">
        {/* Dress code */}
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shirt className="w-4 h-4 text-primary" />
              Code vestimentaire
            </h3>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={guidelines.dressCode.enabled}
                onChange={(e) => updateDressCode({ enabled: e.target.checked })}
                className="rounded border-border text-primary"
              />
              Activer
            </label>
          </div>

          {guidelines.dressCode.enabled && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(DRESS_CODE_PRESETS) as Exclude<DressCodePresetId, 'custom'>[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectDressPreset(id)}
                    className={`text-left p-2.5 rounded-xl border text-[10px] font-bold transition ${
 guidelines.dressCode.presetId === id
 ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary/30'
 : 'border-border text-muted hover:bg-surface-muted'
 }`}
                  >
                    {DRESS_CODE_PRESETS[id].label}
                    <span className="block font-normal text-muted mt-0.5 line-clamp-2">
                      {DRESS_CODE_PRESETS[id].description}
                    </span>
                  </button>
                ))}
              </div>

              {guidelines.dressCode.presetId === 'theme_color' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs space-y-1">
                    <span className="font-semibold text-muted">Couleur</span>
                    <input
                      type="color"
                      value={guidelines.dressCode.themeColor ?? '#7c3aed'}
                      onChange={(e) => updateDressCode({ themeColor: e.target.value })}
                      className="w-full h-9 rounded-lg border cursor-pointer"
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <span className="font-semibold text-muted">Libellé couleurs</span>
                    <input
                      value={guidelines.dressCode.themeColorLabel ?? ''}
                      onChange={(e) => updateDressCode({ themeColorLabel: e.target.value })}
                      placeholder="ex. Violet & or"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                    />
                  </label>
                </div>
              )}

              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Précisions</span>
                <textarea
                  value={guidelines.dressCode.customText ?? ''}
                  onChange={(e) => updateDressCode({ customText: e.target.value })}
                  placeholder="Tenue de soirée · Éviter le blanc pour les invités…"
                  className="w-full px-3 py-2 rounded-xl border text-sm h-20 resize-none"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">Exemples</span>
                  <button type="button" onClick={addExample} className="text-[10px] font-bold text-primary flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>
                {(guidelines.dressCode.examples ?? []).map((ex, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={ex}
                      onChange={(e) => updateExample(i, e.target.value)}
                      placeholder="ex. Smoking, robe longue…"
                      className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                    />
                    <button type="button" onClick={() => removeExample(i)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <GuidelineImageField
                urls={guidelines.dressCode.imageUrls ?? []}
                onChange={(imageUrls) => updateDressCode({ imageUrls })}
                label="Photos ou illustrations de tenue"
              />
            </>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Avantages & recommandations</h3>
          <p className="text-[11px] text-muted leading-relaxed">
            Parking, cadeaux, horaires, extras (welcome drink, open bar…) — visibles par les invités sur le RSVP.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(RECOMMENDATION_PRESETS) as RecommendationType[]).filter((t) => t !== 'custom').map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addRecommendation(type)}
                disabled={guidelines.recommendations.some((r) => r.type === type)}
                className="px-2.5 py-1 rounded-lg border border-border text-[10px] font-bold text-muted hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + {RECOMMENDATION_PRESETS[type].label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addRecommendation('custom')}
              className="px-2.5 py-1 rounded-lg border border-primary/30 text-[10px] font-bold text-primary hover:bg-primary/10"
            >
              + Autre
            </button>
          </div>

          <div className="space-y-3">
            {guidelines.recommendations.length === 0 && (
              <p className="text-xs text-muted italic text-center py-4">Aucune recommandation — ajoutez-en ci-dessus.</p>
            )}
            {guidelines.recommendations.map((rec) => (
              <div key={rec.id} className="border border-border rounded-xl p-3 space-y-2 bg-surface-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={rec.enabled}
                      onChange={(e) => toggleRecommendation(rec.id, e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    {rec.title || RECOMMENDATION_PRESETS[rec.type]?.label || 'Recommandation'}
                  </label>
                  <button type="button" onClick={() => removeRecommendation(rec.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {rec.type === 'custom' && (
                  <input
                    value={rec.title ?? ''}
                    onChange={(e) => updateRecommendation(rec.id, { title: e.target.value })}
                    placeholder="Titre personnalisé"
                    className="w-full px-2 py-1.5 rounded-lg border text-xs"
                  />
                )}
                <textarea
                  value={rec.content}
                  onChange={(e) => updateRecommendation(rec.id, { content: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-xs h-16 resize-none bg-surface"
                />
                <GuidelineImageField
                  urls={rec.imageUrls ?? []}
                  onChange={(imageUrls) => updateRecommendation(rec.id, { imageUrls })}
                  label="Illustrations"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notes & visibility */}
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-4">
          <label className="block text-xs space-y-1">
            <span className="font-semibold text-muted">Notes complémentaires</span>
            <textarea
              value={guidelines.additionalNotes ?? ''}
              onChange={(e) => update({ additionalNotes: e.target.value })}
              placeholder="Informations supplémentaires pour vos invités…"
              className="w-full px-3 py-2 rounded-xl border text-sm h-20 resize-none"
            />
          </label>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 font-semibold text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={guidelines.showOnRsvp}
                onChange={(e) => update({ showOnRsvp: e.target.checked })}
                className="rounded border-border text-primary"
              />
              Afficher sur le portail RSVP invité
            </label>
            <label className="flex items-center gap-2 font-semibold text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={guidelines.showOnInvitation}
                onChange={(e) => update({ showOnInvitation: e.target.checked })}
                className="rounded border-border text-primary"
              />
              Inclure dans les variables d&apos;invitation
            </label>
          </div>
          {!compact && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
          >
            {saving ? <span>Enregistrement…</span> : <><Save className="w-4 h-4" /> Enregistrer les infos invités</>}
          </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {!compact && (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Aperçu invité
        </p>
        {hasVisibleGuestGuidelines(guidelines) ? (
          <GuestGuidelinesView guidelines={guidelines} variant="light" />
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-xs text-muted">
            Activez le code vestimentaire ou ajoutez des recommandations pour voir l&apos;aperçu.
            {guidelines.dressCode.enabled && !formatDressCodeText(guidelines) && (
              <p className="mt-2 text-amber-600">Le code vestimentaire est activé mais le texte est vide.</p>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted leading-relaxed">
          Variables invitation : {'{{dressCode}}'}, {'{{dressCodeShort}}'}, {'{{recommendations}}'}, {'{{guestNotes}}'}, {'{{guestGuidelines}}'}
        </p>
      </div>
      )}
    </div>
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
          className="text-[10px] font-bold text-primary inline-flex items-center gap-1 disabled:opacity-40"
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
      ) : (
        <p className="text-[11px] text-muted">Optionnel — photo de tenue, plan d’accès, illustration…</p>
      )}
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}

export { defaultGuestGuidelines, normalizeGuestGuidelines };
