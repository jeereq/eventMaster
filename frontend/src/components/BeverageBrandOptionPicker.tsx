'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  BEVERAGE_KINDS,
  BEVERAGE_KIND_LABELS,
  type BeverageBrandRow,
  type BeverageKind,
} from '@/lib/beverageBrands';

const MAX_INVITATION_BRANDS = 24;

export default function BeverageBrandOptionPicker({
  options,
  onChange,
}: {
  options?: string;
  onChange: (options: string) => void;
}) {
  const [brands, setBrands] = useState<BeverageBrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<BeverageKind | 'ALL'>('ALL');

  useEffect(() => {
    let cancelled = false;
    api.get('/beverage-brands')
      .then((data) => {
        if (!cancelled) setBrands(Array.isArray(data.brands) ? data.brands.filter((brand: BeverageBrandRow) => brand.isActive) : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les marques.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => {
    const labels = new Set((options || '').split(',').map((part) => part.trim()).filter(Boolean));
    return new Set(brands.filter((brand) => labels.has(brand.invitationOption)).map((brand) => brand.id));
  }, [brands, options]);

  const visible = brands.filter((brand) => kind === 'ALL' || brand.kind === kind);

  const toggle = (brand: BeverageBrandRow) => {
    const next = new Set(selected);
    if (next.has(brand.id)) next.delete(brand.id);
    else if (next.size >= MAX_INVITATION_BRANDS) return;
    else next.add(brand.id);
    const ordered = brands.filter((item) => next.has(item.id));
    onChange(ordered.map((item) => item.invitationOption).join(', '));
  };

  if (loading) {
    return (
      <p className="text-xs text-muted inline-flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Chargement des marques…
      </p>
    );
  }

  if (error) return <p className="text-xs text-rose-700">{error}</p>;
  if (!brands.length) {
    return <p className="text-xs text-muted">Aucune marque active. Le catalogue se gère depuis le catalogue administrateur.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <KindChip active={kind === 'ALL'} label="Toutes" onClick={() => setKind('ALL')} />
        {BEVERAGE_KINDS.map((item) => (
          <KindChip key={item} active={kind === item} label={BEVERAGE_KIND_LABELS[item]} onClick={() => setKind(item)} />
        ))}
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {visible.map((brand) => {
          const checked = selected.has(brand.id);
          return (
            <label key={brand.id} className="flex items-center gap-2 px-2.5 py-2 text-xs cursor-pointer hover:bg-surface-muted">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(brand)}
                className="rounded text-primary focus:ring-primary"
              />
              {brand.imageUrl ? (
                <img src={brand.imageUrl} alt="" className="w-8 h-8 rounded object-cover border border-border" />
              ) : null}
              <span className="font-medium text-foreground">{brand.name}</span>
              <span className="text-muted">{brand.kindLabel}</span>
              {brand.volumeLabel ? <span className="text-muted">{brand.volumeLabel}</span> : null}
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-muted">
        {selected.size} marque{selected.size > 1 ? 's' : ''} proposée{selected.size > 1 ? 's' : ''} à l’invité
        {selected.size >= MAX_INVITATION_BRANDS ? ` (maximum ${MAX_INVITATION_BRANDS})` : ''}.
      </p>
    </div>
  );
}

function KindChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded-full text-[11px] font-semibold border',
        active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted',
      )}
    >
      {label}
    </button>
  );
}
