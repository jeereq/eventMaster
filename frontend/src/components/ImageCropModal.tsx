'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { DEFAULT_IMAGE_CROP, ImageCropRect, cropImageToDataUrl, readImageFile } from '@/lib/imageCropUtils';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (imageUrl: string, crop: ImageCropRect) => void;
  title?: string;
  initialImageUrl?: string;
  initialCrop?: ImageCropRect;
}

export default function ImageCropModal({
  open,
  onClose,
  onApply,
  title = 'Image personnalisée',
  initialImageUrl,
  initialCrop,
}: ImageCropModalProps) {
  const [sourceUrl, setSourceUrl] = useState(initialImageUrl ?? '');
  const [crop, setCrop] = useState<ImageCropRect>(initialCrop ?? DEFAULT_IMAGE_CROP);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSourceUrl(initialImageUrl ?? '');
      setCrop(initialCrop ?? DEFAULT_IMAGE_CROP);
      setError('');
    }
  }, [open, initialImageUrl, initialCrop]);

  const handleFile = async (file: File) => {
    try {
      const url = await readImageFile(file);
      setSourceUrl(url);
      setCrop(DEFAULT_IMAGE_CROP);
    } catch {
      setError('Impossible de lire le fichier.');
    }
  };

  const handleApply = async () => {
    if (!sourceUrl) return;
    setApplying(true);
    setError('');
    try {
      const cropped = await cropImageToDataUrl(sourceUrl, crop);
      onApply(cropped, crop);
      onClose();
    } catch {
      setError('Erreur lors du rognage.');
    } finally {
      setApplying(false);
    }
  };

  const updateCrop = (key: keyof ImageCropRect, value: number) => {
    setCrop((prev) => ({ ...prev, [key]: Math.max(0, Math.min(1, value)) }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Importez une image, ajustez la zone de rognage, puis appliquez."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleApply} loading={applying} disabled={!sourceUrl}>
            Appliquer l&apos;image
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

        <label className="block">
          <span className="text-xs font-semibold text-slate-600 mb-1 block">Choisir une image</span>
          <input
            type="file"
            accept="image/*"
            className="w-full text-xs"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>

        {sourceUrl && (
          <>
            <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src={sourceUrl} alt="" className="w-full h-full object-contain" />
              <div
                className="absolute border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                ['x', 'Position X', crop.x],
                ['y', 'Position Y', crop.y],
                ['w', 'Largeur zone', crop.w],
                ['h', 'Hauteur zone', crop.h],
              ] as const).map(([key, label, val]) => (
                <label key={key} className="text-xs space-y-1">
                  <span className="font-semibold text-slate-600">{label}</span>
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

            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setCrop(DEFAULT_IMAGE_CROP)}>Zone complète</Button>
              <Button variant="ghost" size="sm" onClick={() => setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })}>Centrer 80%</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
