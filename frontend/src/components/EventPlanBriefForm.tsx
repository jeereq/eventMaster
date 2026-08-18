'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Loader2, Save, Sparkles } from 'lucide-react';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { communesForCity, normalizeRdcCity } from '@/lib/rdcCities';
import { LISTING_EVENT_TYPES, VENUE_AMENITIES, eventTypeLabel, type ListingEventTypeId } from '@/lib/listingDetails';
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from '@/lib/marketplace';
import {
  briefMarginFc,
  briefSpendableFc,
  briefWithEventType,
  createDemoWeddingBrief,
  cycleSlotPriority,
  defaultShares,
  shareRows,
  type AmenityMode,
  type EventPlanBrief,
  type FavoriteMode,
  type IncludeVenue,
  type MarginPct,
  type MatchMode,
  type MissingStrategy,
  type SavedEventBrief,
  type SlotPriority,
} from '@/lib/eventPlan';

const SLOT_HINT: Record<SlotPriority, string> = {
  required: 'obligatoire — le pack doit proposer ce métier',
  optional: 'si le budget reste — ajouté seulement s’il y a de la place',
  excluded: 'exclu — ce métier n’est pas cherché',
};

const SLOT_SHORT: Record<SlotPriority, string> = {
  required: 'obligatoire',
  optional: 'si ça rentre',
  excluded: 'exclu',
};

function FieldSelect({
  label,
  hint,
  value,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
      >
        {children}
      </select>
      {hint ? <span className="block text-[11px] text-muted leading-relaxed">{hint}</span> : null}
    </label>
  );
}

export default function EventPlanBriefForm({
  brief,
  onChange,
  planning,
  error,
  onSubmit,
  briefs,
  onSaveBrief,
  onLoadBrief,
  onDeleteBrief,
}: {
  brief: EventPlanBrief;
  onChange: (next: EventPlanBrief) => void;
  planning: boolean;
  error: string;
  onSubmit: () => void;
  briefs: SavedEventBrief[];
  onSaveBrief: (name: string) => Promise<void>;
  onLoadBrief: (item: SavedEventBrief) => void;
  onDeleteBrief: (id: string) => Promise<void>;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [showUseCase, setShowUseCase] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [briefName, setBriefName] = useState('');
  const [saving, setSaving] = useState(false);
  const communes = communesForCity(brief.city);
  const rows = useMemo(() => shareRows(brief), [brief]);
  const shareSum = rows.reduce((sum, row) => sum + row.pct, 0);
  const spendable = briefSpendableFc(brief);
  const reserved = briefMarginFc(brief);
  const allocated = rows.reduce((sum, row) => sum + row.amountFc, 0);
  const suggested = SERVICE_CATEGORIES.filter(
    (category) => brief.slots[category] === 'required' || brief.slots[category] === 'optional',
  );
  const visibleCategories = showAllTrades ? SERVICE_CATEGORIES : suggested.length ? suggested : SERVICE_CATEGORIES;

  const patch = (partial: Partial<EventPlanBrief>) => onChange({ ...brief, ...partial });

  const setIncludeVenue = (includeVenue: IncludeVenue) => {
    patch({ includeVenue, shares: defaultShares(brief.eventType, includeVenue, brief.slots) });
  };

  const setSlot = (category: ServiceCategory) => {
    const slots = { ...brief.slots, [category]: cycleSlotPriority(brief.slots[category] || 'excluded') };
    const shares = { ...defaultShares(brief.eventType, brief.includeVenue, slots), ...brief.shares };
    onChange({ ...brief, slots, shares });
  };

  const saveBrief = async () => {
    setSaving(true);
    try {
      await onSaveBrief(briefName.trim() || `Brief · ${eventTypeLabel(brief.eventType)}`);
      setBriefName('');
    } finally {
      setSaving(false);
    }
  };

  const demo = useMemo(() => createDemoWeddingBrief(), []);
  const demoSpendable = briefSpendableFc(demo);
  const demoReserved = briefMarginFc(demo);
  const demoRows = shareRows(demo);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-4">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Brief budget</h2>
        <p className="text-sm text-muted leading-relaxed">
          Vous décrivez l’événement et l’enveloppe. EventMaster cherche ensuite <strong className="font-semibold text-foreground">3 packs</strong> (économique, équilibré, confort) dans ce budget : salle et prestataires déjà combinés, sans dépasser le maximum.
        </p>
        <p className="text-xs text-muted leading-relaxed">
          Vous pouvez tout laisser par défaut et lancer la recherche, ou préciser ville, date, métiers et répartition. Rien n’est réservé : vous comparez, sauvegardez, puis contactez les professionnels.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5">
        <button
          type="button"
          onClick={() => setShowUseCase((value) => !value)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="text-sm font-semibold text-foreground">Exemple — mariage à Kinshasa, 100 invités</span>
          <ChevronDown className={cn('w-4 h-4 text-muted shrink-0 transition', showUseCase && 'rotate-180')} />
        </button>
        {showUseCase ? (
          <div className="px-3 pb-3 space-y-2 text-xs text-muted leading-relaxed border-t border-primary/15 pt-2">
            <p>
              Marie veut un mariage pour 100 personnes à Kinshasa, avec <strong className="text-foreground">{formatFc(demo.budgetMaxFc)}</strong>.
              Elle garde <strong className="text-foreground">{demo.marginPct} % = {formatFc(demoReserved)}</strong> de réserve (imprévus).
              EventMaster cherche donc pour <strong className="text-foreground">{formatFc(demoSpendable)}</strong>.
            </p>
            <p>
              Répartition type :{' '}
              {demoRows.slice(0, 4).map((row) => `${row.label} ${row.pct} % → ${formatFc(row.amountFc)}`).join(' · ')}
              {demoRows.length > 4 ? '…' : ''}.
            </p>
            <p>
              Elle clique « Appliquer l’exemple », lance la recherche, compare les 3 packs, enregistre celui qui lui convient, puis envoie un devis depuis la fiche.
            </p>
            <Button size="sm" variant="secondary" onClick={() => onChange(createDemoWeddingBrief())}>
              Appliquer cet exemple
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FieldSelect
          label="Type d’événement"
          hint="Préremplit les métiers (mariage = traiteur, photo, DJ…)."
          value={brief.eventType}
          onChange={(value) => onChange(briefWithEventType(brief, value as ListingEventTypeId))}
        >
          {LISTING_EVENT_TYPES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </FieldSelect>
        <Input
          label="Budget maximum (FC)"
          type="number"
          min={50000}
          step={50000}
          value={brief.budgetMaxFc}
          onChange={(e) => patch({ budgetMaxFc: Number(e.target.value) || 0 })}
          required
          hint="Plafond à ne pas dépasser. Minimum 50 000 FC."
        />
        <FieldSelect
          label="Marge de sécurité"
          hint={
            reserved > 0
              ? `${brief.marginPct} % = ${formatFc(reserved)} mis de côté. Recherche sur ${formatFc(spendable)}.`
              : '0 % = tout le budget est cherché. Utile si vous n’avez aucun imprévu.'
          }
          value={String(brief.marginPct)}
          onChange={(value) => patch({ marginPct: Number(value) as MarginPct })}
        >
          <option value="0">0 % — {formatFc(brief.budgetMaxFc)} cherchés, 0 FC de réserve</option>
          <option value="5">5 % — recommandé · {formatFc(Math.round(brief.budgetMaxFc * 0.05))} de réserve</option>
          <option value="10">10 % — confort · {formatFc(Math.round(brief.budgetMaxFc * 0.10))} de réserve</option>
        </FieldSelect>
        <FieldSelect
          label="Ville"
          hint="Limite la recherche aux salles et prestataires de cette ville."
          value={brief.city}
          onChange={(value) => patch({ city: normalizeRdcCity(value) || '', commune: '' })}
        >
          <option value="">Toute la RDC</option>
          <option value="Kinshasa">Kinshasa</option>
          <option value="Lubumbashi">Lubumbashi</option>
        </FieldSelect>
        <FieldSelect
          label="Commune"
          hint="Optionnel. Affinez le quartier ; vide = toute la ville."
          value={brief.commune}
          onChange={(value) => patch({ commune: value })}
        >
          <option value="">Toutes les communes</option>
          {communes.map((item) => (
            <option key={item.name} value={item.name}>{item.name}</option>
          ))}
        </FieldSelect>
        <Input
          label="Nombre d’invités"
          type="number"
          min={1}
          value={brief.guestCount || ''}
          onChange={(e) => patch({ guestCount: Number(e.target.value) || 0 })}
          hint="Sert à choisir une salle assez grande et à estimer le traiteur au plat."
        />
        <Input
          label="Date"
          type="date"
          value={brief.eventDate}
          onChange={(e) => patch({ eventDate: e.target.value })}
          hint="Optionnel. Évite les salles déjà prises ce jour-là."
        />
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/60 px-3 py-3 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          Budget {formatFc(brief.budgetMaxFc)}
          {brief.marginPct > 0 ? ` · réserve ${formatFc(reserved)}` : ''}
        </p>
        <p className="text-xs text-muted leading-relaxed">
          EventMaster cherche pour <strong className="text-foreground">{formatFc(spendable)}</strong>
          {brief.marginPct > 0
            ? ` (${brief.marginPct} % = ${formatFc(reserved)} restent de côté pour les imprévus).`
            : ' (toute l’enveloppe).'}
        </p>
        {rows.length > 0 ? (
          <p className="text-[11px] text-muted leading-relaxed">
            Répartition actuelle : {rows.map((row) => `${row.label} ${row.pct} % → ${formatFc(row.amountFc)}`).join(' · ')}
            {shareSum !== 100 ? ` · total ${shareSum} % (${formatFc(allocated)}) — rééquilibré à 100 % au lancement.` : ''}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Salle</p>
        <p className="text-[11px] text-muted leading-relaxed">
          Choisissez si un lieu doit figurer dans chaque pack. « Si ça rentre » ajoute une salle seulement s’il reste de l’argent.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['yes', 'Obligatoire', 'Chaque pack contient une salle.'],
            ['if_fits', 'Si ça rentre', 'Salle ajoutée seulement s’il reste du budget.'],
            ['no', 'Sans salle', 'Uniquement des prestataires (vous avez déjà un lieu).'],
          ] as Array<[IncludeVenue, string, string]>).map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              title={hint}
              onClick={() => setIncludeVenue(id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border',
                brief.includeVenue === id ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Prestations</p>
        <p className="text-[11px] text-muted leading-relaxed">
          Un clic fait tourner le métier : <strong className="text-foreground">obligatoire</strong> (le pack doit le proposer) → <strong className="text-foreground">si ça rentre</strong> (ajouté s’il reste du budget) → <strong className="text-foreground">exclu</strong> (ignoré).
        </p>
        <div className="flex flex-wrap gap-1.5">
          {visibleCategories.map((category) => {
            const priority = brief.slots[category] || 'excluded';
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSlot(category)}
                title={SLOT_HINT[priority]}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
                  priority === 'required' && 'bg-primary text-white border-primary',
                  priority === 'optional' && 'bg-primary/10 text-primary border-primary/40',
                  priority === 'excluded' && 'bg-surface text-muted border-border line-through decoration-muted/70',
                )}
              >
                {SERVICE_CATEGORY_LABELS[category]}
                <span className="opacity-70"> · {SLOT_SHORT[priority]}</span>
              </button>
            );
          })}
        </div>
        {suggested.length < SERVICE_CATEGORIES.length ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-primary"
            onClick={() => setShowAllTrades((value) => !value)}
          >
            {showAllTrades ? 'Masquer les autres métiers' : 'Afficher tous les métiers'}
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setAdvanced((value) => !value)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold"
        >
          Affiner (répartition, favoris, équipements)
          <ChevronDown className={cn('w-4 h-4 text-muted transition', advanced && 'rotate-180')} />
        </button>
        {advanced ? (
          <div className="px-3 pb-4 space-y-4 border-t border-border pt-3">
            <Input
              label="Budget minimum (FC)"
              type="number"
              min={0}
              step={50000}
              value={brief.budgetMinFc || ''}
              onChange={(e) => patch({ budgetMinFc: Number(e.target.value) || 0 })}
              hint="Optionnel. 0 = pas de plancher. Utile si vous refusez les packs trop bas."
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted">
                  Répartition de {formatFc(spendable)}
                  {shareSum !== 100 ? ` · ${shareSum} % saisis (rééquilibré au lancement)` : ''}
                </p>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-primary"
                  onClick={() => patch({ shares: defaultShares(brief.eventType, brief.includeVenue, brief.slots) })}
                >
                  Preset {eventTypeLabel(brief.eventType)}
                </button>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Chaque curseur fixe la part de l’enveloppe utile. Le pourcentage et le montant exact s’affichent ensemble.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rows.map((row) => (
                  <label key={row.key} className="space-y-1">
                    <span className="flex justify-between gap-2 text-[11px] font-semibold text-muted">
                      <span>{row.label}</span>
                      <span>{row.pct} % · {formatFc(row.amountFc)}</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={70}
                      value={row.pct}
                      onChange={(e) => patch({ shares: { ...brief.shares, [row.key]: Number(e.target.value) } })}
                      className="w-full"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldSelect
                label="Favoris"
                hint="Bonus : vos cœurs pèsent si deux offres se valent. Forcer : on les prend s’ils tiennent dans le poste. Ignorer : catalogue seul."
                value={brief.favoriteMode}
                onChange={(value) => patch({ favoriteMode: value as FavoriteMode })}
              >
                <option value="bonus">Bonus si égalité</option>
                <option value="force">Forcer s’ils tiennent dans le poste</option>
                <option value="ignore">Ignorer les favoris</option>
              </FieldSelect>
              <FieldSelect
                label="Catalogue"
                hint="Élargir : si trop peu d’offres, on relâche type ou date. Strict : uniquement adapté à votre type d’événement."
                value={brief.matchMode}
                onChange={(value) => patch({ matchMode: value as MatchMode })}
              >
                <option value="widen">Élargir s’il n’y a pas assez d’offres</option>
                <option value="exact">Uniquement adapté au type</option>
              </FieldSelect>
              <FieldSelect
                label="Métier introuvable"
                hint="Réallouer : l’argent du poste manquant va aux autres. Trou : le pack reste incomplet. Ville : on cherche plus loin."
                value={brief.missingStrategy}
                onChange={(value) => patch({ missingStrategy: value as MissingStrategy })}
              >
                <option value="reallocate">Réallouer le poste aux autres métiers</option>
                <option value="gap">Laisser un trou explicite</option>
                <option value="widen_city">Élargir la ville / commune</option>
              </FieldSelect>
              <FieldSelect
                label="Équipements salle"
                hint="Préférés : bonus si la salle les a. Obligatoires : une salle sans ces équipements est écartée."
                value={brief.amenityMode}
                onChange={(value) => patch({ amenityMode: value as AmenityMode })}
              >
                <option value="preferred">Préférés (bonus)</option>
                <option value="blocking">Obligatoires</option>
              </FieldSelect>
            </div>

            <label className="flex items-start gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={brief.distinctVenues}
                onChange={(e) => patch({ distinctVenues: e.target.checked })}
              />
              <span>
                Trois salles distinctes si le catalogue le permet
                <span className="block font-normal text-muted mt-0.5">
                  Les 3 packs n’affichent pas la même salle, pour comparer vraiment.
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Équipements souhaités pour la salle</p>
              <p className="text-[11px] text-muted leading-relaxed">
                Cochez ce que vous voulez (parking, groupe électrogène…). Selon le champ ci-dessus, ce sera un plus ou un filtre bloquant.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VENUE_AMENITIES.map((item) => {
                  const active = brief.venueAmenities.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => patch({
                        venueAmenities: active
                          ? brief.venueAmenities.filter((id) => id !== item.id)
                          : [...brief.venueAmenities, item.id],
                      })}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                        active ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <Button onClick={onSubmit} disabled={planning} leftIcon={planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}>
          {planning ? 'Recherche…' : 'Lancer la recherche'}
        </Button>
        <div className="flex flex-1 min-w-[12rem] gap-2">
          <Input
            value={briefName}
            onChange={(e) => setBriefName(e.target.value)}
            placeholder="Nom du brief (ex. Mariage juin)"
          />
          <Button variant="secondary" loading={saving} onClick={() => void saveBrief()} leftIcon={<Save className="w-4 h-4" />}>
            Sauver
          </Button>
        </div>
      </div>

      {briefs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Briefs enregistrés — cliquez pour les recharger</p>
          <ul className="flex flex-wrap gap-1.5">
            {briefs.map((item) => (
              <li key={item.id} className="inline-flex items-center rounded-full border border-border bg-surface-muted">
                <button
                  type="button"
                  onClick={() => onLoadBrief(item)}
                  className="px-2.5 py-1 text-[11px] font-semibold hover:text-primary"
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  onClick={() => void onDeleteBrief(item.id)}
                  className="px-2 text-[11px] text-muted hover:text-rose-600"
                  aria-label={`Supprimer ${item.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
