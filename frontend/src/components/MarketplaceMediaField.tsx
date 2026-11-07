'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AlertCircle, ChevronLeft, ChevronRight, ImagePlus, Loader2, Play, RotateCcw, Star, Trash2, X,
} from 'lucide-react';
import { uploadMarketplaceMedia } from '@/lib/cloudinaryUpload';
import {
  MARKETPLACE_MAX_PHOTOS,
  MARKETPLACE_MAX_VIDEOS,
  MARKETPLACE_MAX_VIDEO_BYTES,
  isVideoUrl,
  mediaPosterUrl,
} from '@/lib/marketplace';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.heic,.heif,.mov,.mp4,.webm';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Au-delà, la photo est réduite dans le navigateur avant l’envoi (plus rapide sur mobile). */
const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024;
const COMPRESS_MAX_SIDE = 2000;
const IMAGE_TIMEOUT_MS = 3 * 60 * 1000;
const VIDEO_TIMEOUT_MS = 10 * 60 * 1000;

type PendingItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
  status: 'uploading' | 'error';
  error?: string;
};

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

function isHeicFile(file: File) {
  return /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}

/** Réduit une grande photo (JPEG 2000 px). Renvoie le fichier d’origine si ce n’est pas utile ou pas possible. */
async function prepareImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_ABOVE_BYTES || isHeicFile(file) || file.type === 'image/gif') return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, COMPRESS_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function friendlyUploadError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Envoi trop long. Vérifiez la connexion et réessayez.';
  }
  const message = err instanceof Error ? err.message : '';
  if (!message || /joindre le serveur/i.test(message)) return 'Connexion perdue. Réessayez.';
  return message;
}

export default function MarketplaceMediaField({
  urls,
  onChange,
  onUploadingChange,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
  /** Prévient le parent tant qu’un envoi est en cours (pour bloquer l’enregistrement). */
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const urlsRef = useRef(urls);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    urlsRef.current = urls;
    onChangeRef.current = onChange;
  });
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [selectedRaw, setSelected] = useState<number | null>(null);
  const selected = selectedRaw != null && selectedRaw < urls.length ? selectedRaw : null;
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');

  const uploadingCount = pending.filter((item) => item.status === 'uploading').length;
  const videoCount = urls.filter(isVideoUrl).length + pending.filter((item) => item.kind === 'video').length;
  const remainingSlots = MARKETPLACE_MAX_PHOTOS - urls.length - pending.length;

  useEffect(() => {
    onUploadingChange?.(uploadingCount > 0);
  }, [uploadingCount, onUploadingChange]);

  useEffect(() => () => onUploadingChange?.(false), [onUploadingChange]);

  const pushUrl = (url: string) => {
    const next = [...urlsRef.current, url].slice(0, MARKETPLACE_MAX_PHOTOS);
    urlsRef.current = next;
    onChangeRef.current(next);
  };

  const uploadOne = async (item: PendingItem) => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      item.kind === 'video' ? VIDEO_TIMEOUT_MS : IMAGE_TIMEOUT_MS,
    );
    try {
      const file = item.kind === 'image' ? await prepareImage(item.file) : item.file;
      if (item.kind === 'image' && file.size > MAX_IMAGE_BYTES) {
        throw new Error('Photo trop lourde (10 Mo max).');
      }
      const result = await uploadMarketplaceMedia(file, controller.signal);
      if (!result?.url) throw new Error('Le serveur n’a pas renvoyé l’adresse du fichier.');
      pushUrl(result.url);
      URL.revokeObjectURL(item.previewUrl);
      setPending((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err: unknown) {
      const error = friendlyUploadError(err);
      setPending((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error } : p)));
    } finally {
      window.clearTimeout(timer);
    }
  };

  /** Envois l’un après l’autre : plus fiable sur une connexion mobile lente. */
  const enqueue = (items: PendingItem[]) => {
    for (const item of items) {
      queueRef.current = queueRef.current.then(() => uploadOne(item));
    }
  };

  const addFiles = (files: FileList | File[] | null | undefined) => {
    if (!files?.length) return;
    setNotice('');
    const next: PendingItem[] = [];
    const skipped: string[] = [];
    let videosLeft = MARKETPLACE_MAX_VIDEOS - videoCount;
    let slots = remainingSlots;

    for (const file of Array.from(files)) {
      if (slots <= 0) {
        skipped.push(`Limite de ${MARKETPLACE_MAX_PHOTOS} fichiers atteinte.`);
        break;
      }
      const video = isVideoFile(file);
      if (video) {
        if (videosLeft <= 0) {
          skipped.push(`${MARKETPLACE_MAX_VIDEOS} vidéos maximum.`);
          continue;
        }
        if (file.size > MARKETPLACE_MAX_VIDEO_BYTES) {
          skipped.push(`« ${file.name} » dépasse 80 Mo.`);
          continue;
        }
        videosLeft -= 1;
      } else if (!file.type.startsWith('image/') && !isHeicFile(file)) {
        skipped.push(`« ${file.name} » n’est ni une photo ni une vidéo.`);
        continue;
      }
      slots -= 1;
      next.push({
        id: newId(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind: video ? 'video' : 'image',
        status: 'uploading',
      });
    }

    if (skipped.length) setNotice(Array.from(new Set(skipped)).join(' '));
    if (next.length) {
      setPending((prev) => [...prev, ...next]);
      enqueue(next);
    }
  };

  const retry = (id: string) => {
    const item = pending.find((p) => p.id === id);
    if (!item) return;
    const again = { ...item, status: 'uploading' as const, error: undefined };
    setPending((prev) => prev.map((p) => (p.id === id ? again : p)));
    enqueue([again]);
  };

  const dismiss = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const move = (index: number, target: number) => {
    if (target < 0 || target >= urls.length || target === index) return;
    const next = [...urls];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
    setSelected(target);
  };

  const remove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
    setSelected(null);
  };

  const failedCount = pending.filter((item) => item.status === 'error').length;

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={remainingSlots <= 0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'w-full rounded-[var(--radius-card)] border-2 border-dashed px-4 py-6 text-center transition',
          'flex flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface-muted/40 hover:border-primary/50 hover:bg-primary/5',
        )}
      >
        <span className="w-11 h-11 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center">
          <ImagePlus className="w-5 h-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-foreground">
          {remainingSlots <= 0 ? 'Galerie pleine' : 'Ajouter des photos ou vidéos'}
        </span>
        <span className="text-xs text-muted">
          Touchez pour choisir, ou glissez vos fichiers ici. L’envoi est automatique.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {urls.length}/{MARKETPLACE_MAX_PHOTOS} fichiers · la 1<sup>re</sup> photo sert de couverture
        </span>
        <span role="status" aria-live="polite" className={cn(uploadingCount ? 'text-primary font-semibold' : '')}>
          {uploadingCount
            ? `Envoi en cours (${uploadingCount})…`
            : failedCount
              ? `${failedCount} envoi${failedCount > 1 ? 's' : ''} en échec`
              : ''}
        </span>
      </div>

      {urls.length || pending.length ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setSelected(selected === i ? null : i)}
              aria-pressed={selected === i}
              aria-label={`${isVideoUrl(url) ? 'Vidéo' : 'Photo'} ${i + 1}${i === 0 ? ', couverture' : ''}`}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden border bg-surface-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                selected === i ? 'border-primary ring-2 ring-primary' : 'border-border',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaPosterUrl(url)} alt="" className="w-full h-full object-cover" />
              {isVideoUrl(url) ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-5 h-5 text-white fill-white" aria-hidden />
                </span>
              ) : null}
              {i === 0 ? (
                <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 text-[10px] font-semibold bg-primary-solid text-primary-foreground px-1.5 py-0.5 rounded">
                  <Star className="w-2.5 h-2.5 fill-current" aria-hidden /> Couverture
                </span>
              ) : null}
            </button>
          ))}

          {pending.map((item) => (
            <div
              key={item.id}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden border bg-surface-muted',
                item.status === 'error' ? 'border-danger/60' : 'border-border',
              )}
            >
              {item.kind === 'video' ? (
                <span className="absolute inset-0 flex items-center justify-center text-muted">
                  <Play className="w-6 h-6" aria-hidden />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-60"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {item.status === 'uploading' ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/35 text-white text-[11px] font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                  Envoi…
                </span>
              ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 p-1.5 text-center text-white">
                  <AlertCircle className="w-4 h-4" aria-hidden />
                  <span className="text-[10px] leading-tight line-clamp-3">{item.error}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => retry(item.id)}
                      className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-black"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden /> Réessayer
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      aria-label="Retirer ce fichier"
                      className="inline-flex items-center rounded bg-white/25 px-1.5 py-1 text-white"
                    >
                      <X className="w-3 h-3" aria-hidden />
                    </button>
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {selected != null && urls[selected] ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-button)] border border-border bg-surface p-2">
          <span className="text-xs font-semibold text-foreground mr-auto pl-1">
            {isVideoUrl(urls[selected]) ? 'Vidéo' : 'Photo'} {selected + 1}
          </span>
          {selected !== 0 ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => move(selected, 0)} leftIcon={<Star className="w-3.5 h-3.5" />}>
              Couverture
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" aria-label="Déplacer vers la gauche" onClick={() => move(selected, selected - 1)} disabled={selected === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" aria-label="Déplacer vers la droite" onClick={() => move(selected, selected + 1)} disabled={selected >= urls.length - 1}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => remove(selected)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
            Supprimer
          </Button>
        </div>
      ) : urls.length > 1 ? (
        <p className="text-xs text-muted">Touchez une photo pour la déplacer, la mettre en couverture ou la supprimer.</p>
      ) : null}

      <p className="text-[11px] text-muted">
        Photos JPEG, PNG, WebP, HEIC (10 Mo max, réduites automatiquement) · Vidéos MP4, MOV, WebM (80 Mo, {MARKETPLACE_MAX_VIDEOS} max).
      </p>
      {notice ? <p className="text-xs text-danger" role="alert">{notice}</p> : null}
    </div>
  );
}
