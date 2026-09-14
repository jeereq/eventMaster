'use client';

import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Plus,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { ShowcasePlanData } from './ShowcasePlanEditorModal';

export interface ShowcasePlanSelectionModalProps {
  isOpen: boolean;
  plans: ShowcasePlanData[];
  onClose: () => void;
  onEditPlan: (plan: ShowcasePlanData) => void;
  onCreateNewPlan: () => void;
  onPlansUpdated: (updatedPlans: ShowcasePlanData[]) => void;
}

export default function ShowcasePlanSelectionModal({
  isOpen,
  plans,
  onClose,
  onEditPlan,
  onCreateNewPlan,
  onPlansUpdated,
}: ShowcasePlanSelectionModalProps) {
  const [localPlans, setLocalPlans] = useState<ShowcasePlanData[]>(plans);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Synchronisation lors de l'ouverture
  React.useEffect(() => {
    if (isOpen) {
      setLocalPlans(plans);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, plans]);

  if (!isOpen) return null;

  const handleTogglePublish = (id?: string) => {
    if (!id) return;
    setLocalPlans((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isPublished: item.isPublished === false ? true : false } : item,
      ),
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localPlans.length) return;

    setLocalPlans((current) => {
      const copy = [...current];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((p, idx) => ({ ...p, order: idx + 1 }));
    });
  };

  const handleDelete = async (plan: ShowcasePlanData) => {
    if (!plan.id) return;
    const confirmDelete = window.confirm(
      `Êtes-vous certain de vouloir supprimer le modèle "${plan.name}" de la vitrine ?`,
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/showcase-plans/${plan.id}`);
      const remaining = localPlans.filter((p) => p.id !== plan.id);
      setLocalPlans(remaining);
      onPlansUpdated(remaining);
    } catch (err: any) {
      console.error('[ShowcaseSelection] Erreur suppression:', err);
      setErrorMsg(err.message || 'Impossible de supprimer ce modèle.');
    }
  };

  const handleSaveSelection = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        items: localPlans.map((p, idx) => ({
          id: p.id,
          isPublished: p.isPublished !== false,
          order: idx + 1,
        })),
      };

      const res: { plans: ShowcasePlanData[] } = await api.put(
        '/admin/showcase-plans/selection',
        payload,
      );

      const savedList = res.plans || localPlans;
      setLocalPlans(savedList);
      onPlansUpdated(savedList);
      setSuccessMsg('Sélection et ordre de la vitrine enregistrés avec succès.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('[ShowcaseSelection] Erreur sauvegarde sélection:', err);
      setErrorMsg(err.message || 'Impossible d’enregistrer la sélection.');
    } finally {
      setIsSaving(false);
    }
  };

  const publishedCount = localPlans.filter((p) => p.isPublished !== false).length;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 bg-surface-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Sélection & Ordre de la Vitrine 2D / 3D
              </h2>
              <p className="text-xs text-muted">
                {publishedCount} modèle{publishedCount > 1 ? 's' : ''} affiché{publishedCount > 1 ? 's' : ''} sur{' '}
                {localPlans.length} configuré{localPlans.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 rounded-full text-muted hover:text-foreground hover:bg-surface-muted transition flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="bg-danger/10 border-b border-danger/30 text-danger text-xs font-semibold px-5 py-2.5">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-primary/10 border-b border-primary/30 text-primary-solid dark:text-primary text-xs font-bold px-5 py-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Liste des plans avec drag / up / down / switch */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {localPlans.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <LayoutGrid className="w-10 h-10 text-muted mx-auto opacity-50" />
              <p className="text-sm font-semibold text-muted">Aucun modèle configuré</p>
              <Button size="sm" onClick={onCreateNewPlan} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Créer un premier modèle
              </Button>
            </div>
          ) : (
            localPlans.map((plan, index) => {
              const isPub = plan.isPublished !== false;
              return (
                <div
                  key={plan.id || `plan-${index}`}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition',
                    isPub
                      ? 'bg-surface border-border hover:border-primary/40'
                      : 'bg-surface-muted/60 border-border/60 opacity-60 hover:opacity-100',
                  )}
                >
                  {/* Gauche : Ordre + Nom + Badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-1 min-h-11 min-w-11 rounded-md text-muted hover:text-foreground disabled:opacity-20 hover:bg-surface-muted transition flex items-center justify-center cursor-pointer touch-manipulation"
                        title="Monter"
                        aria-label={`Monter le plan ${plan.name} d'un rang`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === localPlans.length - 1}
                        className="p-1 min-h-11 min-w-11 rounded-md text-muted hover:text-foreground disabled:opacity-20 hover:bg-surface-muted transition flex items-center justify-center cursor-pointer touch-manipulation"
                        title="Descendre"
                        aria-label={`Descendre le plan ${plan.name} d'un rang`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-muted tabular-nums">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground truncate">{plan.name}</h4>
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-muted border border-border text-muted">
                          {plan.label || plan.category}
                        </span>
                        {isPub ? (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary-solid dark:text-primary">
                            En ligne
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface-muted text-muted">
                            Masqué
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted truncate max-w-md mt-0.5">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Droite : Switch Visibilité + Bouton Éditer + Supprimer */}
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(plan.id)}
                      className={cn(
                        'min-h-11 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer',
                        isPub
                          ? 'border-primary/30 bg-primary/10 text-primary-solid dark:text-primary'
                          : 'border-border bg-surface-muted text-muted hover:text-foreground',
                      )}
                      title={isPub ? 'Masquer de la vitrine' : 'Afficher sur la vitrine'}
                    >
                      {isPub ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{isPub ? 'Visible' : 'Masqué'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onEditPlan(plan);
                        onClose();
                      }}
                      className="p-2 min-h-11 min-w-11 rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-muted transition flex items-center justify-center cursor-pointer touch-manipulation"
                      title="Éditer dans l’éditeur 2D / 3D"
                      aria-label={`Éditer le plan vitrine ${plan.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(plan)}
                      className="p-2 min-h-11 min-w-11 rounded-lg border border-border text-muted hover:text-danger hover:bg-danger/10 transition flex items-center justify-center cursor-pointer touch-manipulation"
                      title="Supprimer ce modèle"
                      aria-label={`Supprimer le modèle vitrine ${plan.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de page modal */}
        <div className="px-5 py-3.5 border-t border-border bg-surface-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={onCreateNewPlan}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Nouveau modèle vitrine
          </Button>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSelection}
              loading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Enregistrer la sélection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
