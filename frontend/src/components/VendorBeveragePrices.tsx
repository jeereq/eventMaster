'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Beer, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Badge, Button, EmptyState } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  BEVERAGE_KINDS,
  BEVERAGE_KIND_LABELS,
  BEVERAGE_SALE_UNITS,
  BEVERAGE_SALE_UNIT_LABELS,
  DEFAULT_SALE_QUANTITY,
  formatBeverageSale,
  type BeverageKind,
  type BeverageSaleUnit,
  type VendorBeverageBrandRow,
} from '@/lib/beverageBrands';

type DraftLine = {
  key: string;
  unitKind: BeverageSaleUnit;
  quantity: string;
  unitLabel: string;
  priceFc: string;
  promoPriceFc: string;
  promoLabel: string;
  promoEndsAt: string;
  isAvailable: boolean;
};

type DraftPrice = {
  selling: boolean;
  lines: DraftLine[];
};

function newLine(unitKind: BeverageSaleUnit = 'BOTTLE'): DraftLine {
  return {
    key: `${unitKind}-${Math.random().toString(36).slice(2, 8)}`,
    unitKind,
    quantity: String(DEFAULT_SALE_QUANTITY[unitKind]),
    unitLabel: unitKind === 'OTHER' ? '' : '',
    priceFc: '',
    promoPriceFc: '',
    promoLabel: '',
    promoEndsAt: '',
    isAvailable: true,
  };
}

function promoFieldError(line: DraftLine): string {
  if (!line.promoPriceFc.trim()) return '';
  const price = Number(line.priceFc);
  const promo = Number(line.promoPriceFc);
  if (!line.priceFc.trim() || !Number.isFinite(price) || price <= 0) {
    return 'Indiquez le tarif normal avant la promotion.';
  }
  if (!Number.isFinite(promo) || promo < 0) return 'Le prix promotionnel doit être un montant en FC.';
  if (promo >= price) return 'Le prix promotionnel doit rester inférieur au tarif.';
  return '';
}

function promoIsActive(line: DraftLine): boolean {
  if (promoFieldError(line) || !line.promoPriceFc.trim()) return false;
  if (!line.promoEndsAt) return true;
  const end = new Date(line.promoEndsAt);
  return !Number.isNaN(end.getTime()) && end.getTime() >= Date.now();
}

function nextUnit(lines: DraftLine[]): BeverageSaleUnit {
  const used = new Set(lines.map((line) => line.unitKind));
  return BEVERAGE_SALE_UNITS.find((unit) => unit === 'OTHER' || !used.has(unit)) || 'OTHER';
}

function draftFromBrand(brand: VendorBeverageBrandRow): DraftPrice {
  const lines = (brand.myPrices || []).map((price) => ({
    key: price.id,
    unitKind: price.unitKind,
    quantity: String(price.quantity),
    unitLabel: price.unitKind === 'OTHER' ? price.unitLabel : '',
    priceFc: String(price.priceFc),
    promoPriceFc: price.promoPriceFc != null ? String(price.promoPriceFc) : '',
    promoLabel: price.promoLabel || '',
    promoEndsAt: price.promoEndsAt ? String(price.promoEndsAt).slice(0, 10) : '',
    isAvailable: price.isAvailable,
  }));
  return {
    selling: lines.length > 0,
    lines: lines.length ? lines : [newLine()],
  };
}

export default function VendorBeveragePrices() {
  const [brands, setBrands] = useState<VendorBeverageBrandRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftPrice>>({});
  const [kind, setKind] = useState<BeverageKind | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/marketplace/beverage-catalog');
      const rows: VendorBeverageBrandRow[] = Array.isArray(data.brands) ? data.brands : [];
      setBrands(rows);
      setDrafts(Object.fromEntries(rows.map((brand) => [brand.id, draftFromBrand(brand)])));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le catalogue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => brands.filter((brand) => kind === 'ALL' || brand.kind === kind),
    [brands, kind],
  );

  const patchLine = (brandId: string, key: string, next: Partial<DraftLine>) => {
    setDrafts((prev) => {
      const current = prev[brandId];
      if (!current) return prev;
      return {
        ...prev,
        [brandId]: {
          ...current,
          lines: current.lines.map((line) => {
            if (line.key !== key) return line;
            const merged = { ...line, ...next };
            if (next.unitKind && next.unitKind !== line.unitKind) {
              merged.quantity = String(DEFAULT_SALE_QUANTITY[next.unitKind]);
              if (next.unitKind !== 'OTHER') merged.unitLabel = '';
            }
            return merged;
          }),
        },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const promoIssue = brands.flatMap((brand) => {
        const draft = drafts[brand.id];
        if (!draft?.selling) return [];
        return draft.lines.flatMap((line) => {
          const message = promoFieldError(line);
          return message ? [`${brand.name} : ${message}`] : [];
        });
      })[0];
      if (promoIssue) {
        setError(promoIssue);
        setSaving(false);
        return;
      }
      const offers = brands.flatMap((brand) => {
        const draft = drafts[brand.id];
        if (!draft?.selling) return [];
        return draft.lines.map((line) => {
          const priceFc = Math.round(Number(line.priceFc));
          const quantity = Math.round(Number(line.quantity));
          if (!Number.isFinite(priceFc) || priceFc < 0) {
            throw new Error(`Indiquez un prix en FC pour ${brand.name}.`);
          }
          if (!Number.isFinite(quantity) || quantity < 1) {
            throw new Error(`Indiquez la quantité vendue pour ${brand.name}.`);
          }
          if (line.unitKind === 'OTHER' && line.unitLabel.trim().length < 2) {
            throw new Error(`Précisez le conditionnement « Autre » pour ${brand.name}.`);
          }
          return {
            brandId: brand.id,
            priceFc,
            unitKind: line.unitKind,
            quantity,
            unitLabel: line.unitLabel.trim(),
            promoPriceFc: line.promoPriceFc.trim() ? Number(line.promoPriceFc) : null,
            promoLabel: line.promoLabel.trim(),
            promoEndsAt: line.promoEndsAt || null,
            isAvailable: line.isAvailable,
          };
        });
      });
      const data = await api.put('/marketplace/beverage-prices', { offers });
      const rows: VendorBeverageBrandRow[] = Array.isArray(data.brands) ? data.brands : [];
      setBrands(rows);
      setDrafts(Object.fromEntries(rows.map((brand) => [brand.id, draftFromBrand(brand)])));
      setSuccess(offers.length
        ? `${offers.length} tarif${offers.length > 1 ? 's' : ''} enregistré${offers.length > 1 ? 's' : ''}.`
        : 'Aucun tarif : votre carte des marques a été vidée.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <span className="sr-only">Chargement des marques</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground">Marques et prix</h2>
        <p className="text-sm text-muted leading-relaxed">
          Cochez les marques que vous vendez. Pour chacune, définissez la quantité : bouteille, casier, pack, ou un autre conditionnement, avec son prix.
        </p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <div className="flex flex-wrap gap-1.5">
        <KindButton active={kind === 'ALL'} label="Toutes" onClick={() => setKind('ALL')} />
        {BEVERAGE_KINDS.map((item) => (
          <KindButton key={item} active={kind === item} label={BEVERAGE_KIND_LABELS[item]} onClick={() => setKind(item)} />
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Beer className="w-5 h-5" />}
          title="Aucune marque au catalogue"
          description="Le catalogue plateforme ne contient pas encore de marque dans cette famille."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((brand) => {
            const draft = drafts[brand.id] || draftFromBrand(brand);
            return (
              <li key={brand.id} className="rounded-xl border border-border bg-surface p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {brand.imageUrl ? (
                      <img src={brand.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                    ) : null}
                    <p className="font-semibold text-foreground">{brand.name}</p>
                      <Badge variant="default">{brand.kindLabel}</Badge>
                      {!brand.isActive ? <Badge variant="warning">Retirée du catalogue</Badge> : null}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {[brand.producer, brand.volumeLabel].filter(Boolean).join(' · ') || 'Catalogue plateforme'}
                      {brand.priceFromFc != null ? ` · autres prestataires dès ${formatFc(brand.priceFromFc)}` : ''}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold shrink-0">
                    <input
                      type="checkbox"
                      checked={draft.selling}
                      onChange={(e) => setDrafts((prev) => ({
                        ...prev,
                        [brand.id]: { ...draft, selling: e.target.checked },
                      }))}
                      className="rounded text-primary focus:ring-primary"
                    />
                    Je vends
                  </label>
                </div>
                {draft.selling ? (
                  <div className="space-y-2">
                    {draft.lines.map((line) => (
                      <div key={line.key} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_5.5rem_minmax(0,1fr)_auto] gap-2 items-end">
                        <label className="space-y-1 block">
                          <span className="text-xs font-semibold text-muted">Conditionnement</span>
                          <select
                            value={line.unitKind}
                            onChange={(e) => patchLine(brand.id, line.key, { unitKind: e.target.value as BeverageSaleUnit })}
                            className="w-full min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
                          >
                            {BEVERAGE_SALE_UNITS.map((unit) => (
                              <option key={unit} value={unit}>{BEVERAGE_SALE_UNIT_LABELS[unit]}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 block">
                          <span className="text-xs font-semibold text-muted">Quantité</span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => patchLine(brand.id, line.key, { quantity: e.target.value })}
                            className="w-full min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
                            aria-label={`Quantité pour ${brand.name}`}
                          />
                        </label>
                        <label className="space-y-1 block">
                          <span className="text-xs font-semibold text-muted">
                            Prix (FC) · {formatBeverageSale({
                              unitKind: line.unitKind,
                              quantity: Number(line.quantity) || 1,
                              unitLabel: line.unitLabel || 'Autre',
                            })}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={line.priceFc}
                            onChange={(e) => patchLine(brand.id, line.key, { priceFc: e.target.value })}
                            className="w-full min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
                            placeholder="2500"
                          />
                        </label>
                        <label className="space-y-1 block sm:col-span-2">
                          <span className="text-xs font-semibold text-muted">Prix promo (FC, optionnel)</span>
                          <input
                            type="number"
                            min={0}
                            value={line.promoPriceFc}
                            onChange={(e) => patchLine(brand.id, line.key, { promoPriceFc: e.target.value })}
                            className={`w-full min-h-11 px-3 rounded-lg border bg-surface text-sm ${promoFieldError(line) ? 'border-danger' : 'border-border'}`}
                            placeholder="Inférieur au tarif"
                            aria-invalid={promoFieldError(line) ? true : undefined}
                          />
                          {promoFieldError(line) ? (
                            <span className="text-xs text-danger" role="alert">{promoFieldError(line)}</span>
                          ) : null}
                        </label>
                        <label className="space-y-1 block sm:col-span-2">
                          <span className="text-xs font-semibold text-muted">Libellé promo</span>
                          <input
                            type="text"
                            value={line.promoLabel}
                            onChange={(e) => patchLine(brand.id, line.key, { promoLabel: e.target.value })}
                            className="w-full min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
                            placeholder="Offre du mois"
                          />
                        </label>
                        <label className="space-y-1 block sm:col-span-2">
                          <span className="text-xs font-semibold text-muted">Fin de promotion</span>
                          <input
                            type="date"
                            value={line.promoEndsAt}
                            onChange={(e) => patchLine(brand.id, line.key, { promoEndsAt: e.target.value })}
                            className="w-full min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
                          />
                        </label>
                        {line.promoPriceFc.trim() && !promoFieldError(line) ? (
                          <p className="sm:col-span-4 text-xs text-muted">
                            {promoIsActive(line)
                              ? `Tarif affiché : ${formatFc(Math.round(Number(line.promoPriceFc)))} au lieu de ${formatFc(Math.round(Number(line.priceFc)))}${line.promoEndsAt ? ` jusqu’au ${line.promoEndsAt.split('-').reverse().join('/')}` : ''}.`
                              : 'Date passée : le tarif normal est affiché.'}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-border text-muted hover:text-rose-700"
                          aria-label={`Retirer ce conditionnement de ${brand.name}`}
                          onClick={() => setDrafts((prev) => ({
                            ...prev,
                            [brand.id]: {
                              ...draft,
                              lines: draft.lines.length === 1 ? [newLine()] : draft.lines.filter((item) => item.key !== line.key),
                            },
                          }))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {line.unitKind === 'OTHER' ? (
                          <label className="space-y-1 block sm:col-span-3">
                            <span className="text-xs font-semibold text-muted">Précisez (fût, magnum, cubi…)</span>
                            <input
                              type="text"
                              value={line.unitLabel}
                              onChange={(e) => patchLine(brand.id, line.key, { unitLabel: e.target.value })}
                              className="w-full min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
                              placeholder="Fût"
                            />
                          </label>
                        ) : null}
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setDrafts((prev) => ({
                        ...prev,
                        [brand.id]: { ...draft, lines: [...draft.lines, newLine(nextUnit(draft.lines))] },
                      }))}
                    >
                      Ajouter un conditionnement
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Button type="button" onClick={() => void save()} loading={saving} className="min-h-11">
        Enregistrer mes prix
      </Button>
    </div>
  );
}

function KindButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 px-3 rounded-full text-xs font-semibold border ${
        active ? 'bg-primary-solid text-primary-foreground border-primary-solid' : 'border-border text-muted'
      }`}
    >
      {label}
    </button>
  );
}
