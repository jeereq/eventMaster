'use client';

import React, { useState } from 'react';
import {
  Building2,
  Sparkles,
  MapPin,
  Tag,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  DollarSign,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { Modal, Button, Input, Alert } from '@/components/ui';
import CityLocationFields from '@/components/CityLocationFields';
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_TRADE_CATEGORIES,
  SERVICE_RENTAL_CATEGORIES,
  PRICE_UNIT_OPTIONS,
  type ServiceCategory,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

interface FirstLoginOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  tenantName?: string | null;
}

export default function FirstLoginOnboardingModal({
  open,
  onClose,
  onComplete,
  tenantName,
}: FirstLoginOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [displayName, setDisplayName] = useState(tenantName || '');
  const [city, setCity] = useState('Kinshasa');
  const [commune, setCommune] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const [category, setCategory] = useState<ServiceCategory>('CATERING');
  const [title, setTitle] = useState('');
  const [travels, setTravels] = useState(true);
  const [coverageRadiusKm, setCoverageRadiusKm] = useState('25');

  const [priceFromFc, setPriceFromFc] = useState('');
  const [priceUnit, setPriceUnit] = useState<VenuePriceUnit>('EVENT');
  const [description, setDescription] = useState('');

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError('Veuillez renseigner le nom commercial ou de votre enseigne.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!category) {
      setError('Veuillez sélectionner votre domaine d’activité.');
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const cleanPrice = priceFromFc.trim()
        ? Math.max(0, parseInt(priceFromFc.replace(/\D/g, ''), 10) || 0)
        : null;
      const cleanRadius = travels && coverageRadiusKm
        ? Math.max(1, parseInt(coverageRadiusKm.replace(/\D/g, ''), 10) || 25)
        : null;

      await api.post('/marketplace/onboarding', {
        displayName: displayName.trim(),
        city,
        commune,
        neighborhood,
        category,
        title: title.trim() || `Prestation ${SERVICE_CATEGORY_LABELS[category] || ''}`,
        travels,
        coverageRadiusKm: cleanRadius,
        priceFromFc: cleanPrice,
        priceUnit,
        description: description.trim() || null,
      });
      onComplete();
    } catch (err: unknown) {
      console.error('Erreur enregistrement onboarding:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuration rapide de votre vitrine"
      description={`Étape ${step} sur 3 — ${
        step === 1 ? 'Identité & Localisation' : step === 2 ? 'Votre Spécialité' : 'Tarification de base'
      }`}
      size="md"
    >
      <div className="space-y-4 pt-1">
        {/* Barre de progression des étapes */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
          {[
            { id: 1, label: 'Profil', icon: Building2 },
            { id: 2, label: 'Activité', icon: Tag },
            { id: 3, label: 'Offre', icon: DollarSign },
          ].map((s) => {
            const Icon = s.icon;
            const isDone = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0',
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 ring-2 ring-primary/20'
                      : 'bg-surface-muted border border-border text-muted',
                  )}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className={cn('text-[11px] font-semibold truncate', isCurrent ? 'text-primary' : 'text-muted')}>
                    {s.label}
                  </p>
                </div>
                {s.id < 3 && <div className="h-[2px] flex-1 bg-border/60 mx-1 rounded" />}
              </div>
            );
          })}
        </div>

        {error && <Alert variant="error" className="py-2 text-xs">{error}</Alert>}

        {/* ─── ÉTAPE 1 : IDENTITÉ & VILLE ─── */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-3.5">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5 text-xs text-muted">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>
                Ces informations apparaîtront sur votre profil public pour permettre aux organisateurs de vous identifier et de vous trouver facilement.
              </p>
            </div>

            <Input
              label="Nom commercial ou enseigne"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Élite Traiteur & Déco"
              leftIcon={<Building2 className="w-4 h-4" />}
            />

            <div className="space-y-2">
              <span className="block text-xs font-medium text-muted">Votre localisation principale</span>
              <CityLocationFields
                city={city}
                commune={commune}
                neighborhood={neighborhood}
                onChange={({ city: nextCity, commune: nextCommune, neighborhood: nextNeighborhood }) => {
                  setCity(nextCity);
                  setCommune(nextCommune);
                  setNeighborhood(nextNeighborhood);
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-muted hover:text-foreground font-medium py-2 px-3"
              >
                Passer pour le moment
              </button>
              <Button type="submit" rightIcon={<ChevronRight className="w-4 h-4" />}>
                Continuer
              </Button>
            </div>
          </form>
        )}

        {/* ─── ÉTAPE 2 : DOMAINE & MOBILITÉ ─── */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="space-y-3.5">
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1.5">
                Domaine d’activité principal <span className="text-rose-500">*</span>
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              >
                <optgroup label="Prestations & Services">
                  {SERVICE_TRADE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {SERVICE_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Matériel & Équipements">
                  {SERVICE_RENTAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {SERVICE_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>

            <Input
              label="Intitulé de votre prestation principale (optionnel)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ex: Service complet ${SERVICE_CATEGORY_LABELS[category] || ''}`}
              leftIcon={<Briefcase className="w-4 h-4" />}
            />

            <div className="space-y-2">
              <span className="block text-xs font-medium text-muted">Mobilité</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTravels(true)}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    travels
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-surface-muted text-muted hover:text-foreground',
                  )}
                >
                  <Compass className="w-3.5 h-3.5" />
                  Je me déplace
                </button>
                <button
                  type="button"
                  onClick={() => setTravels(false)}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    !travels
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-surface-muted text-muted hover:text-foreground',
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Sur place uniquement
                </button>
              </div>

              {travels && (
                <Input
                  label="Rayon de couverture (en km)"
                  type="number"
                  min="1"
                  max="500"
                  value={coverageRadiusKm}
                  onChange={(e) => setCoverageRadiusKm(e.target.value)}
                  placeholder="25"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                Précédent
              </Button>
              <Button type="submit" rightIcon={<ChevronRight className="w-4 h-4" />}>
                Continuer
              </Button>
            </div>
          </form>
        )}

        {/* ─── ÉTAPE 3 : TARIFICATION DE DÉPART ─── */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                label="Tarif à partir de (FC)"
                type="number"
                min="0"
                value={priceFromFc}
                onChange={(e) => setPriceFromFc(e.target.value)}
                placeholder="Ex: 250000"
                leftIcon={<DollarSign className="w-4 h-4" />}
              />

              <label className="block">
                <span className="block text-xs font-medium text-muted mb-1.5">Unité de base</span>
                <select
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value as VenuePriceUnit)}
                  className="w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                >
                  {PRICE_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1.5">Description courte ou atouts</span>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez brièvement vos formules, votre expérience ou ce qui fait votre force..."
                className="w-full px-3.5 py-2 bg-surface-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </label>

            <p className="text-[11px] text-muted">
              Vous pourrez ajouter des photos, préciser vos disponibilités et publier votre fiche complète à tout moment depuis l’onglet « Mes offres ».
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setStep(2)} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                Précédent
              </Button>
              <Button
                type="submit"
                loading={saving}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-sm shadow-primary/20"
              >
                Finaliser ma vitrine
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
