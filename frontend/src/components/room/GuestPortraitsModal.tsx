'use client';

import React, { useState } from 'react';
import { ImagePlus, Trash2, UserRound } from '@/components/icons';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { cropImageToDataUrl, readImageFile } from '@/lib/imageCropUtils';
import { dataUrlToFile, uploadImageFile } from '@/lib/cloudinaryUpload';
import {
  GUEST_STYLE_LABELS,
  MAX_GUEST_PORTRAITS,
  PORTRAIT_OUTFIT_COLORS,
  type GuestPortrait,
  type GuestSeat,
  type GuestStyle,
} from '@/lib/roomGuestSimulation';

/**
 * Photo d'une personne prête pour son avatar : recadrée en carré sur le haut de
 * l'image (là où se trouve le visage sur un portrait), réduite, puis hébergée.
 * Sans hébergement disponible, l'image réduite est gardée dans le plan.
 */
export async function preparePortraitPhoto(file: File): Promise<string> {
  const source = await readImageFile(file);
  const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    img.onerror = () => reject(new Error('image'));
    img.src = source;
  });
  const side = Math.min(size.w, size.h);
  const crop = {
    x: (size.w - side) / 2 / size.w,
    // Portrait vertical : le visage est dans le tiers haut.
    y: size.h > size.w ? ((size.h - side) * 0.2) / size.h : 0,
    w: side / size.w,
    h: side / size.h,
  };
  const square = await cropImageToDataUrl(source, crop, 320);
  try {
    const uploaded = await uploadImageFile(dataUrlToFile(square, 'invite.jpg'));
    if (uploaded?.url) return uploaded.url;
  } catch {
    /* hébergement indisponible : image réduite intégrée au plan */
  }
  return square;
}

const FIELD =
  'min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

/** Nom modifiable sans créer une étape d'historique à chaque lettre : validé en quittant le champ. */
function NameField({ value, onCommit, label }: { value: string; onCommit: (name: string) => void; label: string }) {
  const [draft, setDraft] = useState(value);
  const [source, setSource] = useState(value);
  if (source !== value) {
    setSource(value);
    setDraft(value);
  }
  const commit = () => {
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };
  return (
    <input
      type="text"
      value={draft}
      maxLength={60}
      placeholder="Nom de la personne"
      aria-label={label}
      className={FIELD}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export interface GuestPortraitsModalProps {
  open: boolean;
  onClose: () => void;
  portraits: GuestPortrait[];
  seats: GuestSeat[];
  /** Ajoute une personne à partir d'une photo (recadrage, envoi, choix de la place). */
  onAdd: (file: File) => Promise<void>;
  onUpdate: (id: string, patch: Partial<GuestPortrait>, message: string) => void;
  onRemove: (id: string) => void;
  /** Envoi d'une photo en cours. */
  busy?: boolean;
  error?: string;
}

/**
 * Invités personnalisés : chaque personne a sa photo (posée sur le visage de
 * son avatar en 3D), son nom, sa place et sa tenue. Enregistré avec le plan.
 */
export default function GuestPortraitsModal({
  open,
  onClose,
  portraits,
  seats,
  onAdd,
  onUpdate,
  onRemove,
  busy = false,
  error,
}: GuestPortraitsModalProps) {
  const taken = new Map(portraits.map((p) => [p.seatKey, p.id]));
  const seatLabel = new Map(seats.map((s) => [s.key, s.label]));
  const full = portraits.length >= MAX_GUEST_PORTRAITS;
  const noSeat = seats.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Invités avec photo"
      description="Ajoutez la photo d’une personne : son visage apparaît sur son avatar, à sa place, dans la vue 3D. Idéal pour montrer aux mariés ou aux VIP où ils seront installés."
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] px-3.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-primary/40',
              full || noSeat || busy
                ? 'cursor-not-allowed bg-surface-muted text-muted'
                : 'cursor-pointer bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover',
            )}
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
            {busy ? 'Envoi de la photo…' : 'Ajouter une personne'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={full || noSeat || busy}
              aria-label="Ajouter une personne : choisir sa photo"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) await onAdd(file);
              }}
            />
          </label>
          <span className="text-xs text-muted">
            {noSeat
              ? 'Ajoutez d’abord des tables, des rangées ou des chaises au plan.'
              : full
                ? `Maximum ${MAX_GUEST_PORTRAITS} personnes par plan.`
                : `${portraits.length} / ${MAX_GUEST_PORTRAITS} · photo de face, visage bien centré`}
          </span>
        </div>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

        {portraits.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border px-4 py-8 text-center">
            <UserRound className="h-8 w-8 text-muted" aria-hidden />
            <p className="text-sm text-muted">
              Aucune personne pour l’instant. Sélectionnez une table sur le plan avant d’ajouter une photo pour y installer la personne.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {portraits.map((p) => {
              const placed = seatLabel.has(p.seatKey);
              return (
                <li key={p.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-2.5">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- photo locale ou hébergée, déjà réduite */}
                    <img src={p.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-border object-cover" />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <NameField
                        value={p.name}
                        label="Nom de la personne"
                        onCommit={(name) => onUpdate(p.id, { name }, name ? `Invité renommé : ${name}` : 'Nom de l’invité retiré')}
                      />
                      <select
                        value={placed ? p.seatKey : ''}
                        aria-label={`Place de ${p.name || 'la personne'}`}
                        className={cn(FIELD, !placed && 'border-amber-500 text-amber-700 dark:text-amber-300')}
                        onChange={(e) => {
                          const key = e.target.value;
                          const other = taken.get(key);
                          if (other && other !== p.id) return;
                          onUpdate(p.id, { seatKey: key }, `${p.name || 'Invité'} : ${seatLabel.get(key) ?? 'nouvelle place'}`);
                        }}
                      >
                        {!placed ? <option value="">Place supprimée : choisir une place</option> : null}
                        {seats.map((s) => {
                          const owner = taken.get(s.key);
                          const busySeat = Boolean(owner && owner !== p.id);
                          return (
                            <option key={s.key} value={s.key} disabled={busySeat}>
                              {s.label}{busySeat ? ' (occupée)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        value={p.style ?? ''}
                        aria-label={`Tenue de ${p.name || 'la personne'}`}
                        className={FIELD}
                        onChange={(e) => {
                          const style = (e.target.value || undefined) as GuestStyle | undefined;
                          onUpdate(p.id, { style }, `Tenue : ${style ? GUEST_STYLE_LABELS[style] : 'au hasard'}`);
                        }}
                      >
                        <option value="">Tenue au hasard</option>
                        {(Object.keys(GUEST_STYLE_LABELS) as GuestStyle[]).map((s) => (
                          <option key={s} value={s}>{GUEST_STYLE_LABELS[s]}</option>
                        ))}
                      </select>
                      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Couleur de la tenue">
                        {PORTRAIT_OUTFIT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            title={c}
                            aria-label={`Couleur ${c}`}
                            aria-pressed={p.outfit === c}
                            onClick={() => onUpdate(p.id, { outfit: p.outfit === c ? undefined : c }, 'Couleur de tenue modifiée')}
                            className={cn(
                              'h-7 w-7 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                              p.outfit === c ? 'border-foreground ring-2 ring-primary/50' : 'border-border',
                            )}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      aria-label={`Retirer ${p.name || 'cette personne'}`}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] text-muted hover:bg-surface-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted">
          Les photos sont enregistrées avec le plan de salle. Activez « Invités simulés » dans Affichage pour les voir en 3D.
        </p>
      </div>
    </Modal>
  );
}
