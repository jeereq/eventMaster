'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  Save,
  Loader2,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  type RoomLayoutBlueprint,
  type RoomOutlineShape,
  applyRoomTemplate,
  generateRoomBlueprint,
  defaultRoomOutline,
} from '@/lib/roomLayoutUtils';
import { api } from '@/lib/api';

function getFallbackBlueprint(): RoomLayoutBlueprint {
  return applyRoomTemplate('banquet-classic') || generateRoomBlueprint('BANQUET');
}

const RoomLayoutEditor = dynamic(() => import('@/components/RoomLayoutEditor'), {
  loading: () => (
    <div className="flex-1 w-full min-h-[500px] flex items-center justify-center bg-surface-muted text-muted text-xs animate-pulse">
      Chargement de l’éditeur spatial 2D / 3D…
    </div>
  ),
  ssr: false,
});

export interface ShowcasePlanData {
  id?: string;
  name: string;
  label: string;
  category: string;
  description: string;
  outlineShape?: string;
  blueprint?: RoomLayoutBlueprint | null;
  presetId?: string;
  isPublished?: boolean;
  order?: number;
}

const CATEGORY_OPTIONS = [
  { id: 'wedding', label: 'Mariages & Fêtes' },
  { id: 'banquet', label: 'Banquets & Réceptions' },
  { id: 'pro', label: 'Conférences & Entreprise' },
  { id: 'cocktail', label: 'Cocktails & Debout' },
  { id: 'other', label: 'Autre agencement' },
];

const OUTLINE_SHAPES: { id: RoomOutlineShape; label: string }[] = [
  { id: 'rectangle', label: 'Rectangulaire' },
  { id: 'square', label: 'Carrée' },
  { id: 'circle', label: 'Circulaire' },
  { id: 'ellipse', label: 'Ovale' },
  { id: 'lShape', label: 'En L' },
  { id: 'uShape', label: 'En U' },
  { id: 'tShape', label: 'En T' },
];

export interface ShowcasePlanEditorModalProps {
  isOpen: boolean;
  initialPlan?: ShowcasePlanData | null;
  fallbackBlueprint?: RoomLayoutBlueprint | null;
  onClose: () => void;
  onSaved: (savedPlan: ShowcasePlanData) => void;
}

export default function ShowcasePlanEditorModal({
  isOpen,
  initialPlan,
  fallbackBlueprint,
  onClose,
  onSaved,
}: ShowcasePlanEditorModalProps) {
  const isEditing = Boolean(initialPlan?.id);

  const [name, setName] = useState(initialPlan?.name || '');
  const [label, setLabel] = useState(initialPlan?.label || '');
  const [category, setCategory] = useState(initialPlan?.category || 'banquet');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [outlineShape, setOutlineShape] = useState<RoomOutlineShape>(
    (initialPlan?.outlineShape as RoomOutlineShape) || 'rectangle',
  );
  const [isPublished, setIsPublished] = useState(initialPlan?.isPublished !== false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [blueprint, setBlueprint] = useState<RoomLayoutBlueprint>(() => {
    if (initialPlan?.blueprint) return initialPlan.blueprint;
    if (fallbackBlueprint) return fallbackBlueprint;
    return getFallbackBlueprint();
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialPlan) {
      setName(initialPlan.name || '');
      setLabel(initialPlan.label || '');
      setCategory(initialPlan.category || 'banquet');
      setDescription(initialPlan.description || '');
      setOutlineShape((initialPlan.outlineShape as RoomOutlineShape) || 'rectangle');
      setIsPublished(initialPlan.isPublished !== false);
      if (initialPlan.blueprint) {
        setBlueprint(initialPlan.blueprint);
      } else if (fallbackBlueprint) {
        setBlueprint(fallbackBlueprint);
      }
    } else {
      setName('');
      setLabel('');
      setCategory('banquet');
      setDescription('');
      setOutlineShape('rectangle');
      setIsPublished(true);
      if (fallbackBlueprint) {
        setBlueprint(fallbackBlueprint);
      } else {
        setBlueprint(getFallbackBlueprint());
      }
    }
    setErrorMsg('');
  }, [initialPlan, fallbackBlueprint, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Veuillez renseigner le nom du modèle.');
      setDetailsOpen(true);
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        label: label.trim() || name.trim(),
        category,
        description: description.trim(),
        outlineShape,
        blueprint,
        presetId: initialPlan?.presetId || initialPlan?.id,
        isPublished,
        order: initialPlan?.order,
      };

      let response: { plan: ShowcasePlanData };
      if (isEditing && initialPlan?.id) {
        response = await api.put(`/admin/showcase-plans/${initialPlan.id}`, payload);
      } else {
        response = await api.post('/admin/showcase-plans', payload);
      }

      onSaved(response.plan);
      onClose();
    } catch (err: any) {
      console.error('[ShowcasePlanEditor] Sauvegarde échouée:', err);
      setErrorMsg(err.message || 'Impossible d’enregistrer le modèle de salle.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex h-[100dvh] max-h-[100dvh] flex-col bg-background animate-in fade-in duration-200">
      {/* ─── Barre d'en-tête de l'éditeur vitrine ─── */}
      <header className="px-4 py-2.5 sm:px-6 bg-surface border-b border-border flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary-solid dark:text-primary">
                Modèle Vitrine 2D / 3D
              </span>
              <span className="text-xs text-muted hidden sm:inline">
                {isEditing ? 'Édition du modèle existant' : 'Nouveau modèle personnalisé'}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">
              {name.trim() || 'Nouveau modèle de salle vitrine'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-11 rounded-lg border border-border bg-surface-muted text-xs font-semibold text-foreground hover:bg-surface transition cursor-pointer touch-manipulation"
            title="Paramètres du modèle (titre, catégorie, visibilité)"
            aria-label="Paramètres du modèle"
            aria-expanded={detailsOpen}
          >
            <Sliders className="w-3.5 h-3.5 text-muted" />
            <span>Paramètres</span>
            {detailsOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
          </button>

          <Button
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Enregistrer dans la vitrine
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 rounded-full text-muted hover:text-foreground hover:bg-surface-muted transition flex items-center justify-center cursor-pointer"
            aria-label="Fermer l’éditeur de modèle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ─── Tiroir rétractable des métadonnées du modèle ─── */}
      {detailsOpen && (
        <div className="bg-surface border-b border-border px-4 py-3 sm:px-6 shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-150 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                Nom du modèle *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Banquet royal d’honneur"
                className="w-full min-h-11 px-3 rounded-lg bg-surface-muted border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                Badge / Sous-titre
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex : Mariage VIP Kinshasa"
                className="w-full min-h-11 px-3 rounded-lg bg-surface-muted border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                Catégorie vitrine
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg bg-surface-muted border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                Forme de salle
              </label>
              <select
                value={outlineShape}
                onChange={(e) => {
                  const newShape = e.target.value as RoomOutlineShape;
                  setOutlineShape(newShape);
                  setBlueprint((prev) => ({
                    ...prev,
                    roomOutline: {
                      ...defaultRoomOutline(newShape),
                      ...(prev.roomOutline || {}),
                      shape: newShape,
                    },
                  }));
                }}
                className="w-full min-h-11 px-3 rounded-lg bg-surface-muted border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {OUTLINE_SHAPES.map((shape) => (
                  <option key={shape.id} value={shape.id}>
                    {shape.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex-1 max-w-xl">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description concise du modèle affichée sur la carte vitrine…"
                className="w-full min-h-11 px-3 rounded-lg bg-surface-muted border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
              />
              <span className="text-xs font-bold text-foreground">
                Afficher publiquement sur la vitrine (/plans-3d)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Message d'erreur éventuel */}
      {errorMsg && (
        <div className="bg-danger/10 border-b border-danger/30 text-danger text-xs font-semibold px-4 py-2 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="p-1 hover:underline">
            Ignorer
          </button>
        </div>
      )}

      {/* ─── Corps : Éditeur spatial 2D / 3D complet ─── */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <RoomLayoutEditor
          blueprint={blueprint}
          onChange={setBlueprint}
          allowThemesFixtures={true}
          editorLevel="complete"
          layout="fill"
        />
      </main>
    </div>
  );
}
