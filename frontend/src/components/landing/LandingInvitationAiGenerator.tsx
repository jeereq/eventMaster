'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coins,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  XCircle,
  ArrowRight,
  Type,
  Eye,
  Palette,
  ChevronDown,
  ChevronUp,
  History,
  Undo2,
  Redo2,
  Clock,
  Download,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  getAiSimulationAllowance,
  syncDeviceAiTokensWithBackend,
  canAffordAiAction,
  AI_INVITATION_COMPOSE_TOKEN_COST,
  type AiAllowance,
} from '@/lib/aiTokens';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import {
  composeTemplateWithAiPublic,
  saveAiTemplateDraft,
  downloadAiGeneratedImage,
  generatedImageUrlFromContent,
  type TemplateAiComposeContent,
  type TemplateAiComposeResult,
} from '@/lib/templateAiCompose';
import AiComposeFullscreenLoader from '@/components/AiComposeFullscreenLoader';
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
  const [studioIntent, setStudioIntent] = useState<'create' | 'clone'>('create');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historySubTab, setHistorySubTab] = useState<'generations' | 'actions'>('generations');
  const [actionHistory, setActionHistory] = useState<FormActionItem[]>([]);
  const [coverFitMode, setCoverFitMode] = useState<'cover' | 'contain'>('cover');
  const generationSeq = useRef(0);

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
  const [embedText, setEmbedText] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
  const generatedImageUrl = useMemo(() => generatedImageUrlFromContent(result), [result]);
  const resultEmbedText = Boolean(
    result?.global && typeof result.global === 'object' && (result.global as Record<string, unknown>).aiEmbedText,
  );

  const handleDownloadGenerated = async () => {
    if (!generatedImageUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadAiGeneratedImage(generatedImageUrl);
    } finally {
      setDownloading(false);
    }
  };

  const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const addFiles = (list: File[]) => {
    const validImages = list.filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type)).slice(0, 4);
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
    logAction(
      'upload',
      studioIntent === 'clone' ? 'Carte ajoutée' : 'Photos ajoutées',
      studioIntent === 'clone'
        ? `${validImages.length} vue(s) de la carte à cloner`
        : `${validImages.length} photo(s) de visages`,
    );
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

  const switchIntent = (next: 'create' | 'clone') => {
    if (next === studioIntent) return;
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setStudioIntent(next);
    setError('');
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

  const requestGenerate = () => {
    if (busy) return;
    if (prompt.trim().length < 8) {
      setError(
        studioIntent === 'clone'
          ? 'Décrivez ce qu’il faut reprendre de la carte (or, date, noms…).'
          : 'Décrivez la fête en quelques mots (ambiance, couleurs, lieu).',
      );
      return;
    }
    if (studioIntent === 'clone' && files.length === 0) {
      setError('Ajoutez une photo nette de la carte à cloner.');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Vous semblez hors ligne. Vérifiez votre connexion puis réessayez.');
      return;
    }
    if (!canAffordAiAction(allowance, AI_INVITATION_COMPOSE_TOKEN_COST)) {
      setError(
        `Cette création utilise ${AI_INVITATION_COMPOSE_TOKEN_COST} jetons. Solde actuel : ${allowance.totalRemaining}.`,
      );
      setTokenModalOpen(true);
      return;
    }
    setError('');
    setConfirmOpen(true);
  };

  const cancelGenerate = () => {
    generationSeq.current += 1;
    setBusy(false);
    setStage(null);
    setActiveStep(0);
  };

  const handleGenerate = async () => {
    if (busy) return;
    if (prompt.trim().length < 8) {
      setError(
        studioIntent === 'clone'
          ? 'Décrivez ce qu’il faut reprendre de la carte (or, date, noms…).'
          : 'Décrivez la fête en quelques mots (ambiance, couleurs, lieu).',
      );
      return;
    }
    if (studioIntent === 'clone' && files.length === 0) {
      setError('Ajoutez une photo nette de la carte à cloner.');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Vous semblez hors ligne. Vérifiez votre connexion puis réessayez.');
      return;
    }
    if (!canAffordAiAction(allowance, AI_INVITATION_COMPOSE_TOKEN_COST)) {
      setError(
        `Cette création utilise ${AI_INVITATION_COMPOSE_TOKEN_COST} jetons. Solde actuel : ${allowance.totalRemaining}.`,
      );
      setTokenModalOpen(true);
      return;
    }

    const seq = ++generationSeq.current;
    setError('');
    setBusy(true);
    setResult(null);
    setLastStageMeta(null);
    setActiveHistoryId(null);
    setActiveStep(1);
    setStage(
      studioIntent === 'clone'
        ? 'Lecture de la carte à cloner…'
        : files.length
          ? 'Analyse des visages et du brief…'
          : embedText
            ? 'Composition de la carte et de la typographie…'
            : 'Composition de la carte à partir du brief…',
    );
    const tick = window.setTimeout(() => {
      if (seq !== generationSeq.current) return;
      setActiveStep(2);
      setStage(
        embedText
          ? 'Incrustation des textes dans l’image…'
          : 'Création de la nouvelle image…',
      );
    }, 2800);

    try {
      const data = await composeTemplateWithAiPublic({
        prompt: prompt.trim(),
        files,
        embedText,
      });
      if (seq !== generationSeq.current) return;
      setResult(data.content);
      setLastStageMeta(data.stage || null);
      setActiveHistoryId(typeof data.historyId === 'string' ? data.historyId : null);
      setAllowance(getAiSimulationAllowance());
      saveAiTemplateDraft(data.content, prompt.trim());
      void fetchAiTemplateComposeHistory().then(setHistory);
      logAction('generate_success', 'Carte créée', `Invitation composée : « ${prompt.slice(0, 50)}… »`);
      setActiveStep(3);
      setStage(null);
      scrollResultIntoView();
    } catch (err: unknown) {
      if (seq !== generationSeq.current) return;
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
        setError(e?.message || 'Impossible de créer la carte. Réessayez dans un instant.');
      }
      setActiveStep(0);
      setStage(null);
    } finally {
      window.clearTimeout(tick);
      if (seq === generationSeq.current) {
        setBusy(false);
      }
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
    logAction('reset', 'Aperçu retiré', 'Aperçu retiré');
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
        <button
          type="button"
          aria-expanded={false}
          aria-controls={`${id}-body`}
          onClick={() => setIsExpanded(true)}
          className="w-full text-left px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-surface-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary-solid text-primary-foreground inline-flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <Wand2 className="w-5 h-5" aria-hidden />
            </span>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span id={`${id}-title`} className="text-sm sm:text-base font-display font-semibold text-foreground tracking-tight">
                  Invitation
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Carte 9:16
                </span>
              </div>
              <p className="text-xs text-muted truncate max-w-xl">
                Décrivez la fête ou déposez une carte à cloner.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground px-3 py-1.5 rounded-full bg-surface border border-border tabular-nums shadow-2xs"
              title="Jetons IA disponibles"
            >
              <Coins className="w-3.5 h-3.5 text-primary" aria-hidden />
              {allowance.totalRemaining} jeton{allowance.totalRemaining === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1.5 min-h-11 px-3 py-2 rounded-[var(--radius-button)] bg-primary text-primary-foreground text-xs font-semibold">
              Ouvrir
              <ChevronDown className="w-4 h-4" aria-hidden />
            </span>
          </div>
        </button>
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
                    <h2 id={`${id}-title`} className="text-base sm:text-xl font-display font-semibold text-foreground tracking-tight">
                      Créer une invitation
                    </h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Carte 9:16
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Décrivez la fête, ou déposez une carte à reproduire. Les visages restent fidèles aux photos.
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
                {!canAffordAiAction(allowance, AI_INVITATION_COMPOSE_TOKEN_COST) ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setTokenModalOpen(true)}>
                    Recharger
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setIsExpanded(false)}
                  rightIcon={<ChevronUp className="w-4 h-4" />}
                  aria-expanded={true}
                  aria-controls={`${id}-body`}
                  title="Réduire"
                >
                  Réduire
                </Button>
              </div>
            </div>
          </div>

          <div
            id={`${id}-body`}
            className="grid grid-cols-1 xl:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] gap-0 xl:divide-x divide-border"
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

          <div
            role="radiogroup"
            aria-label="Comment créer la carte"
            className="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              role="radio"
              aria-checked={studioIntent === 'create'}
              disabled={busy}
              onClick={() => switchIntent('create')}
              className={cn(
                'min-h-11 px-3 py-2.5 rounded-xl border text-left transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                studioIntent === 'create'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-surface hover:border-primary/40',
              )}
            >
              <span className="block text-xs font-bold text-foreground">Décrire une fête</span>
              <span className="block text-[11px] text-muted mt-0.5">Brief, or, ambiance</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={studioIntent === 'clone'}
              disabled={busy}
              onClick={() => switchIntent('clone')}
              className={cn(
                'min-h-11 px-3 py-2.5 rounded-xl border text-left transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                studioIntent === 'clone'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-surface hover:border-primary/40',
              )}
            >
              <span className="block text-xs font-bold text-foreground">Cloner une carte</span>
              <span className="block text-[11px] text-muted mt-0.5">Photo obligatoire</span>
            </button>
          </div>

          <div className="space-y-4">
              <button
                type="button"
                aria-label={
                  files.length >= 4
                    ? 'Maximum de 4 images atteint'
                    : studioIntent === 'clone'
                      ? 'Ajouter une photo de la carte à cloner (JPEG, PNG ou WebP)'
                      : 'Ajouter jusqu’à 4 photos de visages, optionnel (JPEG, PNG ou WebP)'
                }
                aria-disabled={busy || files.length >= 4}
                aria-controls={previews.length ? `${id}-refs` : undefined}
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
                  'w-full rounded-xl border-2 border-dashed p-4 sm:p-5 text-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  dragOver
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/25 hover:border-primary/50 hover:bg-primary/5',
                  (busy || files.length >= 4) && 'opacity-70 cursor-not-allowed',
                )}
              >
                <Upload className="w-5 h-5 text-primary mx-auto mb-1.5" aria-hidden />
                <p className="text-sm font-bold text-foreground">
                  {studioIntent === 'clone'
                    ? 'Photo de la carte à reproduire'
                    : 'Photos de visages (optionnel)'}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {studioIntent === 'clone'
                    ? 'Une photo nette de l’invitation à cloner. JPEG, PNG ou WebP, jusqu’à 4 vues.'
                    : 'Sans photo : carte depuis le brief. Avec photos : visages conservés (yeux, sourire, joues).'}
                </p>
              </button>

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
                        className="absolute top-0.5 right-0.5 min-w-11 min-h-11 inline-flex items-center justify-center bg-foreground/85 text-background rounded-full opacity-90 hover:opacity-100 disabled:opacity-40 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-xs"
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
                    {studioIntent === 'clone' ? 'Ce qu’il faut reprendre' : 'Décrivez la fête'}
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
                    <span className="text-xs text-muted tabular-nums ml-1" aria-live="polite">
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
                  placeholder={
                    studioIntent === 'clone'
                      ? 'Ex. Reprendre l’or et l’ivoire, garder la date en haut, noms en script…'
                      : 'Ex. Mariage princier, or et ivoire, éclairage naturel, invitation WhatsApp…'
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[5.5rem] disabled:opacity-60"
                />

                <button
                  type="button"
                  role="switch"
                  aria-checked={embedText}
                  disabled={busy}
                  onClick={() => setEmbedText((v) => !v)}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60',
                    embedText
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border bg-surface-muted/40 hover:border-primary/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 w-9 h-5 rounded-full relative shrink-0 transition-colors',
                      embedText ? 'bg-primary' : 'bg-border',
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform',
                        embedText && 'translate-x-4',
                      )}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-foreground">Incruster le texte dans l’image</span>
                    <span className="block text-[11px] text-muted mt-0.5 leading-relaxed">
                      Noms, date et lieu du brief sont dessinés sur la carte.
                    </span>
                  </span>
                </button>

              </div>

              {error ? (
                <Alert variant="error" title="Création interrompue" className="!p-3 text-xs">
                  <p className="break-words">{error}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setError('');
                        requestGenerate();
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

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  onClick={requestGenerate}
                  disabled={busy || prompt.trim().length < 8 || (studioIntent === 'clone' && files.length === 0)}
                  leftIcon={
                    busy ? (
                      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )
                  }
                >
                  {busy ? 'Création…' : `Créer la carte (${AI_INVITATION_COMPOSE_TOKEN_COST} jetons)`}
                </Button>
                {result ? (
                  <Button type="button" variant="secondary" onClick={resetResult} disabled={busy}>
                    Recommencer
                  </Button>
                ) : null}
              </div>

              <details className="rounded-xl border border-border bg-surface-muted/40 open:bg-surface">
                <summary className="min-h-11 px-3.5 py-2.5 text-xs font-bold text-foreground cursor-pointer list-none flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
                    Voir des exemples
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted" aria-hidden />
                </summary>
                <div className="px-3 pb-3">
                  <PromptModelSelector
                    intent={studioIntent}
                    onSelectPrompt={(selected) => {
                      updatePromptWithHistory(selected, 'Exemple de brief appliqué');
                    }}
                    selectedPrompt={prompt}
                    disabled={busy}
                  />
                </div>
              </details>

              <details className="rounded-xl border border-border bg-surface-muted/40 open:bg-surface">
                <summary className="min-h-11 px-3.5 py-2.5 text-xs font-bold text-foreground cursor-pointer list-none flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl">
                  <span className="inline-flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" aria-hidden />
                    Historique
                    {history.length > 0 ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-foreground font-bold">
                        {history.length}
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted" aria-hidden />
                </summary>
                <div className="px-3 pb-3 space-y-3">
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-border text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setHistorySubTab('generations')}
                      className={cn(
                        'flex-1 min-h-11 py-1 px-2.5 rounded-md text-xs transition cursor-pointer',
                        historySubTab === 'generations'
                          ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                          : 'text-muted hover:text-foreground',
                      )}
                    >
                      Cartes ({history.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistorySubTab('actions')}
                      className={cn(
                        'flex-1 min-h-11 py-1 px-2.5 rounded-md text-xs transition cursor-pointer',
                        historySubTab === 'actions'
                          ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                          : 'text-muted hover:text-foreground',
                      )}
                    >
                      Actions ({actionHistory.length})
                    </button>
                  </div>

                  {historySubTab === 'generations' && (
                    <AiTemplateComposeHistoryList
                      items={history}
                      activeId={activeHistoryId}
                      onOpen={openHistoryItem}
                      className="pt-1"
                      listClassName="max-h-72 sm:max-h-80"
                    />
                  )}

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
                                <span className="text-xs text-muted font-mono">{act.time}</span>
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
                                }}
                                className="shrink-0 min-h-11 text-xs font-bold text-primary hover:underline px-2 py-1 rounded bg-primary/10 border border-primary/20"
                                title="Rétablir ce brief"
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
              </details>
            </div>
        </div>

        {/* Preview rail */}
        <aside
          ref={resultRef}
          className="bg-surface-muted/35 p-4 sm:p-6 flex flex-col xl:min-h-[min(80vh,48rem)]"
          aria-live="polite"
        >
          <div className="mb-3">
            <p className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              Votre carte
            </p>
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
                    'flex-1 flex items-center justify-center gap-1.5 min-h-11 px-2 rounded-lg text-xs font-semibold transition touch-manipulation cursor-pointer',
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
                    'flex-1 flex items-center justify-center gap-1.5 min-h-11 px-2 rounded-lg text-xs font-semibold transition touch-manipulation cursor-pointer',
                    previewTab === 'artwork'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted/80',
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  <span>Image seule</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'details'}
                  onClick={() => setPreviewTab('details')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 min-h-11 px-2 rounded-lg text-xs font-semibold transition touch-manipulation cursor-pointer',
                    previewTab === 'details'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted/80',
                  )}
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden />
                  <span>Détails</span>
                </button>
              </div>

              {/* Cadrage : remplir le cadre 9:16 ou voir toute l’image */}
              {(previewTab === 'card' || previewTab === 'artwork') && (
                <div className="flex items-center justify-between px-1 text-[11px] text-muted">
                  <span>Ajustement :</span>
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface">
                    <button
                      type="button"
                      onClick={() => setCoverFitMode('cover')}
                      className={cn(
                        'min-h-11 px-3 rounded text-xs font-semibold transition cursor-pointer',
                        coverFitMode === 'cover' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted hover:text-foreground',
                      )}
                    >
                      Remplir le cadre
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverFitMode('contain')}
                      className={cn(
                        'min-h-11 px-3 rounded text-xs font-semibold transition cursor-pointer',
                        coverFitMode === 'contain' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted hover:text-foreground',
                      )}
                      title="Affiche toute l’image, sans découpe"
                    >
                      Toute l’image
                    </button>
                  </div>
                </div>
              )}

              {/* Vue 1 : Carte d'invitation complète */}
              {previewTab === 'card' && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-2 flex flex-col items-center w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Agrandir la carte"
                >
                  <LandingInvitationPreview
                    template={previewTemplate}
                    showOnlyBackground={resultEmbedText}
                    showCaption={false}
                    fitMode={coverFitMode}
                    aspectRatio="9/16"
                    className="!w-full !max-w-[min(100%,28rem)] xl:!max-w-[min(100%,32rem)] pointer-events-none"
                  />
                </button>
              )}

              {/* Vue 2 : Illustration IA pure (sans texte, pour apprécier le photoréalisme) */}
              {previewTab === 'artwork' && (
                <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-2 flex flex-col items-center space-y-2">
                  <LandingInvitationPreview
                    template={previewTemplate}
                    showOnlyBackground={true}
                    showCaption={!resultEmbedText}
                    fitMode={coverFitMode}
                    aspectRatio="9/16"
                    className="!w-full !max-w-[min(100%,28rem)] xl:!max-w-[min(100%,32rem)]"
                  />
                  <div className="px-2 py-1 text-center">
                    <p className="text-[11px] text-muted">
                      {resultEmbedText
                        ? 'Image finale avec typographie incrustée : noms, date et lieu font partie du visuel.'
                        : 'Image seule, sans textes superposés : visages, or et matières tels que composés.'}
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
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">
                          Couleurs de la carte
                        </span>
                        <span className="text-xs text-muted">Cliquez pour copier</span>
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
                              <span className="text-xs font-mono text-muted group-hover:text-foreground">
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
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        Textes de la carte ({elements.length})
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
                {generatedImageUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleDownloadGenerated()}
                    disabled={downloading}
                    leftIcon={
                      downloading ? (
                        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )
                    }
                    fullWidth
                  >
                    {downloading ? 'Téléchargement…' : 'Télécharger l’image'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-2">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-2xs">
                <Sparkles className="w-6 h-6 text-primary/60" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">Votre carte apparaîtra ici</p>
              <p className="text-xs text-muted leading-relaxed max-w-[16rem]">
                Décrivez la fête ou déposez une carte à cloner, puis créez l’invitation.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Créer la carte"
        description={`Cette création utilise ${AI_INVITATION_COMPOSE_TOKEN_COST} jetons. Les photos servent uniquement à composer votre carte — elles ne sont pas publiées.`}
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                void handleGenerate();
              }}
            >
              Créer la carte
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted leading-relaxed">
          {studioIntent === 'clone'
            ? 'La photo de votre carte guide le rendu. Vous pourrez encore ajuster textes et RSVP ensuite.'
            : 'Le brief et les photos de visages, s’il y en a, composent l’invitation. Vous pourrez tout ajuster ensuite.'}
        </p>
      </Modal>

      <Modal
        open={previewOpen && Boolean(previewTemplate)}
        onClose={() => setPreviewOpen(false)}
        title="Votre invitation"
        description="Même carte, plus grande. Vous pourrez tout ajuster ensuite."
        size="xl"
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
            <Button type="button" onClick={continueToStudio} rightIcon={<ArrowRight className="w-4 h-4" />}>
              {user ? 'Ouvrir dans le studio' : 'Continuer et éditer'}
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
                  <span>Image seule</span>
              </button>
            </div>
            <div className="rounded-2xl border border-border overflow-hidden bg-surface-muted/30 p-2 sm:p-4 flex justify-center">
              <LandingInvitationPreview
                template={previewTemplate}
                showOnlyBackground={previewTab === 'artwork' || resultEmbedText}
                showCaption={previewTab === 'artwork' && !resultEmbedText}
                fitMode={coverFitMode}
                aspectRatio="9/16"
                className="!w-full !max-w-[min(100%,28rem)] sm:!max-w-[min(100%,32rem)] !max-h-[min(82vh,52rem)]"
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

      <AiComposeFullscreenLoader
        active={busy && isExpanded}
        embedText={embedText}
        hasReferences={files.length > 0}
        stageHint={stage}
        onCancel={cancelGenerate}
      />
    </section>
  );
}
