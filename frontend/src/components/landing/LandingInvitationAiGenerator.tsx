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
  Eye,
  Palette,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  History,
  Undo2,
  Redo2,
  ZoomIn,
  Clock,
  RotateCcw,
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
import PromptModelSelector from '@/components/PromptModelSelector';
import type { LandingTemplate } from '@/config/landingTemplates';
import { Button, Modal, Alert } from '@/components/ui';
import { cn } from '@/lib/cn';

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

export interface FormActionItem {
  id: string;
  type: 'upload' | 'remove_image' | 'prompt_change' | 'model_applied' | 'generate_success' | 'restore_history' | 'reset';
  label: string;
  detail?: string;
  time: string;
  snapshotPrompt?: string;
}

export default function LandingInvitationAiGenerator({
  className,
  id = 'generateur-ia',
  defaultExpanded = false,
}: {
  className?: string;
  id?: string;
  defaultExpanded?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState('');
  const [promptHistory, setPromptHistory] = useState<string[]>(['']);
  const [promptHistoryIndex, setPromptHistoryIndex] = useState<number>(0);
  const [formTab, setFormTab] = useState<'form' | 'modeles' | 'historique'>('form');
  const [historySubTab, setHistorySubTab] = useState<'generations' | 'actions'>('generations');
  const [actionHistory, setActionHistory] = useState<FormActionItem[]>([]);
  const [coverFitMode, setCoverFitMode] = useState<'cover' | 'contain'>('cover');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = previews;
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
  const [previewTab, setPreviewTab] = useState<'card' | 'artwork' | 'details'>('card');
  const [copiedColorKey, setCopiedColorKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const logAction = (
    type: FormActionItem['type'],
    label: string,
    detail?: string,
    snapshotPrompt?: string,
  ) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const item: FormActionItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label,
      detail,
      time,
      snapshotPrompt: snapshotPrompt ?? prompt,
    };
    setActionHistory((prev) => [item, ...prev].slice(0, 40));
  };

  const updatePromptWithHistory = (newPrompt: string, logLabel?: string) => {
    setPrompt(newPrompt);
    setPromptHistory((prev) => {
      const next = [...prev.slice(0, promptHistoryIndex + 1), newPrompt].slice(-25);
      setPromptHistoryIndex(next.length - 1);
      return next;
    });
    if (logLabel) {
      logAction('prompt_change', logLabel, newPrompt.slice(0, 60) + (newPrompt.length > 60 ? '…' : ''), newPrompt);
    }
  };

  const handleUndoPrompt = () => {
    if (promptHistoryIndex > 0) {
      const target = promptHistory[promptHistoryIndex - 1];
      setPromptHistoryIndex((i) => i - 1);
      setPrompt(target);
      logAction('prompt_change', 'Annulation (Undo)', target.slice(0, 60), target);
    }
  };

  const handleRedoPrompt = () => {
    if (promptHistoryIndex < promptHistory.length - 1) {
      const target = promptHistory[promptHistoryIndex + 1];
      setPromptHistoryIndex((i) => i + 1);
      setPrompt(target);
      logAction('prompt_change', 'Rétablissement (Redo)', target.slice(0, 60), target);
    }
  };

  const handleCopyColor = (color: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(color);
      setCopiedColorKey(key);
      setTimeout(() => setCopiedColorKey(null), 1800);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkHash = () => {
        if (window.location.hash === `#${id}`) {
          setIsExpanded(true);
        }
      };
      checkHash();
      window.addEventListener('hashchange', checkHash);
      return () => window.removeEventListener('hashchange', checkHash);
    }
  }, [id]);

  useEffect(() => {
    if (files.length > 0 || result || busy || prompt.trim().length > 0) {
      setIsExpanded(true);
    }
  }, [files.length, result, busy, prompt]);

  useEffect(() => {
    void syncDeviceAiTokensWithBackend(api).then(setAllowance).catch(() => {
      setAllowance(getAiSimulationAllowance());
    });
    void fetchAiTemplateComposeHistory().then(setHistory);
  }, []);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const previewTemplate = useMemo(
    () => (result ? contentToLandingTemplate(result, prompt) : null),
    [result, prompt],
  );
  const palette = useMemo(() => paletteFromContent(result), [result]);
  const elements = useMemo(() => elementSummary(result), [result]);

  const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const addFiles = (list: File[]) => {
    const validImages = list.filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type) || f.type.startsWith('image/')).slice(0, 4);
    if (!validImages.length) {
      setError('Format non supporté. Veuillez sélectionner des photos JPEG, PNG ou WebP.');
      return;
    }
    const oversized = validImages.find((f) => f.size > MAX_IMAGE_FILE_SIZE);
    if (oversized) {
      setError(`L’image « ${oversized.name} » dépasse la taille maximale de 10 Mo.`);
      return;
    }
    previews.forEach((url) => URL.revokeObjectURL(url));
    const merged = [...files, ...validImages].slice(0, 4);
    setFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
    setError('');
    logAction('upload', 'Images ajoutées', `${validImages.length} photo(s) de référence téléversée(s)`);
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
    logAction('remove_image', 'Image retirée', `Référence visuelle #${index + 1} retirée`);
  };

  const scrollResultIntoView = () => {
    window.setTimeout(() => {
      const el = resultRef.current;
      if (!el) return;
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    }, 80);
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
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Vous semblez hors ligne. Vérifiez votre connexion puis réessayez.');
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
      logAction('generate_success', 'Génération réussie', `Modèle créé pour le brief : « ${prompt.slice(0, 50)}… »`);
      setActiveStep(3);
      setStage(null);
      scrollResultIntoView();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 402) {
        setTokenModalOpen(true);
        setError(e.message || 'Plus de jetons IA disponibles. Rechargez votre solde pour continuer.');
      } else if (e?.status === 413) {
        setError('Le volume total de vos images est trop lourd. Réduisez la taille ou la résolution de vos photos.');
      } else if (e?.status === 429) {
        setError(e.message || 'Trop de demandes simultanées. Attendez une minute puis réessayez.');
      } else if (e?.status === 503 || e?.status === 504) {
        setError(e.message || 'Le service IA est temporairement saturé. Veuillez réessayer dans quelques instants.');
      } else if (e?.status === 401 || e?.status === 403) {
        setError('Session expirée ou non autorisée pour cette action.');
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setError('Connexion interrompue. Vérifiez votre accès Internet puis réessayez.');
      } else {
        setError(e?.message || 'Impossible de générer le modèle. Réessayez dans un instant.');
      }
      setActiveStep(0);
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
    logAction('reset', 'Réinitialisation', 'Champs et résultat effacés');
  };

  const openHistoryItem = (item: AiTemplateComposeHistoryItem) => {
    if (busy) return;
    if (!item?.content) {
      setError('Impossible de recharger cet élément : données incomplètes ou corrompues.');
      return;
    }
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
    if (item.prompt) {
      setPrompt(item.prompt);
      setPromptHistory((prev) => [...prev, item.prompt!]);
      setPromptHistoryIndex((i) => i + 1);
    }
    saveAiTemplateDraft(item.content, item.prompt || undefined);
    logAction('restore_history', 'Génération rétablie', item.prompt ? item.prompt.slice(0, 50) : 'Modèle');
    setActiveStep(3);
    setError('');
    setStage(null);
    setPreviewOpen(false);
    scrollResultIntoView();
  };

  return (
    <section
      id={id}
      aria-busy={busy}
      aria-labelledby={`${id}-title`}
      className={cn(
        'rounded-[1.25rem] border border-border bg-surface shadow-sm overflow-hidden scroll-mt-20 transition-all duration-300',
        className,
      )}
    >
      {!isExpanded ? (
        /* ─── BANNIÈRE COMPACTE (STUDIO COMPRESSÉ) ─── */
        <div
          role="button"
          tabIndex={0}
          aria-expanded={false}
          aria-controls={`${id}-body`}
          onClick={() => setIsExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(true);
            }
          }}
          className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer hover:bg-surface-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary-solid text-primary-foreground inline-flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <Wand2 className="w-5 h-5" aria-hidden />
            </span>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id={`${id}-title`} className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  Studio IA — Créateur & Clonage d’invitations
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Réalisme 35mm
                </span>
              </div>
              <p className="text-xs text-muted truncate max-w-xl">
                Photos + brief → aperçu personnalisé généré en quelques secondes. Déroulez pour créer ou cloner votre invitation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground px-3 py-1.5 rounded-full bg-surface border border-border tabular-nums shadow-2xs"
              title="Jetons IA disponibles"
            >
              <Coins className="w-3.5 h-3.5 text-primary" aria-hidden />
              {allowance.totalRemaining} jeton{allowance.totalRemaining === 1 ? '' : 's'}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsExpanded(true)}
              rightIcon={<ChevronDown className="w-4 h-4" />}
              aria-expanded={false}
              aria-controls={`${id}-body`}
            >
              Dérouler le Studio IA
            </Button>
          </div>
        </div>
      ) : (
        /* ─── ATELIER COMPLET DÉROULÉ ─── */
        <div className="animate-fade-in">
          <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-border/80 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary-solid text-primary-foreground inline-flex items-center justify-center shadow-sm shrink-0">
                  <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                </span>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 id={`${id}-title`} className="text-base sm:text-xl font-bold text-foreground tracking-tight">
                      Studio IA
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Déroulé
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Images + brief → aperçu éditable. Les visages réels sont fidèlement reproduits à 100%.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground px-3 py-1.5 rounded-full bg-surface border border-border tabular-nums shadow-2xs"
                  title="Jetons IA disponibles (invitations ou simulation)"
                >
                  <Coins className="w-3.5 h-3.5 text-primary" aria-hidden />
                  {allowance.totalRemaining} jeton{allowance.totalRemaining === 1 ? '' : 's'}
                </span>
                {!allowance.canSimulate ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setTokenModalOpen(true)}>
                    Recharger
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsExpanded(false)}
                  rightIcon={<ChevronUp className="w-4 h-4" />}
                  aria-expanded={true}
                  aria-controls={`${id}-body`}
                  title="Réduire le Studio IA"
                >
                  Réduire le Studio
                </Button>
              </div>
            </div>

            <ol className="mt-4 flex flex-wrap gap-2" aria-label="Étapes du studio">
              {STAGE_STEPS.map((step, index) => {
                const done = Boolean(result ? index <= 3 : activeStep > index);
                const isCurrent = busy
                  ? activeStep === index
                  : result
                    ? index === 3
                    : activeStep === index;
                return (
                  <li
                    key={step.id}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition',
                      done && !isCurrent
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : isCurrent
                          ? 'bg-surface border-primary text-foreground'
                          : 'bg-surface-muted/60 border-border text-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px]',
                        done || isCurrent ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted',
                      )}
                    >
                      {done && !isCurrent ? <Check className="w-2.5 h-2.5" /> : index + 1}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ol>
          </div>

          <div
            id={`${id}-body`}
            className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] gap-0 xl:divide-x divide-border"
          >
        {/* Compose */}
        <div className="p-4 sm:p-6 space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />

          {/* Onglets alignés pour maximiser l'espace */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl bg-surface-muted/90 border border-border shadow-2xs"
            role="tablist"
            aria-label="Sections du générateur IA"
          >
            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'form'}
              onClick={() => setFormTab('form')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition touch-manipulation cursor-pointer',
                formTab === 'form'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground hover:bg-surface',
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Formulaire</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'modeles'}
              onClick={() => setFormTab('modeles')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition touch-manipulation cursor-pointer',
                formTab === 'modeles'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground hover:bg-surface',
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modèles de prompt</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'historique'}
              onClick={() => setFormTab('historique')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition touch-manipulation cursor-pointer',
                formTab === 'historique'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground hover:bg-surface',
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique</span>
              {(history.length > 0 || actionHistory.length > 0) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-foreground ml-0.5 font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          {/* ONGLET 1 : FORMULAIRE DE CRÉATION */}
          {formTab === 'form' && (
            <div className="space-y-4 animate-fade-in">
              <div
                role="button"
                tabIndex={busy || files.length >= 4 ? -1 : 0}
                aria-label={
                  files.length >= 4
                    ? 'Maximum de 4 images atteint'
                    : 'Ajouter 1 à 4 images de référence (JPEG, PNG ou WebP)'
                }
                aria-disabled={busy || files.length >= 4}
                aria-controls={previews.length ? `${id}-refs` : undefined}
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
                  if (!busy && files.length < 4) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (busy || files.length >= 4) return;
                  addFiles(Array.from(e.dataTransfer.files || []));
                }}
                className={cn(
                  'rounded-xl border-2 border-dashed p-4 sm:p-5 text-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  dragOver
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/25 hover:border-primary/50 hover:bg-primary/5',
                  (busy || files.length >= 4) && 'opacity-70 cursor-not-allowed',
                )}
              >
                <Upload className="w-5 h-5 text-primary mx-auto mb-1.5" aria-hidden />
                <p className="text-sm font-bold text-foreground">Déposez 1 à 4 photos ou cartes à copier</p>
                <p className="text-xs text-muted mt-0.5">Visages réels à conserver ou carton d’invitation à cloner</p>
              </div>

              {previews.length > 0 && (
                <div id={`${id}-refs`} className="flex flex-wrap gap-2">
                  {previews.map((url, i) => (
                    <div
                      key={url}
                      className="relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-xl overflow-hidden border border-border shadow-xs group"
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
                        className="absolute top-0.5 right-0.5 min-w-8 min-h-8 inline-flex items-center justify-center bg-foreground/85 text-background rounded-full opacity-90 hover:opacity-100 disabled:opacity-40 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-xs"
                        aria-label={`Retirer l’image ${i + 1}`}
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`${id}-brief`} className="text-xs font-bold text-foreground">
                    Brief style ou demande de clonage
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Boutons d'action annuler/rétablir */}
                    <button
                      type="button"
                      disabled={promptHistoryIndex <= 0 || busy}
                      onClick={handleUndoPrompt}
                      className="text-[11px] font-semibold text-muted hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-muted transition disabled:opacity-30"
                      title="Annuler (Undo)"
                      aria-label="Annuler la modification du prompt"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Annuler</span>
                    </button>
                    <button
                      type="button"
                      disabled={promptHistoryIndex >= promptHistory.length - 1 || busy}
                      onClick={handleRedoPrompt}
                      className="text-[11px] font-semibold text-muted hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-muted transition disabled:opacity-30"
                      title="Rétablir (Redo)"
                      aria-label="Rétablir la modification du prompt"
                    >
                      <Redo2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Rétablir</span>
                    </button>
                    <span className="text-[10px] text-muted tabular-nums ml-1" aria-live="polite">
                      {prompt.trim().length}/1500
                    </span>
                  </div>
                </div>

                <textarea
                  id={`${id}-brief`}
                  rows={3}
                  maxLength={1500}
                  value={prompt}
                  disabled={busy}
                  onChange={(e) => updatePromptWithHistory(e.target.value)}
                  placeholder="Ex. Copier fidèlement cette invitation en or et ivoire, ou décrire l’ambiance : mariage princier, éclairage naturel chaleureux…"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[5.5rem] disabled:opacity-60"
                />

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-muted text-[11px]">Besoin d’inspiration ou d’un modèle clé en main ?</span>
                  <button
                    type="button"
                    onClick={() => setFormTab('modeles')}
                    className="font-bold text-primary hover:underline text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Explorer les modèles de prompt →
                  </button>
                </div>
              </div>

              {error ? (
                <Alert variant="error" title="Génération interrompue" className="!p-3 text-xs">
                  <p className="break-words">{error}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setError('');
                        void handleGenerate();
                      }}
                    >
                      Réessayer
                    </Button>
                    {error.toLowerCase().includes('jeton') ? (
                      <Button type="button" size="sm" onClick={() => setTokenModalOpen(true)}>
                        Recharger
                      </Button>
                    ) : null}
                  </div>
                </Alert>
              ) : null}

              {busy ? (
                <div
                  className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 flex items-center gap-3"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0 motion-reduce:animate-none" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground break-words">{stage || 'Génération en cours…'}</p>
                    <p className="text-[11px] text-muted mt-0.5">Environ 20–40 s selon les images.</p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy || !files.length || prompt.trim().length < 8}
                  leftIcon={
                    busy ? (
                      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )
                  }
                >
                  {busy ? 'Génération…' : 'Générer mon modèle'}
                </Button>
                {result ? (
                  <Button type="button" variant="secondary" onClick={resetResult} disabled={busy}>
                    Recommencer
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          {/* ONGLET 2 : MODÈLES DE PROMPTS */}
          {formTab === 'modeles' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-surface-muted/60 border border-border">
                <div className="text-xs text-muted leading-relaxed">
                  <span className="font-bold text-foreground">Choisissez un modèle de prompt :</span> Cliquez sur une carte pour charger instantanément la formule testée (mariages, galas, clonage d'invitation).
                </div>
                {prompt.trim().length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setFormTab('form')}
                    className="shrink-0 text-xs"
                  >
                    Retour au form →
                  </Button>
                )}
              </div>

              <PromptModelSelector
                onSelectPrompt={(selected) => {
                  updatePromptWithHistory(selected, 'Modèle de prompt sélectionné');
                }}
                selectedPrompt={prompt}
                disabled={busy}
              />

              {prompt.trim().length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/25">
                  <p className="text-xs font-semibold text-foreground line-clamp-1 pr-2">
                    ✓ Modèle appliqué dans votre formulaire
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFormTab('form')}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Aller au formulaire
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 3 : HISTORIQUE (GÉNÉRATIONS & JOURNAL D'ACTIONS) */}
          {formTab === 'historique' && (
            <div className="space-y-3 animate-fade-in">
              {/* Sélecteur secondaire de sous-onglet */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistorySubTab('generations')}
                  className={cn(
                    'flex-1 py-1 px-2.5 rounded-md text-xs transition cursor-pointer',
                    historySubTab === 'generations'
                      ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Générations IA ({history.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistorySubTab('actions')}
                  className={cn(
                    'flex-1 py-1 px-2.5 rounded-md text-xs transition cursor-pointer',
                    historySubTab === 'actions'
                      ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Actions récentes ({actionHistory.length})
                </button>
              </div>

              {/* Sous-vue 1 : Générations IA sauvegardées */}
              {historySubTab === 'generations' && (
                <AiTemplateComposeHistoryList
                  items={history}
                  activeId={activeHistoryId}
                  onOpen={(item) => {
                    openHistoryItem(item);
                    setFormTab('form');
                  }}
                  className="pt-1"
                  listClassName="max-h-72 sm:max-h-80"
                />
              )}

              {/* Sous-vue 2 : Journal d'actions de création */}
              {historySubTab === 'actions' && (
                <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain pr-1">
                  {actionHistory.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-xl">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-muted/60" />
                      Aucune action enregistrée pour cette session.
                    </div>
                  ) : (
                    actionHistory.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl border border-border bg-surface shadow-2xs text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{act.label}</span>
                            <span className="text-[10px] text-muted font-mono">{act.time}</span>
                          </div>
                          {act.detail && (
                            <p className="text-[11px] text-muted line-clamp-1 mt-0.5">{act.detail}</p>
                          )}
                        </div>

                        {act.snapshotPrompt && act.snapshotPrompt !== prompt && (
                          <button
                            type="button"
                            onClick={() => {
                              updatePromptWithHistory(act.snapshotPrompt!, 'Rétablissement depuis action');
                              setFormTab('form');
                            }}
                            className="shrink-0 text-[10px] font-bold text-primary hover:underline px-2 py-1 rounded bg-primary/10 border border-primary/20"
                            title="Rétablir ce prompt dans le formulaire"
                          >
                            Rétablir
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview rail */}
        <aside
          ref={resultRef}
          className="bg-surface-muted/35 p-4 sm:p-6 flex flex-col min-h-[22rem] xl:min-h-full"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              Aperçu du résultat
            </p>
            {previewTemplate ? (
              <div className="flex items-center gap-1.5">
                {/* Bouton pour inspecter l'image HD originale sans aucune découpe */}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="text-xs font-bold text-foreground inline-flex items-center gap-1 min-h-9 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-muted touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-2xs"
                  title="Voir l'image cover entière sans aucun texte ni recadrage"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-primary" aria-hidden />
                  <span className="hidden sm:inline">Plein format</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="text-xs font-bold text-primary inline-flex items-center gap-1 min-h-9 px-2.5 rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/20 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden />
                  Agrandir
                </button>
              </div>
            ) : null}
          </div>

          {previewTemplate ? (
            <div className="flex-1 flex flex-col gap-3 min-h-0 animate-fade-in">
              {/* Commutateur de vue à 3 modes */}
              <div
                className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border shadow-2xs"
                role="tablist"
                aria-label="Modes d'aperçu de l'invitation"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'card'}
                  onClick={() => setPreviewTab('card')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition touch-manipulation cursor-pointer',
                    previewTab === 'card'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted/80',
                  )}
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden />
                  <span>Carte</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'artwork'}
                  onClick={() => setPreviewTab('artwork')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition touch-manipulation cursor-pointer',
                    previewTab === 'artwork'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted/80',
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  <span>Cover pure</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'details'}
                  onClick={() => setPreviewTab('details')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition touch-manipulation cursor-pointer',
                    previewTab === 'details'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted/80',
                  )}
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden />
                  <span>Détails</span>
                </button>
              </div>

              {/* Contrôle de cadrage : Cover (remplit 9:16) ou Entière (contain sans rogner) */}
              {(previewTab === 'card' || previewTab === 'artwork') && (
                <div className="flex items-center justify-between px-1 text-[11px] text-muted">
                  <span>Ajustement :</span>
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface">
                    <button
                      type="button"
                      onClick={() => setCoverFitMode('cover')}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer',
                        coverFitMode === 'cover' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted hover:text-foreground',
                      )}
                    >
                      Cover 9:16
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverFitMode('contain')}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer',
                        coverFitMode === 'contain' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted hover:text-foreground',
                      )}
                      title="Affiche 100% de l'image originale sans aucune découpe"
                    >
                      Entière (sans découpe)
                    </button>
                  </div>
                </div>
              )}

              {/* Vue 1 : Carte d'invitation complète */}
              {previewTab === 'card' && (
                <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-2 flex flex-col items-center">
                  <LandingInvitationPreview
                    template={previewTemplate}
                    showOnlyBackground={false}
                    fitMode={coverFitMode}
                    aspectRatio="9/16"
                    className="!w-full !max-w-[320px] sm:!max-w-[340px]"
                  />
                </div>
              )}

              {/* Vue 2 : Illustration IA pure (sans texte, pour apprécier le photoréalisme) */}
              {previewTab === 'artwork' && (
                <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-2 flex flex-col items-center space-y-2">
                  <LandingInvitationPreview
                    template={previewTemplate}
                    showOnlyBackground={true}
                    fitMode={coverFitMode}
                    aspectRatio="9/16"
                    className="!w-full !max-w-[320px] sm:!max-w-[340px]"
                  />
                  <div className="px-2 py-1 text-center">
                    <p className="text-[11px] text-muted">
                      Illustration HD d'origine sans superposition : découvrez la fidélité des visages, le grain 35mm et les dorures.
                    </p>
                  </div>
                </div>
              )}

              {/* Vue 3 : Détails, Palette & Structure */}
              {previewTab === 'details' && (
                <div className="space-y-3 p-3 rounded-2xl border border-border bg-surface shadow-xs">
                  {palette && palette.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          Palette harmonique détectée
                        </span>
                        <span className="text-[10px] text-muted">Cliquez pour copier</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {palette.map((swatch) => {
                          const isCopied = copiedColorKey === swatch.key;
                          return (
                            <button
                              key={swatch.key}
                              type="button"
                              onClick={() => handleCopyColor(swatch.color, swatch.key)}
                              className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-surface-muted/70 hover:bg-surface-muted hover:border-primary/40 transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-xs font-semibold text-foreground cursor-pointer"
                              aria-label={`Copier la couleur ${swatch.key} ${swatch.color}`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-md border border-black/10 dark:border-white/10 shadow-2xs shrink-0"
                                style={{ backgroundColor: swatch.color }}
                              />
                              <span className="capitalize text-[11px]">{swatch.key}</span>
                              <span className="text-[10px] font-mono text-muted group-hover:text-foreground">
                                {isCopied ? '✓ Copié' : swatch.color}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {elements.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                        Éléments d’invitation générés ({elements.length})
                      </span>
                      <ul className="space-y-1 max-h-32 overflow-y-auto overscroll-contain pr-1">
                        {elements.map((el, i) => (
                          <li
                            key={`${el.type}-${i}`}
                            className="flex items-start gap-2 text-[11px] text-muted"
                          >
                            <Type className="w-3 h-3 mt-0.5 text-primary shrink-0" aria-hidden />
                            <span className="min-w-0">
                              <span className="font-bold text-foreground capitalize">{el.type}</span>
                              {el.text ? (
                                <span className="line-clamp-1 break-words"> — {el.text}</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* État de la préparation */}
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
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-2xs">
                <Sparkles className="w-6 h-6 text-primary/60" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">En attente de génération</p>
              <p className="text-xs text-muted leading-relaxed max-w-[16rem]">
                L’invitation complète (fond + textes + RSVP) s’affichera ici, comme dans le catalogue.
              </p>
              <Link
                href="/#simulateur-ia"
                className="text-xs font-semibold text-primary hover:underline min-h-10 inline-flex items-center px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Simulation budget IA →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )}

      {/* Modale d'inspection de l'image originale HD (Lightbox 100% sans découpe) */}
      {previewTemplate && (
        <Modal
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          title="Image Cover originale IA (Plein format)"
          description="Visualisation 100% intégrale de l'illustration en résolution originale, sans rognage ni texte masquant."
          size="xl"
          footer={
            <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:justify-between items-center">
              <span className="text-xs text-muted">
                Format portrait 9:16 • Rendu ultra-réaliste
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setLightboxOpen(false)}>
                  Fermer
                </Button>
                {typeof (previewTemplate?.previewContent?.global as Record<string, unknown>)?.bgImageUrl === 'string' && (
                  <a
                    href={(previewTemplate?.previewContent?.global as Record<string, unknown>).bgImageUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ouvrir en plein écran
                  </a>
                )}
              </div>
            </div>
          }
        >
          <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-black/95 rounded-2xl overflow-hidden min-h-[300px]">
            {typeof (previewTemplate?.previewContent?.global as Record<string, unknown>)?.bgImageUrl === 'string' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(previewTemplate?.previewContent?.global as Record<string, unknown>).bgImageUrl as string}
                alt="Image de couverture originale générée par IA"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <div className="text-white/60 text-xs text-center p-6">
                Aucune image d'arrière-plan détectée.
              </div>
            )}
          </div>
        </Modal>
      )}

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
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-surface-muted/60 border border-border max-w-xs mx-auto w-full">
              <button
                type="button"
                onClick={() => setPreviewTab('card')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer',
                  previewTab === 'card' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground',
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Carte complète</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('artwork')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer',
                  previewTab === 'artwork' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground',
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cover pure</span>
              </button>
            </div>
            <div className="rounded-2xl border border-border overflow-hidden bg-surface-muted/30 p-2 sm:p-4 flex justify-center">
              <LandingInvitationPreview
                template={previewTemplate}
                showOnlyBackground={previewTab === 'artwork'}
                fitMode={coverFitMode}
                aspectRatio="9/16"
                className="!max-h-[min(70vh,640px)] !max-w-[360px]"
              />
            </div>
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
