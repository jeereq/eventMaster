'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, Wand2, XCircle, Coins, Users } from 'lucide-react';
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

  useEffect(() => {
    if (!open) return;
    setStudioTab('create');
    setAiAllowance(getAiSimulationAllowance());
    void fetchAiRoomPlanComposeHistoryStudio().then(setHistory);
  }, [open]);

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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={intent === 'brief'}
              disabled={busy}
              onClick={() => setIntent('brief')}
              className={cn(
                'min-h-11 px-3 py-2.5 rounded-[var(--radius-card)] border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                intent === 'brief' ? 'border-primary bg-primary/10 font-bold' : 'border-border bg-surface hover:bg-surface-muted',
              )}
            >
              <span className="block text-xs text-foreground">1. Décrire par écrit</span>
              <span className="hidden sm:block text-[11px] text-muted">Brief ou inspiration</span>
            </button>
            <button
              type="button"
              aria-pressed={intent === 'photo'}
              disabled={busy}
              onClick={() => setIntent('photo')}
              className={cn(
                'min-h-11 px-3 py-2.5 rounded-[var(--radius-card)] border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                intent === 'photo' ? 'border-primary bg-primary/10 font-bold' : 'border-border bg-surface hover:bg-surface-muted',
              )}
            >
              <span className="block text-xs text-foreground">2. Importer une photo</span>
              <span className="hidden sm:block text-[11px] text-muted">Plan 2D ou photo de salle</span>
            </button>
          </div>

          <p className="hidden sm:block text-xs text-muted">
            Inspirations prêtes à coller : onglet{' '}
            <button type="button" className="font-bold text-primary hover:underline" onClick={() => setStudioTab('prompts')}>
              Prompts
            </button>
            .
          </p>

          {/* Jauge rapide de convives */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-xs text-muted font-semibold flex items-center gap-1 mr-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              Capacité :
            </span>
            {CAPACITY_PRESETS.map((cap) => (
              <button
                key={cap}
                type="button"
                disabled={busy}
                onClick={() => applyCapacity(cap)}
                className="px-2.5 py-0.5 text-xs font-semibold rounded-full border border-border hover:border-primary/50 hover:bg-primary/10 text-foreground transition bg-surface"
              >
                {cap} places
              </button>
            ))}
          </div>

          {/* Zone de glisser-déposer de photo */}
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
            onClick={() => fileRef.current?.click()}
            className={cn(
              'w-full min-h-16 rounded-[var(--radius-card)] border-2 border-dashed p-3 text-left transition cursor-pointer flex items-center justify-between gap-3',
              isDraggingOver
                ? 'border-primary bg-primary/15'
                : 'border-border hover:border-primary/50 hover:bg-surface-muted/40 bg-surface',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {file ? file.name : 'Ajouter ou glisser une photo / plan de salle'}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo · Fichier sélectionné`
                    : 'JPEG, PNG ou WebP jusqu’à 8 Mo. L’IA détecte les murs, tables et décors.'}
                </p>
              </div>
            </div>
            {previewUrl ? (
              <div
                className="relative w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Photo à analyser" className="w-full h-full object-cover" />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPhoto(null)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 text-white rounded-full hover:bg-black"
                  aria-label="Retirer la photo"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Brief d’aménagement</span>
              <span className="text-xs text-muted font-mono">
                {prompt.length}/1500 car. · {prompt.trim().split(/\s+/).filter(Boolean).length} mot{prompt.trim().split(/\s+/).filter(Boolean).length > 1 ? 's' : ''}
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={1500}
              value={prompt}
              disabled={busy}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex. Banquet 80 personnes, 10 tables rondes, scène et piste au centre…"
              className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-h-[5rem] resize-y"
            />
          </label>

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

          {error && studioTab === 'create' ? <Alert variant="error">{error}</Alert> : null}

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
      </Modal>
      <AiRoomPlanFullscreenLoader active={busy} hasPhoto={Boolean(file)} />
      <AiTokenPurchaseModal open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} />
    </>
  );
}
