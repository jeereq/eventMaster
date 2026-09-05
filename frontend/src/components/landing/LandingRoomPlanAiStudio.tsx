'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Coins,
  LayoutGrid,
  Loader2,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  AI_ROOM_PLAN_TOKEN_COST,
  canAffordAiAction,
  getAiSimulationAllowance,
  type AiAllowance,
} from '@/lib/aiTokens';
import {
  ROOM_PLAN_BRIEF_MIN,
  ROOM_PLAN_PHOTO_ACCEPT,
  composeRoomPlanWithAiPublic,
  previewRoomPlanDraft,
  roomPlanFileToDataUrl,
  roomPlanPhotoError,
  saveRoomPlanAiDraft,
  type RoomPlanVisionDraft,
} from '@/lib/roomPlanAi';
import type { RoomLayoutBlueprint, RoomType } from '@/lib/roomLayoutUtils';
import type { RoomPlanPromptModel } from '@/config/roomPlanPromptModels';
import { AiRoomPlanFullscreenLoader } from '@/components/AiComposeFullscreenLoader';
import AiRoomPlanComposeHistoryList from '@/components/AiRoomPlanComposeHistoryList';
import {
  fetchAiRoomPlanComposeHistory,
  type AiRoomPlanComposeHistoryItem,
} from '@/lib/aiRoomPlanComposeHistory';
import RoomPlanPromptSelector from '@/components/RoomPlanPromptSelector';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import { Alert, Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const ROOM_TYPES: RoomType[] = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[280px] bg-surface-muted animate-pulse rounded-[var(--radius-card)]" />
  ),
});

export default function LandingRoomPlanAiStudio({
  id = 'studio-ia',
  defaultExpanded = false,
  onBlueprintChange,
  className,
}: {
  id?: string;
  defaultExpanded?: boolean;
  onBlueprintChange?: (blueprint: RoomLayoutBlueprint | null) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [intent, setIntent] = useState<'brief' | 'photo'>('brief');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [roomType, setRoomType] = useState<RoomLayoutBlueprint['roomType']>('BANQUET');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<RoomPlanVisionDraft | null>(null);
  const [force2d, setForce2d] = useState(false);
  const [allowance, setAllowance] = useState<AiAllowance>(() => getAiSimulationAllowance());
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastImageUrl, setLastImageUrl] = useState<string>();
  const [history, setHistory] = useState<AiRoomPlanComposeHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAiRoomPlanComposeHistory().then(setHistory);
  }, []);

  const asRoomType = (value?: string | null): RoomType => (
    value && ROOM_TYPES.includes(value as RoomType) ? (value as RoomType) : 'BANQUET'
  );

  const preview = useMemo(() => {
    if (!draft) return null;
    return previewRoomPlanDraft(draft, roomType, { imageUrl: lastImageUrl });
  }, [draft, roomType, lastImageUrl]);

  const setPhoto = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : '');
    setFile(next);
  };

  const pickFile = (next: File | undefined) => {
    if (!next) return;
    const problem = roomPlanPhotoError(next);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setPhoto(next);
    setIntent('photo');
  };

  const generate = async () => {
    if (busy) return;
    if (intent === 'brief' && prompt.trim().length < ROOM_PLAN_BRIEF_MIN) {
      setError('Décrivez la salle en quelques mots (mariage, 10 tables, piste…).');
      return;
    }
    if (intent === 'photo' && !file) {
      setError('Ajoutez une photo JPEG, PNG ou WebP de la salle.');
      return;
    }
    if (!canAffordAiAction(allowance, AI_ROOM_PLAN_TOKEN_COST)) {
      setError(`Cette création utilise ${AI_ROOM_PLAN_TOKEN_COST} jetons. Solde : ${allowance.totalRemaining}.`);
      setTokenModalOpen(true);
      return;
    }

    setError('');
    setBusy(true);
    try {
      const imageUrl = file ? await roomPlanFileToDataUrl(file) : undefined;
      const result = await composeRoomPlanWithAiPublic({
        brief: prompt.trim(),
        file,
        roomType,
        widthM: 20,
        heightM: 16,
      });
      setDraft(result.draft);
      setLastImageUrl(imageUrl);
      setActiveHistoryId(typeof result.historyId === 'string' ? result.historyId : null);
      setAllowance(getAiSimulationAllowance());
      saveRoomPlanAiDraft(result.draft, { prompt: prompt.trim(), roomType, widthM: 20, heightM: 16, imageUrl });
      void fetchAiRoomPlanComposeHistory().then(setHistory);
      const applied = previewRoomPlanDraft(result.draft, roomType, { imageUrl });
      onBlueprintChange?.(applied.blueprint);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 402) {
        setTokenModalOpen(true);
        setError(e.message || 'Plus de jetons IA. Rechargez pour continuer.');
      } else {
        setError(e?.message || 'Impossible de composer le plan. Réessayez.');
      }
    } finally {
      setBusy(false);
    }
  };

  const openEditor = () => {
    if (draft) saveRoomPlanAiDraft(draft, { prompt: prompt.trim(), roomType, widthM: 20, heightM: 16, imageUrl: lastImageUrl });
    if (user) {
      router.push('/dashboard/rooms?aiDraft=1');
      return;
    }
    router.push(
      `/register?kind=ORGANIZER&intent=personal&action=room_editor&next=${encodeURIComponent('/dashboard/rooms?aiDraft=1')}`,
    );
  };

  const openHistoryItem = (item: AiRoomPlanComposeHistoryItem) => {
    if (busy) return;
    const nextType = asRoomType(item.roomType);
    const imageUrl = item.imageUrl || undefined;
    setDraft(item.draft);
    setLastImageUrl(imageUrl);
    setActiveHistoryId(item.id);
    setRoomType(nextType);
    if (item.prompt) setPrompt(item.prompt);
    setExpanded(true);
    saveRoomPlanAiDraft(item.draft, {
      prompt: item.prompt || '',
      roomType: nextType,
      widthM: item.widthM || 20,
      heightM: item.heightM || 16,
      imageUrl,
    });
    onBlueprintChange?.(previewRoomPlanDraft(item.draft, nextType, { imageUrl }).blueprint);
  };

  const applyPreset = (model: RoomPlanPromptModel) => {
    setPrompt(model.prompt);
    setRoomType(model.roomType);
    setIntent('brief');
  };

  return (
    <section
      id={id}
      aria-busy={busy}
      aria-labelledby={`${id}-title`}
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden scroll-mt-20',
        className,
      )}
    >
      {!expanded ? (
        <div>
        <button
          type="button"
          aria-expanded={false}
          aria-controls={`${id}-body`}
          onClick={() => setExpanded(true)}
          className="w-full text-left px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-surface-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-primary-solid text-primary-foreground inline-flex items-center justify-center shrink-0">
              <Wand2 className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p id={`${id}-title`} className="text-sm sm:text-base font-display font-semibold text-foreground">
                Studio IA — plan 2D / 3D
              </p>
              <p className="text-xs text-muted truncate">
                Décrivez la salle ou déposez une photo. L’IA pose le mobilier.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground px-3 py-1.5 rounded-full bg-surface border border-border tabular-nums">
              <Coins className="w-3.5 h-3.5 text-primary-solid" aria-hidden />
              {allowance.totalRemaining} jeton{allowance.totalRemaining === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1.5 min-h-11 px-3 py-2 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground text-xs font-semibold">
              Ouvrir
              <ChevronDown className="w-4 h-4" aria-hidden />
            </span>
          </div>
        </button>
        {history.length > 0 ? (
          <div className="px-4 sm:px-6 pb-4">
            <AiRoomPlanComposeHistoryList
              items={history}
              activeId={activeHistoryId}
              onOpen={openHistoryItem}
              listClassName="max-h-56"
            />
          </div>
        ) : null}
        </div>
      ) : (
        <div>
          <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-border bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-primary-solid text-primary-foreground inline-flex items-center justify-center shrink-0">
                  <Wand2 className="w-5 h-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id={`${id}-title`} className="text-base sm:text-xl font-display font-semibold text-foreground">
                    Studio IA — plan de salle
                  </h2>
                  <p className="text-xs sm:text-sm text-muted">
                    Brief ou photo → tables, rangées et décor posés sur le plan 2D / 3D.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground px-3 py-1.5 rounded-full bg-surface border border-border tabular-nums">
                  <Coins className="w-3.5 h-3.5 text-primary-solid" aria-hidden />
                  {allowance.totalRemaining} jeton{allowance.totalRemaining === 1 ? '' : 's'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setExpanded(false)}
                  rightIcon={<ChevronUp className="w-4 h-4" />}
                  aria-expanded
                  aria-controls={`${id}-body`}
                >
                  Réduire
                </Button>
              </div>
            </div>
          </div>

          <div id={`${id}-body`} className="grid grid-cols-1 xl:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] xl:divide-x divide-border">
            <div className="p-4 sm:p-6 space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept={ROOM_PLAN_PHOTO_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-label="Ajouter une photo de la salle"
                onChange={(event) => {
                  pickFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={intent === 'brief'}
                  disabled={busy}
                  onClick={() => setIntent('brief')}
                  className={cn(
                    'min-h-11 px-3 py-2.5 rounded-[var(--radius-card)] border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    intent === 'brief' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="block text-xs font-bold text-foreground">Décrire la salle</span>
                  <span className="block text-xs text-muted mt-0.5">Brief seul</span>
                </button>
                <button
                  type="button"
                  aria-pressed={intent === 'photo'}
                  disabled={busy}
                  onClick={() => setIntent('photo')}
                  className={cn(
                    'min-h-11 px-3 py-2.5 rounded-[var(--radius-card)] border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    intent === 'photo' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="block text-xs font-bold text-foreground">Depuis une photo</span>
                  <span className="block text-xs text-muted mt-0.5">Analyse + import</span>
                </button>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  pickFile(event.dataTransfer.files?.[0]);
                }}
                className={cn(
                  'w-full rounded-[var(--radius-card)] border-2 border-dashed p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  dragOver ? 'border-primary bg-primary/10' : 'border-primary/25 hover:border-primary/50',
                )}
              >
                <Upload className="w-5 h-5 text-primary-solid mx-auto mb-1.5" aria-hidden />
                <p className="text-sm font-bold text-foreground">
                  {intent === 'photo' ? 'Photo de la salle' : 'Photo optionnelle'}
                </p>
                <p className="text-xs text-muted mt-0.5">JPEG, PNG ou WebP, 8 Mo max.</p>
              </button>

              {previewUrl ? (
                <div className="relative w-20 h-20 rounded-[var(--radius-card)] overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Photo de la salle" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPhoto(null)}
                    className="absolute top-0.5 right-0.5 min-w-11 min-h-11 inline-flex items-center justify-center bg-foreground/85 text-background rounded-full"
                    aria-label="Retirer la photo"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor={`${id}-brief`} className="text-xs font-semibold text-foreground">
                  {intent === 'photo' ? 'Précisez ce qu’il faut reprendre' : 'Décrivez la salle'}
                </label>
                <textarea
                  id={`${id}-brief`}
                  rows={4}
                  maxLength={1500}
                  value={prompt}
                  disabled={busy}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Ex. Mariage 120 convives, 12 tables rondes, allée, table d’honneur…"
                  className="w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-h-[6rem]"
                />
                <p className="text-xs text-muted tabular-nums text-right">{prompt.trim().length}/1500</p>
              </div>

              <RoomPlanPromptSelector onSelect={applyPreset} selectedPrompt={prompt} disabled={busy} />

              {error ? <Alert variant="error">{error}</Alert> : null}

              <Button
                type="button"
                className="w-full min-h-11"
                disabled={busy}
                onClick={() => void generate()}
                leftIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              >
                {busy ? 'Composition…' : `Générer (${AI_ROOM_PLAN_TOKEN_COST} jetons)`}
              </Button>

              <AiRoomPlanComposeHistoryList
                items={history}
                activeId={activeHistoryId}
                onOpen={openHistoryItem}
                listClassName="max-h-64 sm:max-h-72"
              />
            </div>

            <div className="p-4 sm:p-6 space-y-3 bg-stage/40 min-h-[320px]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {preview ? 'Aperçu généré' : 'Aperçu 2D / 3D'}
                </p>
                <div className="inline-flex items-center rounded-[var(--radius-button)] border border-border bg-surface p-0.5">
                  <button
                    type="button"
                    aria-pressed={!force2d}
                    aria-label="Aperçu 3D"
                    onClick={() => setForce2d(false)}
                    className={cn(
                      'min-h-11 px-2.5 rounded-[var(--radius-button)] text-xs font-semibold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      !force2d ? 'bg-primary/10 text-foreground' : 'text-muted',
                    )}
                  >
                    <Box className="w-3.5 h-3.5" aria-hidden />
                    3D
                  </button>
                  <button
                    type="button"
                    aria-pressed={force2d}
                    aria-label="Aperçu 2D"
                    onClick={() => setForce2d(true)}
                    className={cn(
                      'min-h-11 px-2.5 rounded-[var(--radius-button)] text-xs font-semibold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      force2d ? 'bg-primary/10 text-foreground' : 'text-muted',
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
                    2D
                  </button>
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border overflow-hidden bg-stage aspect-[16/10] min-h-[260px]">
                {preview ? (
                  <RoomLayoutPreview
                    blueprint={preview.blueprint}
                    quality="showcase"
                    force2d={force2d}
                    showDepthControls={false}
                    showMeta={false}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6 text-center">
                    <p className="text-sm text-muted max-w-sm">
                      Générez un plan : le studio pose les éléments ici, en 2D ou en 3D.
                    </p>
                  </div>
                )}
              </div>

              {preview ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-foreground">
                    {preview.blueprint.furniture.length + preview.blueprint.fixtures.length} éléments
                    {preview.warnings[0] ? ` · ${preview.warnings[0]}` : ''}
                  </p>
                  <Button type="button" size="sm" onClick={openEditor}>
                    Ouvrir dans l’éditeur
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <AiRoomPlanFullscreenLoader active={busy} hasPhoto={Boolean(file)} />
      <AiTokenPurchaseModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onSuccess={() => setAllowance(getAiSimulationAllowance())}
      />
    </section>
  );
}
