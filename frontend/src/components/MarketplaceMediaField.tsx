'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Crop, Play, Star, Trash2, Upload, ImagePlus, X,
} from 'lucide-react';
import { uploadMarketplaceMedia, dataUrlToFile } from '@/lib/cloudinaryUpload';
import {
  MARKETPLACE_MAX_PHOTOS,
  MARKETPLACE_MAX_VIDEOS,
  MARKETPLACE_MAX_VIDEO_BYTES,
  isVideoUrl,
  mediaPosterUrl,
} from '@/lib/marketplace';
import { DEFAULT_IMAGE_CROP, cropImageToDataUrl, readImageFile, type ImageCropRect } from '@/lib/imageCropUtils';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.heic,.heif,.mov,.mp4,.webm';

type StagingItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
  crop: ImageCropRect;
};

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CROP_PRESETS: Array<{ id: string; label: string; crop: ImageCropRect }> = [
  { id: 'full', label: 'Complet', crop: DEFAULT_IMAGE_CROP },
  { id: 'center', label: 'Centre 80 %', crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } },
  { id: 'square', label: 'Carré', crop: { x: 0.1, y: 0, w: 0.8, h: 1 } },
  { id: 'wide', label: '16:9', crop: { x: 0, y: 0.12, w: 1, h: 0.76 } },
];

export default function MarketplaceMediaField({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [staging, setStaging] = useState<StagingItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');

  const active = staging.find((item) => item.id === activeId) || staging[0] || null;
  const coverUrl = urls[0] || null;
  const videoCount = urls.filter(isVideoUrl).length + staging.filter((s) => s.kind === 'video').length;

  useEffect(() => {
    return () => {
      staging.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke leftover object URLs on unmount only
  }, []);

  useEffect(() => {
    if (galleryIndex >= urls.length) setGalleryIndex(Math.max(0, urls.length - 1));
  }, [urls.length, galleryIndex]);

  const remainingSlots = MARKETPLACE_MAX_PHOTOS - urls.length - staging.length;

  const addFiles = (files: FileList | File[] | null | undefined) => {
    if (!files?.length) return;
    setLocalError('');
    const incoming = Array.from(files);
    const next: StagingItem[] = [];
    let skippedVideos = 0;
    let remainingVideos = MARKETPLACE_MAX_VIDEOS - videoCount;
    let slots = remainingSlots;

    for (const file of incoming) {
      if (slots <= 0) break;
      const video = isVideoFile(file);
      if (video) {
        if (remainingVideos <= 0) {
          skippedVideos += 1;
          continue;
        }
        if (file.size > MARKETPLACE_MAX_VIDEO_BYTES) {
          setLocalError(`« ${file.name} » dépasse 80 Mo.`);
          continue;
        }
        remainingVideos -= 1;
      } else if (file.size > 10 * 1024 * 1024) {
        setLocalError(`« ${file.name} » dépasse 10 Mo.`);
        continue;
      }
      slots -= 1;
      next.push({
        id: newId(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind: video ? 'video' : 'image',
        crop: DEFAULT_IMAGE_CROP,
      });
    }

    if (next.length) {
      setStaging((prev) => [...prev, ...next]);
      setActiveId(next[0].id);
    }
    if (skippedVideos) {
      setLocalError(`Maximum ${MARKETPLACE_MAX_VIDEOS} vidéos. ${skippedVideos} fichier(s) ignoré(s).`);
    }
  };

  const removeStaging = (id: string) => {
    setStaging((prev) => {
      const item = prev.find((s) => s.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      const next = prev.filter((s) => s.id !== id);
      setActiveId((current) => (current === id ? next[0]?.id || null : current));
      return next;
    });
  };

  const updateCrop = (key: keyof ImageCropRect, value: number) => {
    if (!active || active.kind !== 'image') return;
    setStaging((prev) =>
      prev.map((item) =>
        item.id === active.id
          ? { ...item, crop: { ...item.crop, [key]: Math.max(0, Math.min(1, value)) } }
          : item,
      ),
    );
  };

  const applyPreset = (crop: ImageCropRect) => {
    if (!active || active.kind !== 'image') return;
    setStaging((prev) => prev.map((item) => (item.id === active.id ? { ...item, crop } : item)));
  };

  const uploadStaging = async () => {
    if (!staging.length) return;
    setUploading(true);
    setLocalError('');
    try {
      const uploaded: string[] = [];
      for (const item of staging) {
        let file = item.file;
        if (item.kind === 'image') {
          const customCrop = item.crop.x !== 0 || item.crop.y !== 0 || item.crop.w !== 1 || item.crop.h !== 1;
          if (customCrop) {
            try {
              const source = await readImageFile(item.file);
              const cropped = await cropImageToDataUrl(source, item.crop, 1600);
              file = dataUrlToFile(cropped, item.file.name.replace(/\.[^.]+$/, '') + '.jpg');
            } catch {
              file = item.file;
            }
          }
        }
        const result = await uploadMarketplaceMedia(file);
        if (!result?.url) throw new Error('Réponse upload invalide.');
        uploaded.push(result.url);
      }
      onChange([...urls, ...uploaded].slice(0, MARKETPLACE_MAX_PHOTOS));
      staging.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setStaging([]);
      setActiveId(null);
      setGalleryIndex(urls.length);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Upload média impossible.');
    } finally {
      setUploading(false);
    }
  };

  const recropExisting = async (url: string, crop: ImageCropRect) => {
    setUploading(true);
    setLocalError('');
    try {
      const cropped = await cropImageToDataUrl(url, crop, 1600);
      const file = dataUrlToFile(cropped, 'media.jpg');
      const result = await uploadMarketplaceMedia(file);
      if (!result?.url) throw new Error('Réponse upload invalide.');
      onChange(urls.map((item) => (item === url ? result.url : item)));
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Impossible de recadrer cette image.');
    } finally {
      setUploading(false);
    }
  };

  const moveUrl = (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= urls.length) return;
    const next = [...urls];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
    setGalleryIndex(nextIndex);
  };

  const currentUrl = urls[galleryIndex];
  const cropPreviewStyle = useMemo(() => {
    if (!active || active.kind !== 'image') return undefined;
    const { x, y, w, h } = active.crop;
    return {
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      width: `${w * 100}%`,
      height: `${h * 100}%`,
    } as React.CSSProperties;
  }, [active]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted mb-1.5">
          Galerie ({urls.length}/{MARKETPLACE_MAX_PHOTOS} · {MARKETPLACE_MAX_VIDEOS} vidéos max)
        </p>
        {urls.length === 0 && staging.length === 0 ? (
          <p className="text-xs text-muted py-2">Aucune photo ni vidéo pour l’instant.</p>
        ) : null}

        {urls.length > 0 && currentUrl ? (
          <div className="space-y-2">
            <div className="relative aspect-[16/9] rounded-[var(--radius-card)] overflow-hidden border border-border bg-black/80">
              {isVideoUrl(currentUrl) ? (
                <video
                  key={currentUrl}
                  src={currentUrl}
                  poster={mediaPosterUrl(currentUrl)}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUrl} alt={`Photo ${galleryIndex + 1} de la galerie`} className="w-full h-full object-contain bg-surface-muted" />
              )}
              {galleryIndex === 0 && (
                <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider bg-primary text-white px-2 py-0.5 rounded-md">
                  Couverture
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="secondary" onClick={() => moveUrl(galleryIndex, -1)} disabled={galleryIndex === 0} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>
                Avant
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => moveUrl(galleryIndex, 1)} disabled={galleryIndex >= urls.length - 1} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                Après
              </Button>
              {galleryIndex !== 0 && (
                <Button type="button" size="sm" variant="secondary" onClick={() => moveUrl(galleryIndex, -galleryIndex)} leftIcon={<Star className="w-3.5 h-3.5" />}>
                  Couverture
                </Button>
              )}
              {!isVideoUrl(currentUrl) && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => void recropExisting(currentUrl, { x: 0.08, y: 0.08, w: 0.84, h: 0.84 })}
                  leftIcon={<Crop className="w-3.5 h-3.5" />}
                >
                  Recadrer
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onChange(urls.filter((_, i) => i !== galleryIndex));
                }}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Retirer
              </Button>
            </div>
          </div>
        ) : null}

        {urls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-2">
            {urls.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setGalleryIndex(i)}
                className={cn(
                  'relative aspect-[4/3] rounded-md overflow-hidden border bg-surface-muted',
                  i === galleryIndex ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaPosterUrl(url)} alt={isVideoUrl(url) ? `Vidéo ${i + 1}` : `Photo ${i + 1}`} className="w-full h-full object-cover" />
                {isVideoUrl(url) && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                  </span>
                )}
                {i === 0 && (
                  <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold bg-primary text-white px-1 rounded">
                    1
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="rounded-[var(--radius-card)] border border-dashed border-border p-3 space-y-3 bg-surface-muted/40"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Prévisualisation avant envoi</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploading || remainingSlots <= 0}
            onClick={() => inputRef.current?.click()}
            leftIcon={<ImagePlus className="w-3.5 h-3.5" />}
          >
            Choisir des fichiers
          </Button>
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
        </div>
        <p className="text-[11px] text-muted">
          Glissez-déposez ici. JPEG, PNG, WebP, HEIC jusqu’à 10 Mo · MP4, WebM, MOV jusqu’à 80 Mo.
          Recadrez les photos puis validez l’envoi.
        </p>

        {staging.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {staging.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={cn(
                  'relative w-16 h-16 shrink-0 rounded-md overflow-hidden border',
                  item.id === active?.id ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
              >
                {item.kind === 'video' ? (
                  <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt={item.file.name || 'Prévisualisation à envoyer'} className="w-full h-full object-cover" />
                )}
                <span
                  className="absolute top-0 right-0 bg-surface/90 text-[10px] px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStaging(item.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        )}

        {active ? (
          <div className="space-y-3">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-black/70">
              {active.kind === 'video' ? (
                <video src={active.previewUrl} controls playsInline className="w-full h-full object-contain" />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={active.previewUrl} alt={active.file.name || 'Prévisualisation à recadrer'} className="w-full h-full object-contain" />
                  <div className="absolute border-2 border-primary bg-primary/20 pointer-events-none" style={cropPreviewStyle} />
                </>
              )}
            </div>
            {active.kind === 'image' && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {CROP_PRESETS.map((preset) => (
                    <Button key={preset.id} type="button" size="sm" variant="ghost" onClick={() => applyPreset(preset.crop)}>
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['x', 'Position X', active.crop.x],
                    ['y', 'Position Y', active.crop.y],
                    ['w', 'Largeur', active.crop.w],
                    ['h', 'Hauteur', active.crop.h],
                  ] as const).map(([key, label, val]) => (
                    <label key={key} className="text-[11px] space-y-1">
                      <span className="font-medium text-muted">{label}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={val}
                        onChange={(e) => updateCrop(key, parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" loading={uploading} onClick={() => void uploadStaging()} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                Envoyer {staging.length} média{staging.length > 1 ? 's' : ''}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeStaging(active.id)}>
                Retirer ce fichier
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">Choisissez des fichiers pour les prévisualiser avant l’envoi Cloudinary.</p>
        )}
      </div>
      {localError ? <p className="text-[11px] text-rose-600">{localError}</p> : null}
    </div>
  );
}
