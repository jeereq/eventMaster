'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Clock, Coins, ImagePlus, Loader2, PenLine, Sparkles, Upload, Users, Wand2, X } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  AI_ROOM_PLAN_TOKEN_COST,
  canAffordAiAction,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  aiTokenBalanceLabel,
  type AiAllowance,
} from '@/lib/aiTokens';
import type { RoomEditorCapabilities } from '@/lib/roomEditorAccess';
import {
  ROOM_PLAN_BRIEF_MIN,
  ROOM_PLAN_PHOTO_ACCEPT,
  applyRoomPlanVisionDraft,
  composeRoomPlanWithAi,
  roomPlanPhotoError,
  type RoomPlanVisionDraft,
} from '@/lib/roomPlanAi';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import type { LayoutSelectionItem } from '@/lib/roomSelectionUtils';
import type { RoomPlanPromptModel } from '@/config/roomPlanPromptModels';
import { AiRoomPlanFullscreenLoader } from '@/components/AiComposeFullscreenLoader';
import AiRoomPlanComposeHistoryList from '@/components/AiRoomPlanComposeHistoryList';
import {
  fetchAiRoomPlanComposeHistoryStudio,
  type AiRoomPlanComposeHistoryItem,
} from '@/lib/aiRoomPlanComposeHistory';
import RoomPlanPromptSelector from '@/components/RoomPlanPromptSelector';
import { StudioAiTabs, type StudioAiTabId } from '@/components/StudioAiTabs';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import { Alert, Button, Modal } from '@/components/ui';
import { uploadImageFile } from '@/lib/cloudinaryUpload';
import { cn } from '@/lib/cn';
import { playAiGenerationCompleteSound, unlockAudioNotifications } from '@/lib/audioNotifications';
import { isStudioJobAccepted, onStudioJob } from '@/lib/studioJobs';
import { useStudioJobs, useStudioLoaderOverlay } from '@/context/StudioJobsContext';

async function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire l’image.'));
    reader.readAsDataURL(file);
  });
}

const ROOM_SCENARIOS = [
  { label: '💍 Mariage 100 pl.', prompt: 'Mariage princier 100 convives, tables rondes avec chemin d’honneur, piste de danse centrale et estrade d’honneur.' },
  { label: '🥂 Gala VIP 80 pl.', prompt: 'Gala de charité VIP 80 personnes, tables rondes de 8 places, espace cocktail avec mange-debout et estrade.' },
  { label: '🍽️ Bistrot & Lounge', prompt: 'Restaurant bistrot chic avec banquettes confortables le long des murs, tables duo, grand comptoir bar et tabourets.' },
  { label: '🎤 Conférence 120 pl.', prompt: 'Conférence plénière 120 places en rangées amphithéâtre, allée centrale dégagée, pupitre, estrade et écran géant.' },
  { label: '🌿 Plein air & Jardin', prompt: 'Terrasse festive en plein air, parasols, mange-debout, buffet traiteur avec pergola et guirlandes lumineuses.' },
];

const CAPACITY_PRESETS = [50, 80, 100, 150, 200];

export default function RoomPlanAiStudioModal({
  open,
  onClose,
  current,
  caps,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  current: RoomLayoutBlueprint;
  caps: RoomEditorCapabilities;
  onApplied: (result: {
    blueprint: RoomLayoutBlueprint;
    warnings: string[];
    draft: RoomPlanVisionDraft;
    selection: LayoutSelectionItem[];
  }) => void;
}) {
  const { site } = usePlatformSite();
  const { trackJob } = useStudioJobs();
  const { runningJob: roomStudioJob, isHidden: roomLoaderHidden, hideOverlay: hideRoomLoader, showOverlay: showRoomLoader } = useStudioLoaderOverlay('room');
  const isRoomBlocked = site?.studioVisibility?.room === false;
  const fileRef = useRef<HTMLInputElement>(null);
  const [intent, setIntent] = useState<'brief' | 'photo'>('brief');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [history, setHistory] = useState<AiRoomPlanComposeHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [studioTab, setStudioTab] = useState<StudioAiTabId>('create');
  const [aiAllowance, setAiAllowance] = useState<AiAllowance>(createEmptyAiAllowance);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const currentRef = useRef(current);
  const capsRef = useRef(caps);
  currentRef.current = current;
  capsRef.current = caps;

  useEffect(() => {
    if (!open) return;
    setStudioTab('create');
    setAiAllowance(getAiSimulationAllowance());
    void fetchAiRoomPlanComposeHistoryStudio().then(setHistory);
  }, [open]);

  useEffect(() => {
    return onStudioJob((job) => {
      if (job.kind !== 'room' || job.status !== 'done') return;
      const draft = job.result?.draft as RoomPlanVisionDraft | undefined;
      if (!draft) return;
      const applied = applyRoomPlanVisionDraft(currentRef.current, draft, capsRef.current, {});
      onApplied({
        blueprint: applied.blueprint,
        warnings: applied.warnings,
        draft,
        selection: applied.selection,
      });
      if (typeof job.historyId === 'string') setActiveHistoryId(job.historyId);
      void fetchAiRoomPlanComposeHistoryStudio().then(setHistory);
    });
  }, [onApplied]);

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

  const applyCapacity = (capacity: number) => {
    if (!prompt.trim()) {
      setPrompt(`Plan de réception pour ${capacity} personnes, disposition harmonieuse.`);
      return;
    }
    if (/\b\d+\s*(personnes|convives|places|invités)\b/i.test(prompt)) {
      setPrompt(prompt.replace(/\b\d+\s*(personnes|convives|places|invités)\b/i, `${capacity} personnes`));
    } else {
      setPrompt(`${prompt.trim()}, prévu pour ${capacity} personnes.`);
    }
  };

  const generate = async () => {
    if (busy) return;
    if (intent === 'brief' && prompt.trim().length < ROOM_PLAN_BRIEF_MIN) {
      setError('Décrivez la salle en quelques mots.');
      return;
    }
    if (intent === 'photo' && !file) {
      setError('Ajoutez une photo JPEG, PNG ou WebP.');
      return;
    }
    if (!canAffordAiAction(getAiSimulationAllowance(), AI_ROOM_PLAN_TOKEN_COST)) {
      setTokenModalOpen(true);
      setError(`Cette création utilise ${AI_ROOM_PLAN_TOKEN_COST} jetons.`);
      return;
    }

    setError('');
    unlockAudioNotifications();
    showRoomLoader();
    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (file) {
        try {
          const uploaded = await uploadImageFile(file);
          imageUrl = uploaded?.url;
        } catch {
          imageUrl = await readImageFile(file);
        }
      }
      const result = await composeRoomPlanWithAi({
        brief: prompt.trim(),
        imageUrl,
        roomType: current.roomType,
        widthM: current.canvas.widthM,
        heightM: current.canvas.heightM,
      });
      if (isStudioJobAccepted(result)) {
        trackJob(result.jobId, 'room', prompt.trim());
        onClose();
        return;
      }
      const applied = applyRoomPlanVisionDraft(current, result.draft, caps, { imageUrl });
      onApplied({
        blueprint: applied.blueprint,
        warnings: applied.warnings,
        draft: result.draft,
        selection: applied.selection,
      });
      setActiveHistoryId(typeof result.historyId === 'string' ? result.historyId : null);
      void fetchAiRoomPlanComposeHistoryStudio().then(setHistory);
      playAiGenerationCompleteSound();
      onClose();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 402) {
        setTokenModalOpen(true);
      }
      setError(e?.message || 'Impossible de composer le plan.');
    } finally {
      setBusy(false);
    }
  };

  const openHistoryItem = (item: AiRoomPlanComposeHistoryItem) => {
    if (busy) return;
    const applied = applyRoomPlanVisionDraft(current, item.draft, caps, {
      imageUrl: item.imageUrl || undefined,
    });
    setActiveHistoryId(item.id);
    if (item.prompt) setPrompt(item.prompt);
    onApplied({
      blueprint: applied.blueprint,
      warnings: applied.warnings,
      draft: item.draft,
      selection: applied.selection,
    });
    onClose();
  };

  const applyPreset = (model: RoomPlanPromptModel) => {
    setPrompt(model.prompt);
    setIntent('brief');
    setStudioTab('create');
  };

  return (
    <>
      <Modal
        open={open}
        onClose={busy ? () => undefined : onClose}
        title="Studio IA — plan de salle"
        description="Décrivez la salle ou importez une photo. L’IA pose les éléments sur le plan 2D / 3D."
        size="lg"
      >
        {isRoomBlocked ? (
          <div className="rounded-2xl border border-amber-500/30 bg-surface p-6 sm:p-8 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Fonctionnalité à venir
              </span>
              <h3 className="text-base font-bold text-foreground">
                Studio Plans 2D / 3D par IA
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Le concepteur automatique de plan par photo ou brief IA est actuellement masqué par l’administration de la plateforme. Vous pouvez continuer d&apos;aménager votre salle manuellement à l&apos;aide des outils de l&apos;éditeur 2D et 3D.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Fermer et éditer manuellement
              </Button>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
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

          {/* Solde de jetons & statut */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-muted/60 border border-border text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
              <Coins className="w-4 h-4 text-primary" />
              {aiAllowance.unlimited
                ? 'Jetons illimités'
                : `${aiTokenBalanceLabel(aiAllowance)} jeton${aiAllowance.totalRemaining === 1 ? '' : 's'} disponible${aiAllowance.totalRemaining === 1 ? '' : 's'}`}
            </span>
            {!canAffordAiAction(aiAllowance, AI_ROOM_PLAN_TOKEN_COST) ? (
              <button
                type="button"
                onClick={() => setTokenModalOpen(true)}
                className="text-primary font-bold hover:underline"
              >
                <span className="sm:hidden">Recharger</span>
                <span className="hidden sm:inline">Recharger ({AI_ROOM_PLAN_TOKEN_COST} jetons / plan)</span>
              </button>
            ) : (
              <span className="text-muted font-semibold">Coût : {AI_ROOM_PLAN_TOKEN_COST} jetons</span>
            )}
          </div>

          <StudioAiTabs
            value={studioTab}
            onChange={setStudioTab}
            historyCount={history.length}
            disabled={busy}
          />

          {studioTab === 'create' ? (
          <>
          <div role="radiogroup" aria-label="Point de départ" className="grid grid-cols-2 gap-1 p-1 rounded-[var(--radius-card)] bg-surface-muted border border-border">
            {([
              { id: 'brief', label: 'Décrire l’événement', hint: 'Quelques mots suffisent', icon: PenLine },
              { id: 'photo', label: 'Partir d’une photo', hint: 'Photo ou plan de la salle', icon: ImagePlus },
            ] as const).map((option) => {
              const active = intent === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy}
                  onClick={() => {
                    setIntent(option.id);
                    setError('');
                  }}
                  className={cn(
                    'min-h-11 px-3 py-2 rounded-[var(--radius-button)] text-left transition flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    active ? 'bg-surface shadow-[var(--shadow-soft)] text-foreground' : 'text-muted hover:text-foreground',
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary-solid' : '')} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{option.label}</span>
                    <span className="hidden sm:block text-xs text-muted truncate">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {intent === 'photo' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) pickFile(dropped);
              }}
              className={cn(
                'rounded-[var(--radius-card)] border-2 border-dashed transition overflow-hidden',
                isDraggingOver ? 'border-primary bg-primary/10' : 'border-border bg-surface',
              )}
            >
              {previewUrl ? (
                <div className="flex flex-col sm:flex-row gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Photo à analyser" className="w-full sm:w-40 h-32 object-cover rounded-[var(--radius-button)] border border-border" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-semibold text-foreground truncate">{file?.name}</p>
                    <p className="text-xs text-muted">
                      {file ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo` : ''} · l’IA reprend les murs, les tables et le décor visibles.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                        Changer de photo
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setPhoto(null)}>
                        Retirer
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 text-center hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="w-5 h-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-foreground">Glissez une photo ici ou choisissez un fichier</span>
                  <span className="text-xs text-muted">JPEG, PNG ou WebP jusqu’à 8 Mo · photo de la salle ou plan dessiné</span>
                </button>
              )}
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                {intent === 'photo' ? 'Précisions (facultatif)' : 'Votre événement'}
              </span>
              <span className="text-xs text-muted tabular-nums">{prompt.length}/1500</span>
            </span>
            <textarea
              rows={intent === 'photo' ? 2 : 4}
              maxLength={1500}
              value={prompt}
              disabled={busy}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={intent === 'photo'
                ? 'Ex. Garder la scène au fond, 10 tables rondes…'
                : 'Ex. Mariage de 120 invités, tables rondes, piste de danse au centre, estrade d’honneur…'}
              className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
            />
          </label>

          {intent === 'brief' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted font-semibold flex items-center gap-1 mr-0.5">
                  <Users className="w-3.5 h-3.5 text-primary" aria-hidden />
                  Invités
                </span>
                {CAPACITY_PRESETS.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    disabled={busy}
                    onClick={() => applyCapacity(cap)}
                    className="min-h-9 px-2.5 text-xs font-semibold rounded-full border border-border hover:border-primary/50 hover:bg-primary/10 text-foreground transition bg-surface"
                  >
                    {cap}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted font-semibold mr-0.5">Idées</span>
                {ROOM_SCENARIOS.map((sc) => (
                  <button
                    key={sc.label}
                    type="button"
                    disabled={busy}
                    onClick={() => setPrompt(sc.prompt)}
                    aria-pressed={prompt === sc.prompt}
                    className={cn(
                      'min-h-9 px-2.5 text-xs font-semibold rounded-full border transition',
                      prompt === sc.prompt
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border bg-surface hover:border-primary/50 hover:bg-primary/5 text-foreground',
                    )}
                  >
                    {sc.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="min-h-9 px-1 text-xs font-semibold text-primary hover:underline"
                  onClick={() => setStudioTab('prompts')}
                >
                  Plus d’exemples
                </button>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-muted leading-relaxed">
            Salle actuelle : {current.canvas.widthM} × {current.canvas.heightM} m. Le plan en cours est remplacé ; vous pourrez revenir en arrière avec Annuler (Ctrl+Z).
          </p>
          </>
          ) : null}

          {studioTab === 'history' ? (
            <AiRoomPlanComposeHistoryList
              items={history}
              activeId={activeHistoryId}
              onOpen={openHistoryItem}
              listClassName="max-h-[min(28rem,52vh)]"
              showEmpty
              emptyAction={(
                <button
                  type="button"
                  onClick={() => setStudioTab('create')}
                  className="min-h-11 px-3 text-xs font-semibold text-primary hover:underline"
                >
                  Nouveau plan
                </button>
              )}
            />
          ) : null}

          {studioTab === 'prompts' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {ROOM_SCENARIOS.map((sc) => (
                  <button
                    key={sc.label}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPrompt(sc.prompt);
                      setIntent('brief');
                      setStudioTab('create');
                    }}
                    className="min-h-11 px-2.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:border-primary/50 hover:bg-primary/5 text-foreground transition"
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
              <RoomPlanPromptSelector onSelect={applyPreset} selectedPrompt={prompt} disabled={busy} />
            </div>
          ) : null}

          {error && studioTab === 'create' ? (
            <div
              role="alert"
              aria-live="assertive"
              className="p-4 rounded-xl border border-rose-500/50 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ring-1 ring-rose-500/20 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                    Composition interrompue
                  </p>
                  <p className="text-xs text-rose-800 dark:text-rose-200 mt-0.5 leading-relaxed break-words">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {error.toLowerCase().includes('jeton') ? (
                  <Button size="sm" type="button" onClick={() => setTokenModalOpen(true)}>
                    Recharger
                  </Button>
                ) : (
                  <Button size="sm" type="button" disabled={busy} onClick={() => void generate()}>
                    Réessayer
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="p-1 text-muted hover:text-foreground rounded"
                  aria-label="Fermer l'erreur"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose} className="min-h-11">
              Annuler
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              className="min-h-11"
              leftIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            >
              {busy ? 'Composition en cours…' : `Générer le plan (${AI_ROOM_PLAN_TOKEN_COST} jetons)`}
            </Button>
          </div>
        </div>
        )}
      </Modal>
      <AiRoomPlanFullscreenLoader
        active={!roomLoaderHidden && (busy || Boolean(roomStudioJob))}
        hasPhoto={Boolean(file)}
        stageHint={roomStudioJob ? 'La génération continue même si vous quittez cet écran.' : null}
        onContinueInBackground={hideRoomLoader}
      />
      <AiTokenPurchaseModal open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} />
    </>
  );
}
