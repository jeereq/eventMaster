'use client';

import React, { useState } from 'react';
import { Play, Upload } from 'lucide-react';
import { uploadMarketplaceMedia } from '@/lib/cloudinaryUpload';
import {
  MARKETPLACE_MAX_PHOTOS,
  MARKETPLACE_MAX_VIDEOS,
  MARKETPLACE_MAX_VIDEO_BYTES,
  isVideoUrl,
  mediaPosterUrl,
} from '@/lib/marketplace';

const ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.heic,.heif,.mov,.mp4,.webm';

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export default function MarketplaceMediaField({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFiles = async (files: FileList | null | undefined) => {
    if (!files?.length) return;
    setUploading(true);
    setLocalError('');
    try {
      const remaining = MARKETPLACE_MAX_PHOTOS - urls.length;
      let remainingVideos = MARKETPLACE_MAX_VIDEOS - urls.filter(isVideoUrl).length;
      const batch = Array.from(files).slice(0, remaining);
      const nextUrls: string[] = [];
      let skippedVideos = 0;
      for (const file of batch) {
        if (isVideoFile(file)) {
          if (remainingVideos <= 0) {
            skippedVideos += 1;
            continue;
          }
          if (file.size > MARKETPLACE_MAX_VIDEO_BYTES) {
            throw new Error(`« ${file.name} » dépasse 80 Mo.`);
          }
          remainingVideos -= 1;
        } else if (file.size > 10 * 1024 * 1024) {
          throw new Error(`« ${file.name} » dépasse 10 Mo.`);
        }
        const uploaded = await uploadMarketplaceMedia(file);
        if (!uploaded?.url) throw new Error('Réponse upload invalide.');
        nextUrls.push(uploaded.url);
      }
      onChange([...urls, ...nextUrls].slice(0, MARKETPLACE_MAX_PHOTOS));
      if (skippedVideos) {
        setLocalError(`Maximum ${MARKETPLACE_MAX_VIDEOS} vidéos. ${skippedVideos} fichier(s) ignoré(s).`);
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Upload média impossible.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className="block text-xs font-medium text-muted mb-1.5">
        Photos et vidéos (max. {MARKETPLACE_MAX_PHOTOS}, dont {MARKETPLACE_MAX_VIDEOS} vidéos)
      </span>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((url) => (
          <div key={url} className="relative w-16 h-16 rounded-md overflow-hidden border border-border bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaPosterUrl(url)} alt="" className="w-full h-full object-cover" />
            {isVideoUrl(url) && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none">
                <Play className="w-4 h-4 text-white fill-white" />
              </span>
            )}
            <button
              type="button"
              className="absolute top-0 right-0 z-10 bg-surface/90 text-[10px] px-1"
              onClick={() => onChange(urls.filter((item) => item !== url))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
        <Upload className="w-3.5 h-3.5" />
        {uploading ? 'Upload…' : 'Ajouter des photos ou vidéos'}
        <input
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={uploading || urls.length >= MARKETPLACE_MAX_PHOTOS}
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = '';
            void handleFiles(files);
          }}
        />
      </label>
      <p className="text-[11px] text-muted mt-1">
        JPEG, PNG, WebP, HEIC jusqu’à 10 Mo · MP4, WebM, MOV jusqu’à 80 Mo
      </p>
      {localError ? <p className="text-[11px] text-red-600 mt-1">{localError}</p> : null}
    </div>
  );
}
