'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyBrandToDocument, deriveAuthPanelFromPrimary, type TenantBranding } from '@/lib/brandTheme';

export type AccentPresetId = 'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';
export type DensityId = 'comfortable' | 'compact';
export type FontScaleId = 'sm' | 'md' | 'lg';

export interface AccentPreset {
  id: AccentPresetId;
  label: string;
  primary: string;
  accent: string;
  /** Couleurs affichées dans le sélecteur (style KaziPay) */
  swatches: [string, string, string, string];
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'indigo',
    label: 'Indigo',
    primary: '#4f46e5',
    accent: '#6366f1',
    swatches: ['#4f46e5', '#22c55e', '#eab308', '#ef4444'],
  },
  {
    id: 'emerald',
    label: 'Émeraude',
    primary: '#059669',
    accent: '#34d399',
    swatches: ['#059669', '#0ea5e9', '#eab308', '#f43f5e'],
  },
  {
    id: 'sky',
    label: 'Ciel',
    primary: '#0284c7',
    accent: '#38bdf8',
    swatches: ['#0284c7', '#22c55e', '#f59e0b', '#a855f7'],
  },
  {
    id: 'amber',
    label: 'Ambre',
    primary: '#d97706',
    accent: '#fbbf24',
    swatches: ['#d97706', '#4f46e5', '#10b981', '#ef4444'],
  },
  {
    id: 'rose',
    label: 'Rose',
    primary: '#e11d48',
    accent: '#fb7185',
    swatches: ['#e11d48', '#6366f1', '#14b8a6', '#f59e0b'],
  },
  {
    id: 'violet',
    label: 'Violet',
    primary: '#7c3aed',
    accent: '#a78bfa',
    swatches: ['#7c3aed', '#06b6d4', '#84cc16', '#f97316'],
  },
];

export interface DashboardWidgets {
  greeting: boolean;
  stats: boolean;
  quota: boolean;
  recentEvents: boolean;
  billingCard: boolean;
  analyticsPromo: boolean;
}

export interface ViewPreferences {
  accent: AccentPresetId;
  density: DensityId;
  fontScale: FontScaleId;
  widgets: DashboardWidgets;
}

const STORAGE_KEY = 'em-view-prefs-v1';

export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
  accent: 'indigo',
  density: 'comfortable',
  fontScale: 'md',
  widgets: {
    greeting: true,
    stats: true,
    quota: true,
    recentEvents: true,
    billingCard: true,
    analyticsPromo: true,
  },
};

type StoredPayload = ViewPreferences & { accentCustomized?: boolean };

function readStored(): { prefs: ViewPreferences; accentCustomized: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    const prefs: ViewPreferences = {
      ...DEFAULT_VIEW_PREFERENCES,
      ...parsed,
      widgets: { ...DEFAULT_VIEW_PREFERENCES.widgets, ...parsed.widgets },
      accent: ACCENT_PRESETS.some((p) => p.id === parsed.accent)
        ? (parsed.accent as AccentPresetId)
        : DEFAULT_VIEW_PREFERENCES.accent,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      fontScale:
        parsed.fontScale === 'sm' || parsed.fontScale === 'lg' ? parsed.fontScale : 'md',
    };
    return {
      prefs,
      accentCustomized: parsed.accentCustomized === true,
    };
  } catch {
    return null;
  }
}

function applyDensityAndFont(density: DensityId, fontScale: FontScaleId) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.density = density;
  root.dataset.fontScale = fontScale;

  const fontMap = { sm: '14px', md: '15px', lg: '16px' } as const;
  root.style.fontSize = fontMap[fontScale];

  if (density === 'compact') {
    root.style.setProperty('--radius-card', '0.375rem');
    root.style.setProperty('--radius-button', '0.375rem');
  } else {
    root.style.setProperty('--radius-card', '0.5rem');
    root.style.setProperty('--radius-button', '0.5rem');
  }
}

function applyAccent(accentId: AccentPresetId, tenantBranding?: TenantBranding | null) {
  const preset = ACCENT_PRESETS.find((p) => p.id === accentId) || ACCENT_PRESETS[0];
  const authPanel = deriveAuthPanelFromPrimary(preset.primary);
  applyBrandToDocument({
    primary: preset.primary,
    accent: preset.accent,
    sidebar: tenantBranding?.sidebar,
    ...authPanel,
  });
}

function restoreTenantOrDefaultBrand(tenantBranding?: TenantBranding | null) {
  if (tenantBranding) {
    applyBrandToDocument(tenantBranding);
  } else {
    applyBrandToDocument(null);
  }
}

interface ViewPreferencesContextValue {
  prefs: ViewPreferences;
  ready: boolean;
  /** true si l’utilisateur a choisi une palette (sinon branding tenant / défaut) */
  accentCustomized: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  setAccent: (id: AccentPresetId) => void;
  setDensity: (d: DensityId) => void;
  setFontScale: (s: FontScaleId) => void;
  setWidget: (key: keyof DashboardWidgets, value: boolean) => void;
  resetPreferences: () => void;
  accentPreset: AccentPreset;
}

const ViewPreferencesContext = createContext<ViewPreferencesContextValue | undefined>(undefined);

export function ViewPreferencesProvider({
  children,
  tenantBranding,
}: {
  children: React.ReactNode;
  tenantBranding?: TenantBranding | null;
}) {
  const [prefs, setPrefs] = useState<ViewPreferences>(DEFAULT_VIEW_PREFERENCES);
  const [accentCustomized, setAccentCustomized] = useState(false);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setPrefs(stored.prefs);
      setAccentCustomized(stored.accentCustomized);
      applyDensityAndFont(stored.prefs.density, stored.prefs.fontScale);
      if (stored.accentCustomized) {
        applyAccent(stored.prefs.accent, tenantBranding);
      }
    } else {
      applyDensityAndFont(DEFAULT_VIEW_PREFERENCES.density, DEFAULT_VIEW_PREFERENCES.fontScale);
    }
    setReady(true);
  }, []);

  // Réappliquer l’accent utilisateur après branding tenant
  useEffect(() => {
    if (!ready || !accentCustomized) return;
    applyAccent(prefs.accent, tenantBranding);
  }, [tenantBranding, ready, prefs.accent, accentCustomized]);

  useEffect(() => {
    if (!ready || !accentCustomized) return;
    const onBrand = () => applyAccent(prefs.accent, tenantBranding);
    window.addEventListener('em-brand-applied', onBrand);
    return () => window.removeEventListener('em-brand-applied', onBrand);
  }, [ready, prefs.accent, tenantBranding, accentCustomized]);

  const persist = useCallback((next: ViewPreferences, nextAccentCustomized: boolean) => {
    setPrefs(next);
    setAccentCustomized(nextAccentCustomized);
    try {
      const payload: StoredPayload = { ...next, accentCustomized: nextAccentCustomized };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, []);

  const setAccent = useCallback(
    (id: AccentPresetId) => {
      const next = { ...prefs, accent: id };
      persist(next, true);
      applyAccent(id, tenantBranding);
    },
    [prefs, persist, tenantBranding],
  );

  const setDensity = useCallback(
    (density: DensityId) => {
      const next = { ...prefs, density };
      persist(next, accentCustomized);
      applyDensityAndFont(density, next.fontScale);
    },
    [prefs, persist, accentCustomized],
  );

  const setFontScale = useCallback(
    (fontScale: FontScaleId) => {
      const next = { ...prefs, fontScale };
      persist(next, accentCustomized);
      applyDensityAndFont(next.density, fontScale);
    },
    [prefs, persist, accentCustomized],
  );

  const setWidget = useCallback(
    (key: keyof DashboardWidgets, value: boolean) => {
      persist(
        {
          ...prefs,
          widgets: { ...prefs.widgets, [key]: value },
        },
        accentCustomized,
      );
    },
    [prefs, persist, accentCustomized],
  );

  const resetPreferences = useCallback(() => {
    setPrefs(DEFAULT_VIEW_PREFERENCES);
    setAccentCustomized(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    applyDensityAndFont(DEFAULT_VIEW_PREFERENCES.density, DEFAULT_VIEW_PREFERENCES.fontScale);
    restoreTenantOrDefaultBrand(tenantBranding);
  }, [tenantBranding]);

  const accentPreset = useMemo(
    () => ACCENT_PRESETS.find((p) => p.id === prefs.accent) || ACCENT_PRESETS[0],
    [prefs.accent],
  );

  const value = useMemo(
    () => ({
      prefs,
      ready,
      accentCustomized,
      drawerOpen,
      setDrawerOpen,
      toggleDrawer: () => setDrawerOpen((o) => !o),
      setAccent,
      setDensity,
      setFontScale,
      setWidget,
      resetPreferences,
      accentPreset,
    }),
    [
      prefs,
      ready,
      accentCustomized,
      drawerOpen,
      setAccent,
      setDensity,
      setFontScale,
      setWidget,
      resetPreferences,
      accentPreset,
    ],
  );

  return (
    <ViewPreferencesContext.Provider value={value}>{children}</ViewPreferencesContext.Provider>
  );
}

export function useViewPreferences() {
  const ctx = useContext(ViewPreferencesContext);
  if (!ctx) {
    throw new Error('useViewPreferences must be used within ViewPreferencesProvider');
  }
  return ctx;
}

/** Hook optionnel (pages hors provider). */
export function useViewPreferencesOptional() {
  return useContext(ViewPreferencesContext);
}
