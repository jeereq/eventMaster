'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock, Coins, Loader2, Sparkles, Wand2 } from 'lucide-react';
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
import RoomPlanAiComposeForm, { ROOM_SCENARIOS } from '@/components/RoomPlanAiComposeForm';
import { StudioAiTabs, type StudioAiTabId } from '@/components/StudioAiTabs';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import { Alert, Button, Modal } from '@/components/ui';
import { uploadImageFile } from '@/lib/cloudinaryUpload';
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
          <RoomPlanAiComposeForm
            idPrefix="room-ai-studio"
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
            note={`Salle actuelle : ${current.canvas.widthM} × ${current.canvas.heightM} m. Le plan en cours est remplacé ; vous pourrez revenir en arrière avec Annuler (Ctrl+Z).`}
          />
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
