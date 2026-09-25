'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  LayoutGrid,
  Loader2,
  Wand2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { isProtocolUser, PROTOCOL_CREATIVE_DENIED } from '@/lib/protocolAccess';
import {
  AI_ROOM_PLAN_TOKEN_COST,
  canAffordAiAction,
  aiTokenBalanceLabel,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  type AiAllowance,
} from '@/lib/aiTokens';
import {
  ROOM_PLAN_BRIEF_MIN,
  composeRoomPlanWithAiPublic,
  previewRoomPlanDraft,
  roomPlanFileToDataUrl,
  roomPlanPhotoError,
  saveRoomPlanAiDraft,
  type RoomPlanVisionDraft,
} from '@/lib/roomPlanAi';
import { roomTypeLabels, type RoomLayoutBlueprint, type RoomType } from '@/lib/roomLayoutUtils';
import type { RoomPlanPromptModel } from '@/config/roomPlanPromptModels';
import { AiRoomPlanFullscreenLoader } from '@/components/AiComposeFullscreenLoader';
import AiRoomPlanComposeHistoryList from '@/components/AiRoomPlanComposeHistoryList';
import {
  fetchAiRoomPlanComposeHistory,
  type AiRoomPlanComposeHistoryItem,
} from '@/lib/aiRoomPlanComposeHistory';
import RoomPlanPromptSelector from '@/components/RoomPlanPromptSelector';
import RoomPlanAiComposeForm from '@/components/RoomPlanAiComposeForm';
import {
  StudioAiTabs,
  StudioHowTo,
  StudioToolbar,
  studioActionBarClass,
  type StudioAiTabId,
} from '@/components/StudioAiTabs';
import PlanViewModeToggle from '@/components/PlanViewModeToggle';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import { Alert, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { playAiGenerationCompleteSound, unlockAudioNotifications } from '@/lib/audioNotifications';
import { isStudioJobAccepted, onStudioJob } from '@/lib/studioJobs';
import { useStudioJobs, useStudioLoaderOverlay } from '@/context/StudioJobsContext';

const ROOM_TYPES: RoomType[] = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];
/** Types proposés au choix dans le studio (le type libre reste accessible via l’éditeur). */
const PICKABLE_ROOM_TYPES: RoomType[] = ['BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'SIMPLE'];
const STUDIO_STEPS = ['Décrire la salle', 'Générer', 'Explorer le plan'];

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[280px] bg-surface-muted animate-pulse motion-reduce:animate-none rounded-[var(--radius-card)]" />
  ),
});

export default function LandingRoomPlanAiStudio({
  id = 'studio-ia',
  defaultExpanded = false,
  lockExpanded = false,
  inline = false,
  onBlueprintChange,
  className,
}: {
  id?: string;
  defaultExpanded?: boolean;
  /** Toujours ouvert (ex. dans une modale) — pas de bandeau compact ni de « Réduire » */
  lockExpanded?: boolean;
  /** Posé directement dans une page (pas dans une modale) : barres collantes adaptées au site. */
  inline?: boolean;
  onBlueprintChange?: (blueprint: RoomLayoutBlueprint | null) => void;
  className?: string;
}) {
  const { user, access } = useAuth();
  const { trackJob } = useStudioJobs();
  const { runningJob: roomStudioJob, isHidden: roomLoaderHidden, hideOverlay: hideRoomLoader, showOverlay: showRoomLoader } = useStudioLoaderOverlay('room');
  const { site } = usePlatformSite();
  const isRoomBlocked = site?.studioVisibility?.room === false;
  const protocolLocked = isProtocolUser(access);
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded || lockExpanded);
  const showExpanded = lockExpanded || expanded;
  const [intent, setIntent] = useState<'brief' | 'photo'>('brief');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [roomType, setRoomType] = useState<RoomLayoutBlueprint['roomType']>('BANQUET');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<RoomPlanVisionDraft | null>(null);
  const [force2d, setForce2d] = useState(true);
  const [allowance, setAllowance] = useState<AiAllowance>(() => createEmptyAiAllowance());
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [lastImageUrl, setLastImageUrl] = useState<string>();
  const [history, setHistory] = useState<AiRoomPlanComposeHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [studioTab, setStudioTab] = useState<StudioAiTabId>('create');

  useEffect(() => {
    void fetchAiRoomPlanComposeHistory().then(setHistory);
  }, []);

  useEffect(() => {
    setAllowance(getAiSimulationAllowance());
  }, []);

  useEffect(() => {
    return onStudioJob((job) => {
      if (job.kind !== 'room' || job.status !== 'done') return;
      const draft = job.result?.draft as RoomPlanVisionDraft | undefined;
      if (!draft) return;
      setDraft(draft);
      setActiveHistoryId(typeof job.historyId === 'string' ? job.historyId : null);
      setAllowance(getAiSimulationAllowance());
      saveRoomPlanAiDraft(draft, { prompt: job.prompt, roomType, widthM: 20, heightM: 16 });
      void fetchAiRoomPlanComposeHistory().then(setHistory);
      const applied = previewRoomPlanDraft(draft, roomType);
      onBlueprintChange?.(applied.blueprint);
    });
  }, [onBlueprintChange, roomType]);

  const currentStep = busy || roomStudioJob ? 1 : draft ? 2 : 0;

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
    if (protocolLocked) {
      setError(PROTOCOL_CREATIVE_DENIED);
      return;
    }
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
    unlockAudioNotifications();
    showRoomLoader();
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
      if (isStudioJobAccepted(result)) {
        trackJob(result.jobId, 'room', prompt.trim());
        return;
      }
      setDraft(result.draft);
      setLastImageUrl(imageUrl);
      setActiveHistoryId(typeof result.historyId === 'string' ? result.historyId : null);
      setAllowance(getAiSimulationAllowance());
      saveRoomPlanAiDraft(result.draft, { prompt: prompt.trim(), roomType, widthM: 20, heightM: 16, imageUrl });
      void fetchAiRoomPlanComposeHistory().then(setHistory);
      const applied = previewRoomPlanDraft(result.draft, roomType, { imageUrl });
      onBlueprintChange?.(applied.blueprint);
      playAiGenerationCompleteSound();
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
    if (protocolLocked) {
      setError(PROTOCOL_CREATIVE_DENIED);
      return;
    }
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
    setStudioTab('create');
  };

  if (isRoomBlocked) {
    return (
      <section
        id={id}
        aria-label="Studio Plans de Salle 3D IA - Fonctionnalité à venir"
        className={cn(
          'rounded-[var(--radius-card)] border border-amber-500/30 bg-surface p-6 sm:p-8 space-y-5 text-center shadow-xs',
          className,
        )}
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
          <Clock className="w-7 h-7" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Fonctionnalité à venir
          </span>
          <h3 className="text-lg font-bold text-foreground">
            Studio Plans de Salle 2D / 3D IA
          </h3>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            La composition automatique d’aménagement de salle à partir d’une photo ou d’un brief par intelligence artificielle est actuellement en préparation ou masquée par l’administration. Elle n’est pas utilisable pour le moment.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-muted/60 border border-border max-w-md mx-auto text-left space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            Ce que proposera cette fonctionnalité prochainement :
          </p>
          <ul className="text-xs text-muted space-y-1.5 list-disc list-inside">
            <li>Reconnaissance de l’espace et cotations automatiques depuis une photo</li>
            <li>Agencement optimisé des tables, estrades, podiums et allées de circulation</li>
            <li>Export immédiat en plan 2D coté et visite 3D immersive</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button href="/plans-3d" variant="primary" size="sm">
            Explorer les plans types 3D
          </Button>
          <Button href="/marketplace" variant="secondary" size="sm">
            Explorer les salles du catalogue
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-busy={busy}
      aria-labelledby={`${id}-title`}
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface overflow-clip scroll-mt-20',
        className,
      )}
    >
      {!showExpanded ? (
        <div>
        <button
          type="button"
          aria-expanded={false}
          aria-controls={`${id}-body`}
          onClick={() => setExpanded(true)}
          className="w-full text-left px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-surface-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="w-10 h-10 rounded-[var(--radius-card)] bg-primary-solid text-primary-foreground inline-flex items-center justify-center shrink-0">
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
              {allowance.unlimited ? 'Illimité' : `${aiTokenBalanceLabel(allowance)} jeton${allowance.totalRemaining === 1 ? '' : 's'}`}
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
        <div className={cn(lockExpanded && 'flex flex-col min-h-0')}>
          {!lockExpanded ? (
          <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-border bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-[var(--radius-card)] bg-primary-solid text-primary-foreground inline-flex items-center justify-center shrink-0">
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
                  {allowance.unlimited ? 'Illimité' : `${aiTokenBalanceLabel(allowance)} jeton${allowance.totalRemaining === 1 ? '' : 's'}`}
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
          ) : (
            <>
              <h2 id={`${id}-title`} className="sr-only">
                Studio IA — plan de salle
              </h2>
              <StudioToolbar
                steps={STUDIO_STEPS}
                current={currentStep}
                allowance={allowance}
                sticky={!inline}
              />
            </>
          )}

          <div id={`${id}-body`} className="grid grid-cols-1 xl:grid-cols-[minmax(20rem,30rem)_minmax(0,1fr)] xl:divide-x divide-border">
            <div className="p-4 sm:p-6 space-y-4 flex flex-col">
              <StudioAiTabs
                value={studioTab}
                onChange={setStudioTab}
                historyCount={history.length}
                disabled={busy}
              />
              {studioTab === 'create' && !lockExpanded ? (
                <StudioHowTo
                  steps={[
                    'Décrivez la salle ou déposez une photo',
                    'Générez le plan (jetons IA)',
                    'Ouvrez-le en 2D / 3D dans l’éditeur',
                  ]}
                />
              ) : null}

              {studioTab === 'create' ? (
              <>
              <RoomPlanAiComposeForm
                idPrefix={id}
                intent={intent}
                onIntentChange={(next) => {
                  setIntent(next);
                  setError('');
                }}
                prompt={prompt}
                onPromptChange={setPrompt}
                file={file}
                previewUrl={previewUrl}
                onPickFile={pickFile}
                onRemovePhoto={() => setPhoto(null)}
                busy={busy}
                error={error}
                onDismissError={() => setError('')}
                onRetry={() => void generate()}
                onRecharge={() => setTokenModalOpen(true)}
                onShowExamples={() => setStudioTab('prompts')}
                beforeBrief={(
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Type de salle</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Type de salle">
                    {PICKABLE_ROOM_TYPES.map((type) => {
                      const selected = roomType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          aria-pressed={selected}
                          disabled={busy}
                          onClick={() => setRoomType(type)}
                          className={cn(
                            'min-h-11 px-3.5 rounded-full border text-xs font-semibold transition touch-manipulation',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                            selected
                              ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                              : 'border-border bg-surface text-foreground hover:border-primary/50',
                          )}
                        >
                          {roomTypeLabels[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
              />

              {protocolLocked ? <Alert variant="info">{PROTOCOL_CREATIVE_DENIED}</Alert> : null}

              <div className={studioActionBarClass(inline)}>
                <Button
                  type="button"
                  className="w-full min-h-11"
                  disabled={protocolLocked || busy}
                  onClick={() => void generate()}
                  leftIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                >
                  {busy ? 'Composition…' : `Générer le plan · ${AI_ROOM_PLAN_TOKEN_COST} jetons`}
                </Button>
                {intent === 'brief' && prompt.trim().length < ROOM_PLAN_BRIEF_MIN ? (
                  <p className="mt-1.5 text-xs text-muted text-center" aria-live="polite">
                    Décrivez la salle en quelques mots pour lancer la génération.
                  </p>
                ) : intent === 'photo' && !file ? (
                  <p className="mt-1.5 text-xs text-muted text-center" aria-live="polite">
                    Ajoutez une photo de la salle pour lancer la génération.
                  </p>
                ) : null}
              </div>
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
                <RoomPlanPromptSelector onSelect={applyPreset} selectedPrompt={prompt} disabled={busy} />
              ) : null}
            </div>

            <div className="p-4 sm:p-6 space-y-3 bg-surface-muted/40 min-h-[320px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-base font-semibold text-foreground inline-flex items-center gap-2">
                  {preview ? (
                    <CheckCircle2 className="w-4 h-4 text-primary-solid" aria-hidden />
                  ) : null}
                  {preview ? 'Votre plan est prêt' : 'Aperçu du plan'}
                </p>
                <PlanViewModeToggle force2d={force2d} onChange={setForce2d} />
              </div>

              <div className="rounded-[var(--radius-card)] border border-border overflow-hidden bg-stage aspect-[16/10] min-h-[260px]">
                {preview ? (
                  <RoomLayoutPreview
                    blueprint={preview.blueprint}
                    quality="showcase"
                    force2d={force2d}
                    onForce2dChange={setForce2d}
                    showDepthControls={false}
                    showMeta={false}
                    allowExpand
                    expandWhen3d
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <span className="w-12 h-12 rounded-2xl bg-stage-elevated text-festive-on-stage inline-flex items-center justify-center">
                      <LayoutGrid className="w-6 h-6" aria-hidden />
                    </span>
                    <p className="text-sm text-stage-foreground/80 max-w-xs">
                      Votre plan apparaîtra ici, en 2D ou en 3D, dès la génération terminée.
                    </p>
                  </div>
                )}
              </div>

              {preview ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-foreground">
                      {preview.blueprint.furniture.length + preview.blueprint.fixtures.length} éléments posés
                    </span>
                    {preview.warnings[0] ? ` · ${preview.warnings[0]}` : ' · ajustez-les librement dans l’éditeur.'}
                  </p>
                  <Button type="button" size="sm" onClick={openEditor} disabled={protocolLocked} className="min-h-11 shrink-0">
                    Ouvrir dans l’éditeur
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <AiRoomPlanFullscreenLoader
        active={!roomLoaderHidden && (busy || Boolean(roomStudioJob))}
        hasPhoto={Boolean(file)}
        stageHint={roomStudioJob ? 'La génération continue même si vous quittez cet écran.' : null}
        onContinueInBackground={hideRoomLoader}
      />
      <AiTokenPurchaseModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onSuccess={() => setAllowance(getAiSimulationAllowance())}
      />
    </section>
  );
}
