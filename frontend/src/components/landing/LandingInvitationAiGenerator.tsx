'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Coins,
  ImageIcon,
  Loader2,
  Maximize2,
  Sparkles,
  Upload,
  Wand2,
  XCircle,
  ArrowRight,
  Check,
  Type,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  getAiSimulationAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import {
  composeTemplateWithAiPublic,
  saveAiTemplateDraft,
  type TemplateAiComposeContent,
  type TemplateAiComposeResult,
} from '@/lib/templateAiCompose';
import {
  fetchAiTemplateComposeHistory,
  type AiTemplateComposeHistoryItem,
} from '@/lib/aiTemplateComposeHistory';
import AiTemplateComposeHistoryList from '@/components/AiTemplateComposeHistoryList';
import type { LandingTemplate } from '@/config/landingTemplates';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';

const BRIEF_PRESETS = [
  'Mariage élégant, ivoire et or, floraux discrets',
  'Baptême doux, pastels et dentelle',
  'Soirée gala, noir et champagne, luxe minimal',
];

function contentToLandingTemplate(
  content: TemplateAiComposeContent,
  prompt: string,
): LandingTemplate {
  const global = (content.global || {}) as Record<string, unknown>;
  const palette =
    global.palette && typeof global.palette === 'object' && !Array.isArray(global.palette)
      ? (global.palette as Record<string, unknown>)
      : {};
  const bgColor =
    typeof global.bgColor === 'string'
      ? global.bgColor
      : typeof palette.background === 'string'
        ? palette.background
        : '#faf7f2';
  const accent =
    typeof palette.accent === 'string'
      ? palette.accent
      : typeof palette.primary === 'string'
        ? palette.primary
        : '#c5a059';

  return {
    id: 'ai-preview',
    name: 'Aperçu IA',
    category: 'private',
    group: 'private',
    description: prompt.slice(0, 120) || 'Modèle généré par IA',
    style: {
      bg: 'bg-surface',
      border: 'border-border',
      textTitle: 'text-foreground',
      textBody: 'text-muted',
      btnBg: 'bg-primary',
      btnText: 'text-primary-foreground',
      bgColor,
      borderColor: accent,
    },
    elements: [],
    previewContent: {
      global: {
        ...global,
        bgColor,
        bgImageUrl: typeof global.bgImageUrl === 'string' ? global.bgImageUrl : undefined,
        bgPattern: typeof global.bgPattern === 'string' ? global.bgPattern : undefined,
        frameType: typeof global.frameType === 'string' ? global.frameType : undefined,
      },
      elements: Array.isArray(content.elements)
        ? (content.elements as Array<Record<string, unknown>>)
        : [],
    },
  };
}

function paletteFromContent(content: TemplateAiComposeContent | null) {
  if (!content?.global || typeof content.global !== 'object') return null;
  const palette = (content.global as Record<string, unknown>).palette;
  if (!palette || typeof palette !== 'object' || Array.isArray(palette)) return null;
  const p = palette as Record<string, unknown>;
  const keys = ['primary', 'secondary', 'accent', 'background'] as const;
  const out: Array<{ key: string; color: string }> = [];
  for (const key of keys) {
    if (typeof p[key] === 'string' && /^#/.test(p[key] as string)) {
      out.push({ key, color: p[key] as string });
    }
  }
  return out.length ? out : null;
}

function elementSummary(content: TemplateAiComposeContent | null) {
  if (!Array.isArray(content?.elements)) return [];
  return content.elements
    .filter((el): el is Record<string, unknown> => Boolean(el) && typeof el === 'object')
    .slice(0, 8)
    .map((el) => {
      const type = typeof el.type === 'string' ? el.type : 'élément';
      const text = typeof el.text === 'string' ? el.text : '';
      return { type, text };
    });
}

const STAGE_STEPS = [
  { id: 'upload', label: 'Images' },
  { id: 'analyse', label: 'Analyse' },
  { id: 'image', label: 'Image' },
  { id: 'ready', label: 'Aperçu' },
] as const;

export default function LandingInvitationAiGenerator({
  className,
  id = 'generateur-ia',
}: {
  className?: string;
  id?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TemplateAiComposeContent | null>(null);
  const [lastStageMeta, setLastStageMeta] = useState<TemplateAiComposeResult['stage'] | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<AiTemplateComposeHistoryItem[]>([]);
  const [allowance, setAllowance] = useState<AiAllowance>(() => getAiSimulationAllowance());
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    void syncDeviceAiTokensWithBackend(api).then(setAllowance).catch(() => {
      setAllowance(getAiSimulationAllowance());
    });
    void fetchAiTemplateComposeHistory().then(setHistory);
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const previewTemplate = useMemo(
    () => (result ? contentToLandingTemplate(result, prompt) : null),
    [result, prompt],
  );
  const palette = useMemo(() => paletteFromContent(result), [result]);
  const elements = useMemo(() => elementSummary(result), [result]);

  const addFiles = (list: File[]) => {
    const images = list.filter((f) => f.type.startsWith('image/')).slice(0, 4);
    if (!images.length) {
      setError('Sélectionnez des images (JPEG, PNG, WebP).');
      return;
    }
    previews.forEach((url) => URL.revokeObjectURL(url));
    const merged = [...files, ...images].slice(0, 4);
    setFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
    setError('');
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    addFiles(list);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerate = async () => {
    if (busy) return;
    if (files.length < 1) {
      setError('Ajoutez au moins une image de référence.');
      return;
    }
    if (prompt.trim().length < 8) {
      setError('Décrivez le style souhaité (quelques mots minimum).');
      return;
    }
    if (!allowance.canSimulate) {
      setTokenModalOpen(true);
      return;
    }

    setError('');
    setBusy(true);
    setResult(null);
    setLastStageMeta(null);
    setActiveHistoryId(null);
    setActiveStep(1);
    setStage('Analyse des images et du brief…');
    const tick = window.setTimeout(() => {
      setActiveStep(2);
      setStage('Création de la nouvelle image…');
    }, 2800);

    try {
      const data = await composeTemplateWithAiPublic({
        prompt: prompt.trim(),
        files,
      });
      setResult(data.content);
      setLastStageMeta(data.stage || null);
      setActiveHistoryId(typeof data.historyId === 'string' ? data.historyId : null);
      setAllowance(getAiSimulationAllowance());
      saveAiTemplateDraft(data.content, prompt.trim());
      void fetchAiTemplateComposeHistory().then(setHistory);
      setActiveStep(3);
      setStage(null);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 402) {
        setTokenModalOpen(true);
        setError(e.message || 'Plus de jetons IA. Rechargez pour continuer.');
      } else {
        setError(e?.message || 'Impossible de générer le modèle.');
      }
      setActiveStep(files.length ? 0 : 0);
      setStage(null);
    } finally {
      window.clearTimeout(tick);
      setBusy(false);
    }
  };

  const continueToStudio = () => {
    if (result) saveAiTemplateDraft(result, prompt.trim());
    if (user) {
      router.push('/dashboard/templates?aiDraft=1');
      return;
    }
    router.push(
      `/register?kind=ORGANIZER&intent=personal&action=template&next=${encodeURIComponent('/dashboard/templates?aiDraft=1')}`,
    );
  };

  const resetResult = () => {
    setResult(null);
    setLastStageMeta(null);
    setActiveHistoryId(null);
    setActiveStep(0);
    setPreviewOpen(false);
  };

  const openHistoryItem = (item: AiTemplateComposeHistoryItem) => {
    if (busy) return;
    setResult(item.content);
    setLastStageMeta(
      item.stage
        ? {
            structureReady: Boolean(item.stage.structureReady),
            backgroundReady: Boolean(item.stage.backgroundReady),
            imageMode: item.stage.imageMode ?? null,
          }
        : null,
    );
    setActiveHistoryId(item.id);
    if (item.prompt) setPrompt(item.prompt);
    saveAiTemplateDraft(item.content, item.prompt || undefined);
    setActiveStep(3);
    setError('');
    setStage(null);
    setPreviewOpen(false);
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  };

  return (
    <section
      id={id}
      className={cn(
        'rounded-[1.25rem] border border-border bg-surface shadow-sm overflow-hidden scroll-mt-20',
        className,
      )}
    >
      <div className="px-5 sm:px-7 pt-6 sm:pt-7 pb-4 border-b border-border/80 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%)]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center shadow-md shadow-primary/25 shrink-0">
                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <span className="min-w-0 leading-tight">Studio IA</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Images + brief → aperçu éditable. Le brief guide le style ; les visages présents sont
              conservés, aucun visage n’est inventé.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground px-3 py-1.5 rounded-full bg-surface border border-border tabular-nums">
              <Coins className="w-3.5 h-3.5 text-primary" />
              {allowance.totalRemaining} jeton{allowance.totalRemaining === 1 ? '' : 's'}
            </span>
            {!allowance.canSimulate ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => setTokenModalOpen(true)}>
                Recharger
              </Button>
            ) : null}
          </div>
        </div>

        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Étapes du studio">
          {STAGE_STEPS.map((step, index) => {
            const done = activeStep > index || (result && index <= 3);
            const current = busy ? activeStep === index : result ? index === 3 : index === 0 && !files.length;
            return (
              <li
                key={step.id}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition',
                  done
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : current
                      ? 'bg-surface border-primary text-foreground'
                      : 'bg-surface-muted/60 border-border text-muted',
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px]',
                    done ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted',
                  )}
                >
                  {done ? <Check className="w-2.5 h-2.5" /> : index + 1}
                </span>
                {step.label}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] gap-0 xl:divide-x divide-border">
        {/* Compose */}
        <div className="p-5 sm:p-7 space-y-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!busy && files.length < 4) inputRef.current?.click();
              }
            }}
            onClick={() => {
              if (!busy && files.length < 4) inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (busy) return;
              addFiles(Array.from(e.dataTransfer.files || []));
            }}
            className={cn(
              'rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              dragOver
                ? 'border-primary bg-primary/10'
                : 'border-primary/25 hover:border-primary/50 hover:bg-primary/5',
              (busy || files.length >= 4) && 'opacity-70 cursor-default',
            )}
          >
            <Upload className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">Déposez 1 à 4 images</p>
            <p className="text-xs text-muted mt-1">JPEG, PNG ou WebP — ou cliquez pour choisir</p>
          </div>

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {previews.map((url, i) => (
                <div
                  key={url}
                  className="relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border shadow-sm group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Référence ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute top-1 right-1 bg-black/65 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 disabled:opacity-40"
                    aria-label={`Retirer l’image ${i + 1}`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ai-brief" className="text-xs font-bold text-foreground">
                Brief style
              </label>
              <span className="text-[10px] text-muted tabular-nums">{prompt.trim().length}/1500</span>
            </div>
            <textarea
              id="ai-brief"
              rows={4}
              maxLength={1500}
              value={prompt}
              disabled={busy}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex. Mariage élégant, tons ivoire et or, floraux discrets, typographie script pour les prénoms…"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[6rem]"
            />
            <div className="flex flex-wrap gap-1.5">
              {BRIEF_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={busy}
                  onClick={() => setPrompt(preset)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-border bg-surface-muted/70 text-muted hover:text-foreground hover:border-primary/40 transition disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
              {error}
            </p>
          ) : null}

          {busy ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">{stage || 'Génération en cours…'}</p>
                <p className="text-[11px] text-muted mt-0.5">Environ 20–40 s selon les images.</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={busy || !files.length || prompt.trim().length < 8}
              leftIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            >
              {busy ? 'Génération…' : 'Générer mon modèle'}
            </Button>
            {result ? (
              <Button type="button" variant="secondary" onClick={resetResult} disabled={busy}>
                Recommencer
              </Button>
            ) : null}
          </div>

          <AiTemplateComposeHistoryList
            items={history}
            activeId={activeHistoryId}
            onOpen={openHistoryItem}
            className="pt-2"
            listClassName="max-h-56 sm:max-h-64"
          />
        </div>

        {/* Preview rail */}
        <aside
          ref={resultRef}
          className="bg-surface-muted/35 p-5 sm:p-6 flex flex-col min-h-[22rem] xl:min-h-full"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              Aperçu du résultat
            </p>
            {previewTemplate ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="text-[11px] font-bold text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Agrandir
              </button>
            ) : null}
          </div>

          {previewTemplate ? (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="rounded-2xl border border-border bg-surface shadow-md overflow-hidden">
                <LandingInvitationPreview
                  template={previewTemplate}
                  className="!min-h-[280px] !max-h-[min(480px,58vh)] !p-4 sm:!p-5"
                />
              </div>

              {palette ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Palette</span>
                  {palette.map((swatch) => (
                    <span
                      key={swatch.key}
                      title={`${swatch.key}: ${swatch.color}`}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted"
                    >
                      <span
                        className="w-4 h-4 rounded-md border border-border shadow-sm"
                        style={{ backgroundColor: swatch.color }}
                      />
                      {swatch.key}
                    </span>
                  ))}
                </div>
              ) : null}

              {elements.length > 0 ? (
                <ul className="space-y-1.5 max-h-28 overflow-y-auto overscroll-contain pr-1">
                  {elements.map((el, i) => (
                    <li
                      key={`${el.type}-${i}`}
                      className="flex items-start gap-2 text-[11px] text-muted"
                    >
                      <Type className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                      <span className="min-w-0">
                        <span className="font-bold text-foreground capitalize">{el.type}</span>
                        {el.text ? (
                          <span className="line-clamp-1"> — {el.text}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="text-[11px] text-muted leading-relaxed">
                {lastStageMeta?.backgroundReady
                  ? 'Fond généré + structure texte / RSVP prêts à éditer.'
                  : 'Structure prête. Affinez le fond dans le studio si besoin.'}
              </p>

              <div className="mt-auto flex flex-col gap-2 pt-1">
                <Button
                  type="button"
                  onClick={continueToStudio}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  fullWidth
                >
                  {user ? 'Ouvrir dans le studio' : 'Continuer et éditer'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)} fullWidth>
                  Voir l’aperçu large
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-2">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-primary/50" />
              </div>
              <p className="text-sm font-semibold text-foreground">En attente de génération</p>
              <p className="text-xs text-muted leading-relaxed max-w-[16rem]">
                L’invitation complète (fond + textes + RSVP) s’affichera ici, comme dans le catalogue.
              </p>
              <Link
                href="/#simulateur-ia"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Simulation budget IA →
              </Link>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={previewOpen && Boolean(previewTemplate)}
        onClose={() => setPreviewOpen(false)}
        title="Aperçu de votre invitation IA"
        description="Rendu proche de l’éditeur. Vous pourrez tout ajuster dans le studio."
        size="lg"
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
            <Button type="button" onClick={continueToStudio} rightIcon={<ArrowRight className="w-4 h-4" />}>
              {user ? 'Éditer dans le studio' : 'Continuer et éditer'}
            </Button>
          </div>
        }
      >
        {previewTemplate ? (
          <div className="rounded-2xl border border-border overflow-hidden bg-surface-muted/40">
            <LandingInvitationPreview
              template={previewTemplate}
              className="!max-h-[min(70vh,640px)]"
            />
          </div>
        ) : null}
      </Modal>

      <AiTokenPurchaseModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onSuccess={() => setAllowance(getAiSimulationAllowance())}
      />
    </section>
  );
}
