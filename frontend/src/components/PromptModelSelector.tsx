'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Sparkles, Check, Heart, Building2, PartyPopper, Info, Languages, Crown } from 'lucide-react';
import {
  INVITATION_PROMPT_MODELS,
  PROMPT_CATEGORIES,
  type PromptCategory,
  type PromptModel,
} from '@/config/invitationPromptModels';
import { cn } from '@/lib/cn';

interface PromptModelSelectorProps {
  onSelectPrompt: (promptText: string) => void;
  selectedPrompt?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  /** Grille plus haute pour l’onglet Prompts. */
  layout?: 'inline' | 'panel';
  intent?: 'create' | 'clone';
  defaultCategory?: PromptCategory | 'all';
}

export default function PromptModelSelector({
  onSelectPrompt,
  selectedPrompt,
  disabled = false,
  className,
  compact = false,
  layout = 'inline',
  intent = 'create',
  defaultCategory,
}: PromptModelSelectorProps) {
  const initialCategory: PromptCategory | 'all' =
    defaultCategory ?? (intent === 'clone' ? 'clone' : 'coutumier');
  const [activeCategory, setActiveCategory] = useState<PromptCategory | 'all'>(initialCategory);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isPanel = layout === 'panel';

  useEffect(() => {
    setActiveCategory(defaultCategory ?? (intent === 'clone' ? 'clone' : 'coutumier'));
  }, [intent, defaultCategory]);

  const filteredModels =
    activeCategory === 'all'
      ? INVITATION_PROMPT_MODELS
      : INVITATION_PROMPT_MODELS.filter((m) => m.category === activeCategory);

  const handleSelect = (model: PromptModel) => {
    if (disabled) return;
    onSelectPrompt(model.prompt);
    setCopiedId(model.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getCategoryIcon = (catId: PromptCategory) => {
    switch (catId) {
      case 'coutumier':
        return <Crown className="w-3.5 h-3.5" />;
      case 'clone':
        return <Copy className="w-3.5 h-3.5" />;
      case 'wedding':
        return <Heart className="w-3.5 h-3.5" />;
      case 'gala':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'birthday':
        return <PartyPopper className="w-3.5 h-3.5" />;
      case 'rdc-langues':
        return <Languages className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Exemples de brief
        </span>
        <span className="text-[11px] text-muted hidden sm:inline">
          Un bouton préremplit le brief
        </span>
      </div>

      {/* Onglets de catégories */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Catégories d’exemples">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'all'}
          disabled={disabled}
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation cursor-pointer border',
            activeCategory === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-surface-muted/80 text-muted border-border hover:text-foreground hover:bg-surface',
          )}
        >
          Tous ({INVITATION_PROMPT_MODELS.length})
        </button>
        {PROMPT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            disabled={disabled}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-2.5 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation cursor-pointer inline-flex items-center gap-1.5 border',
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-surface-muted/80 text-muted border-border hover:text-foreground hover:bg-surface',
            )}
          >
            {getCategoryIcon(cat.id)}
            <span className="sm:hidden">{cat.shortLabel}</span>
            <span className="hidden sm:inline">{cat.label}</span>
          </button>
        ))}
      </div>

      {activeCategory === 'coutumier' && (
        <div className="p-2.5 rounded-[var(--radius-card)] bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-100 text-xs flex items-start gap-2">
          <Crown className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">4 grandes tribus — mariages coutumiers</p>
            <p className="hidden sm:block text-[11px] opacity-90 mt-0.5">
              Kongo (Bakongo), Luba (Baluba), Mongo et Lunda. Appuyez sur « Préremplir » puis ajustez date, lieu et noms.
            </p>
          </div>
        </div>
      )}

      {/* Conseil contextuel pour le mode copie / clonage */}
      {activeCategory === 'clone' && (
        <div className="p-2.5 rounded-[var(--radius-card)] bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 animate-fade-in">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Pour cloner une carte :</p>
            <p className="hidden sm:block text-[11px] opacity-90 mt-0.5">
              Déposez la photo de l’invitation dans la zone d’envoi à côté, sur ce même écran, puis choisissez un exemple.
            </p>
          </div>
        </div>
      )}

      {/* Conseil contextuel pour les 4 langues nationales de la RDC */}
      {activeCategory === 'rdc-langues' && (
        <div className="p-2.5 rounded-[var(--radius-card)] bg-emerald-500/10 border border-emerald-500/25 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
          <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">4 Langues nationales de la RDC :</p>
            <p className="hidden sm:block text-[11px] opacity-90 mt-0.5">
              Lingala (Kinshasa & Fleuve), Kiswahili (Est & Grand Katanga), Kikongo (Kongo Central & Bandundu), Tshiluba (Grand Kasaï).
              Les titres, textes et formulations cérémoniales sont générés fidèlement dans la langue choisie.
            </p>
          </div>
        </div>
      )}

      {/* Grille des modèles de prompt */}
      <div
        className={cn(
          'grid gap-2 overflow-y-auto overscroll-contain pr-1 no-scrollbar',
          isPanel ? 'max-h-[min(28rem,52vh)]' : 'max-h-56 sm:max-h-64',
          compact && !isPanel ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {filteredModels.map((model) => {
          const isSelected = selectedPrompt?.trim() === model.prompt.trim();
          const justCopied = copiedId === model.id;

          return (
            <button
              key={model.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => handleSelect(model)}
              className={cn(
                'group min-h-11 p-2.5 sm:p-3 rounded-[var(--radius-card)] border transition-all text-left touch-manipulation flex flex-col justify-between space-y-1 sm:space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-muted/60',
                disabled && 'opacity-60 cursor-not-allowed',
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {model.title}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                      model.isClone
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                        : model.category === 'coutumier'
                          ? 'bg-amber-600/15 text-amber-800 dark:text-amber-200 border border-amber-600/25'
                          : model.category === 'rdc-langues'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-primary/15 text-primary border border-primary/20',
                    )}
                  >
                    {model.badge}
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] text-muted leading-relaxed line-clamp-2">
                  {model.summary}
                </p>
              </div>

              <div className="pt-1 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold">
                <span className="hidden sm:inline text-muted/80 text-[10px] truncate max-w-[70%]">
                  {model.prompt.slice(0, 45)}…
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 transition-colors',
                    justCopied ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-primary',
                  )}
                >
                  {justCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Prérempli</span>
                    </>
                  ) : (
                    <span>Préremplir</span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
