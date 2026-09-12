'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Copy,
  Edit3,
  Calendar,
  Layers,
  Palette,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import {
  templateContentToLandingPreview,
  getTemplateElementSummary,
} from '@/lib/landingTemplateAdapter';
import type { TemplateCardItem } from './TemplateCardGrid';
import { cn } from '@/lib/cn';

interface TemplatePreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: TemplateCardItem | null;
  onEdit?: (t: TemplateCardItem) => void;
  onDuplicate?: (t: TemplateCardItem) => void;
  canEdit?: boolean;
  canDuplicate?: boolean;
  isOwnerOrManager?: boolean;
}

export default function TemplatePreviewModal({
  open,
  onClose,
  template,
  onEdit,
  onDuplicate,
  canEdit = false,
  canDuplicate = false,
  isOwnerOrManager = true,
}: TemplatePreviewModalProps) {
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');

  // Fermeture avec la touche Échap
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !template) return null;

  const landingPreview = templateContentToLandingPreview({
    id: template.id,
    name: template.name,
    content: template.content,
  });

  const isGlobal = !template.tenantId;
  const summary = getTemplateElementSummary(template.content);
  const elementsCount = template.content?.elements?.length ?? 0;
  const bgType = (template.content?.global as Record<string, unknown> | undefined)?.bgType;
  const fontTheme = (template.content?.global as Record<string, unknown> | undefined)?.fontTheme;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-title"
      className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-6 bg-foreground/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface rounded-2xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* En-tête de la modale */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 bg-surface-muted/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Aperçu du modèle d&apos;invitation
              </span>
              {isOwnerOrManager && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  Vue organisateur
                </span>
              )}
              {isGlobal ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
                  Bibliothèque EventMaster
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-150 dark:border-amber-900/50">
                  Modèle d&apos;organisation
                </span>
              )}
            </div>
            <h2
              id="template-preview-title"
              className="text-lg sm:text-xl font-bold text-foreground truncate mt-0.5"
            >
              {template.name}
            </h2>
          </div>

          {/* Bouton de fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted hover:text-foreground hover:bg-surface-muted rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
            aria-label="Fermer l'aperçu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de contrôle des vues (Mobile / Desktop) */}
        <div className="px-5 py-2.5 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-surface-muted p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setDeviceView('mobile')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer',
                deviceView === 'mobile'
                  ? 'bg-surface text-foreground shadow-2xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Smartphone (380px)</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('desktop')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer',
                deviceView === 'desktop'
                  ? 'bg-surface text-foreground shadow-2xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Format large (520px)</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-muted text-xs">
            {elementsCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {elementsCount} éléments
              </span>
            )}
            {Boolean(fontTheme) && (
              <span className="hidden sm:inline-flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
                Thème : {String(fontTheme)}
              </span>
            )}
          </div>
        </div>

        {/* Zone de contenu défilable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-surface-muted/60 via-surface to-surface flex justify-center items-start min-h-[360px]">
          <div
            className={cn(
              'w-full transition-all duration-300 ease-in-out',
              deviceView === 'mobile' ? 'max-w-[390px]' : 'max-w-[540px]',
            )}
          >
            {/* Conteneur avec simulation de cadre / écran */}
            <div className="relative rounded-3xl p-2.5 sm:p-3 bg-foreground/5 border-2 border-border/80 shadow-2xl ring-1 ring-border/20">
              {/* Encoche style smartphone si vue mobile */}
              {deviceView === 'mobile' && (
                <div className="w-24 h-3 bg-border/60 mx-auto rounded-full mb-2.5" />
              )}

              <div className="rounded-2xl overflow-hidden shadow-inner bg-surface">
                <LandingInvitationPreview
                  template={landingPreview}
                  compact={false}
                  variant="default"
                  className="w-full !rounded-none !border-0 !shadow-none min-h-[460px]"
                />
              </div>

              {deviceView === 'mobile' && (
                <div className="w-16 h-1 bg-border/60 mx-auto rounded-full mt-2.5" />
              )}
            </div>
          </div>
        </div>

        {/* Pied de la modale avec actions */}
        <div className="px-5 py-3.5 border-t border-border bg-surface-muted/50 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted truncate max-w-sm sm:max-w-md">
            {summary || 'Rendu en direct du faire-part tel que les invités le recevront.'}
          </p>

          <div className="flex items-center gap-2">
            {canDuplicate && onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDuplicate(template);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Utiliser ce modèle</span>
              </button>
            )}

            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(template);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl text-xs transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier le modèle</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-surface text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
