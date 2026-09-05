'use client';

import React, { useRef, useState } from 'react';
import { Loader2, Upload, Wand2, XCircle } from 'lucide-react';
import {
  AI_ROOM_PLAN_TOKEN_COST,
  canAffordAiAction,
  getAiSimulationAllowance,
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
import type { RoomPlanPromptModel } from '@/config/roomPlanPromptModels';
import { AiRoomPlanFullscreenLoader } from '@/components/AiComposeFullscreenLoader';
import RoomPlanPromptSelector from '@/components/RoomPlanPromptSelector';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import { Alert, Button, Modal } from '@/components/ui';
import { uploadImageFile } from '@/lib/cloudinaryUpload';
import { cn } from '@/lib/cn';

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
      onApplied({ blueprint: applied.blueprint, warnings: applied.warnings, draft: result.draft });
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

  const applyPreset = (model: RoomPlanPromptModel) => {
    setPrompt(model.prompt);
    setIntent('brief');
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
            onChange={(event) => {
              pickFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />

          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode du studio">
            <button
              type="button"
              role="radio"
              aria-checked={intent === 'brief'}
              disabled={busy}
              onClick={() => setIntent('brief')}
              className={cn(
                'min-h-11 px-3 py-2.5 rounded-xl border text-left',
                intent === 'brief' ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <span className="block text-xs font-bold text-foreground">Décrire</span>
              <span className="block text-[11px] text-muted">Brief seul</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={intent === 'photo'}
              disabled={busy}
              onClick={() => setIntent('photo')}
              className={cn(
                'min-h-11 px-3 py-2.5 rounded-xl border text-left',
                intent === 'photo' ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <span className="block text-xs font-bold text-foreground">Photo</span>
              <span className="block text-[11px] text-muted">Analyser et importer</span>
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="w-full min-h-11 rounded-xl border-2 border-dashed border-primary/25 p-3 text-sm font-semibold text-foreground"
          >
            <Upload className="w-4 h-4 text-primary-solid inline mr-2" aria-hidden />
            {file ? file.name : 'Ajouter une photo (optionnel)'}
          </button>

          {previewUrl ? (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Photo à analyser" className="w-full h-full object-cover" />
              <button
                type="button"
                disabled={busy}
                onClick={() => setPhoto(null)}
                className="absolute top-0 right-0 min-w-11 min-h-11 inline-flex items-center justify-center"
                aria-label="Retirer la photo"
              >
                <XCircle className="w-4 h-4 text-foreground" aria-hidden />
              </button>
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Brief</span>
            <textarea
              rows={4}
              maxLength={1500}
              value={prompt}
              disabled={busy}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex. Banquet 80 personnes, 10 tables rondes, scène et piste…"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-h-[6rem]"
            />
          </label>

          <RoomPlanPromptSelector onSelect={applyPreset} selectedPrompt={prompt} disabled={busy} />

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              leftIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            >
              {busy ? 'Composition…' : `Générer (${AI_ROOM_PLAN_TOKEN_COST} jetons)`}
            </Button>
          </div>
        </div>
      </Modal>
      <AiRoomPlanFullscreenLoader active={busy} hasPhoto={Boolean(file)} />
      <AiTokenPurchaseModal open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} />
    </>
  );
}
