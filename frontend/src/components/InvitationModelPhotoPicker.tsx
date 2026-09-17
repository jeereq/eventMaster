'use client';

import { useEffect, useState } from 'react';
import { LayoutTemplate, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fetchPublicLandingTemplates } from '@/lib/landingTemplateAdapter';
import {
  invitationModelPhotosFromItems,
  type InvitationModelPhoto,
} from '@/lib/invitationModelPhoto';

type InvitationModelPhotoPickerProps = {
  id: string;
  selectedId?: string | null;
  onSelect: (photo: InvitationModelPhoto) => void;
  onClear?: () => void;
  disabled?: boolean;
  models?: InvitationModelPhoto[];
};

export default function InvitationModelPhotoPicker({
  id,
  selectedId,
  onSelect,
  onClear,
  disabled,
  models,
}: InvitationModelPhotoPickerProps) {
  const [loaded, setLoaded] = useState<InvitationModelPhoto[]>(models || []);
  const [loading, setLoading] = useState(!models);

  useEffect(() => {
    if (models) {
      setLoaded(models);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchPublicLandingTemplates()
      .then((templates) => {
        if (cancelled) return;
        setLoaded(invitationModelPhotosFromItems(templates.map((template) => ({
          id: template.id,
          name: template.name,
          previewContent: template.previewContent,
        }))));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [models]);

  const selected = loaded.find((item) => item.id === selectedId) || null;

  if (!loading && loaded.length === 0) {
    return (
      <p className="text-xs text-muted">
        Aucun modèle avec photo à préselectionner pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
          <LayoutTemplate className="w-3.5 h-3.5 text-primary" aria-hidden />
          Choisir un modèle
        </p>
        {selected && onClear ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="min-h-11 px-2.5 rounded-[var(--radius-button)] text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            Retirer
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        La photo de cette carte est envoyée au studio. Les visages des photos personnelles restent à part.
      </p>
      {selected ? (
        <p className="text-xs font-semibold text-primary">
          « {selected.name} » est présélectionnée.
        </p>
      ) : null}
      <div
        id={id}
        role="listbox"
        aria-label="Modèles d’invitation avec photo"
        className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className="w-20 h-28 shrink-0 rounded-[var(--radius-button)] bg-surface-muted border border-border animate-pulse"
                aria-hidden
              />
            ))
          : loaded.map((photo) => {
              const active = photo.id === selectedId;
              return (
                <button
                  key={photo.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={disabled}
                  onClick={() => onSelect(photo)}
                  className={cn(
                    'w-20 shrink-0 text-left rounded-[var(--radius-button)] border overflow-hidden transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60',
                    active
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.imageUrl}
                    alt=""
                    className="w-full h-24 object-cover bg-surface-muted"
                  />
                  <span className="block px-1.5 py-1 text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">
                    {photo.name}
                  </span>
                </button>
              );
            })}
      </div>
      {selected ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-primary/25 bg-primary/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.imageUrl}
            alt=""
            className="w-12 h-16 rounded-md object-cover border border-border shrink-0"
          />
          <span className="min-w-0 flex-1 text-xs text-foreground">
            <span className="block font-bold truncate">{selected.name}</span>
            <span className="block text-muted">Carte envoyée comme référence visuelle</span>
          </span>
          {onClear ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Retirer le modèle présélectionné"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
