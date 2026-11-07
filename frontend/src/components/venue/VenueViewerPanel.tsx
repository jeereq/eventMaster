'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { Building2, LayoutGrid, Users, Ruler } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatLocationLine, sizedMediaUrl, type PublicVenue } from '@/lib/marketplace';
import { formatLayoutFacts, type VenueLayoutSummary } from '@/lib/venueLayouts';

type PanelTab = 'layouts' | 'spaces';
const THUMB_WIDTH = 320;

interface Props {
  layouts: VenueLayoutSummary[];
  activeLayoutId: string;
  onSelectLayout: (layoutId: string) => void;
  onPrefetchLayout?: (layoutId: string) => void;
  spaces: PublicVenue[];
  spaceHref: (slug: string) => string;
  /** Ouvre les liens des autres espaces dans un nouvel onglet (cas de l'intégration en iframe). */
  spaceLinkTarget?: '_self' | '_blank';
  className?: string;
}

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted">
        <LayoutGrid className="h-5 w-5" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sizedMediaUrl(url, THUMB_WIDTH)} alt={alt} loading="lazy" className="h-16 w-24 shrink-0 rounded-md object-cover" />
  );
}

function Facts({ layout }: { layout: Pick<VenueLayoutSummary, 'capacityMax' | 'areaM2'> }) {
  const { capacityLabel, areaLabel } = formatLayoutFacts(layout);
  if (!capacityLabel && !areaLabel) return null;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
      {capacityLabel ? (
        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" aria-hidden />{capacityLabel}</span>
      ) : null}
      {areaLabel ? (
        <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" aria-hidden />{areaLabel}</span>
      ) : null}
    </p>
  );
}

export default function VenueViewerPanel({
  layouts,
  activeLayoutId,
  onSelectLayout,
  onPrefetchLayout,
  spaces,
  spaceHref,
  spaceLinkTarget = '_self',
  className,
}: Props) {
  const baseId = useId();
  const hasLayouts = layouts.length > 1;
  const hasSpaces = spaces.length > 0;
  const [tab, setTab] = useState<PanelTab>(hasLayouts ? 'layouts' : 'spaces');
  const activeTab: PanelTab = tab === 'layouts' && !hasLayouts ? 'spaces' : tab === 'spaces' && !hasSpaces ? 'layouts' : tab;

  const tabs = [
    hasLayouts ? { id: 'layouts' as const, label: 'Dispositions', icon: LayoutGrid } : null,
    hasSpaces ? { id: 'spaces' as const, label: 'Espaces', icon: Building2 } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <div className={cn('flex min-h-0 flex-col rounded-xl border border-border/70 bg-background/95 shadow-lg backdrop-blur-md', className)}>
      <div role="tablist" aria-label="Choix de la visite" className="flex shrink-0 gap-1 border-b border-border/70 p-1.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`${baseId}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`${baseId}-panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              activeTab === id ? 'bg-primary-solid text-primary-foreground' : 'text-foreground/80 hover:bg-surface-muted',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div
        id={`${baseId}-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      >
        {activeTab === 'layouts' ? (
          <ul className="flex flex-col gap-2">
            {layouts.map((layout) => {
              const active = layout.id === activeLayoutId;
              return (
                <li key={layout.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectLayout(layout.id)}
                    onPointerEnter={() => onPrefetchLayout?.(layout.id)}
                    onFocus={() => onPrefetchLayout?.(layout.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      active ? 'border-primary bg-primary/5' : 'border-border/70 hover:bg-surface-muted',
                    )}
                  >
                    <Thumb url={layout.thumbnailUrl} alt="" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{layout.name}</span>
                      <Facts layout={layout} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="flex flex-col gap-2">
            {spaces.map((space) => (
              <li key={space.slug}>
                <Link
                  href={spaceHref(space.slug)}
                  target={spaceLinkTarget}
                  rel={spaceLinkTarget === '_blank' ? 'noopener noreferrer' : undefined}
                  className="flex w-full items-start gap-3 rounded-lg border border-border/70 p-2 transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Thumb url={space.coverUrl ?? space.photos[0] ?? null} alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{space.headline || space.name}</span>
                    <span className="block truncate text-xs text-muted">{formatLocationLine(space)}</span>
                    <Facts layout={{ capacityMax: space.capacity, areaM2: null }} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
