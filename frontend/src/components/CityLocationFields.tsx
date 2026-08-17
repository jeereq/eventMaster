'use client';

import React from 'react';
import {
  communesForCity,
  findRdcCity,
  neighborhoodsFor,
  normalizeRdcCity,
  type RdcCityName,
} from '@/lib/rdcCities';
import { cn } from '@/lib/cn';

const SELECT_CLASS =
  'w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

export default function CityLocationFields({
  city,
  commune,
  neighborhood,
  onChange,
  required = true,
  className,
}: {
  city: string;
  commune: string;
  neighborhood: string;
  onChange: (next: { city: string; commune: string; neighborhood: string }) => void;
  required?: boolean;
  className?: string;
}) {
  const cityName = normalizeRdcCity(city);
  const communes = communesForCity(cityName);
  const quartiers = neighborhoodsFor(cityName, commune);

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      <label>
        <span className="block text-xs font-medium text-muted mb-1.5">
          Ville{required ? <span className="text-rose-500"> *</span> : null}
        </span>
        <select
          value={cityName || ''}
          required={required}
          onChange={(e) => {
            const next = (e.target.value || '') as RdcCityName | '';
            onChange({ city: next, commune: '', neighborhood: '' });
          }}
          className={SELECT_CLASS}
        >
          <option value="">Choisir Kinshasa ou Lubumbashi</option>
          {(['Kinshasa', 'Lubumbashi'] as const).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="block text-xs font-medium text-muted mb-1.5">
          Commune{required ? <span className="text-rose-500"> *</span> : null}
        </span>
        <select
          value={commune}
          required={required}
          disabled={!cityName}
          onChange={(e) => onChange({ city: cityName || '', commune: e.target.value, neighborhood: '' })}
          className={SELECT_CLASS}
        >
          <option value="">{cityName ? 'Choisir une commune' : 'D’abord la ville'}</option>
          {communes.map((item) => (
            <option key={item.name} value={item.name}>{item.name}</option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="block text-xs font-medium text-muted mb-1.5">
          Quartier{required ? <span className="text-rose-500"> *</span> : null}
        </span>
        <select
          value={neighborhood}
          required={required}
          disabled={!commune}
          onChange={(e) => onChange({ city: cityName || '', commune, neighborhood: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value="">{commune ? 'Choisir un quartier' : 'D’abord la commune'}</option>
          {quartiers.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>
      <p className="sm:col-span-2 text-[11px] text-muted -mt-1">
        Marketplace limité à {findRdcCity(cityName)?.name || 'Kinshasa et Lubumbashi'}. La carte se cadre sur la ville et la commune choisies.
      </p>
    </div>
  );
}
