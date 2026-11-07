'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Images, Loader2, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, Send } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { cn } from '@/lib/cn';
import { sizedMediaUrl, type PublicVenue } from '@/lib/marketplace';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { MAIN_LAYOUT_ID, hasLayoutChoice, normalizeLayouts, resolveInitialLayoutId } from '@/lib/venueLayouts';
import VenueGalleryDialog from './VenueGalleryDialog';
import VenueViewerPanel from './VenueViewerPanel';
import { useElementFullscreen } from './useElementFullscreen';
import { useVenueLayoutBlueprint } from './useVenueLayoutBlueprint';

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
      <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-background">Chargement 3D…</span>
    </div>
  ),
});

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const POSTER_WIDTH = 1280;

const overlayButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 touch-manipulation';

interface Props {
  venue: PublicVenue;
  /** Lien d'un autre espace du même propriétaire. */
  spaceHref?: (slug: string) => string;
  spaceLinkTarget?: '_self' | '_blank';
  /** Action « Contacter » dans la page (défilement vers le formulaire de devis). */
  onContact?: () => void;
  /** Lien « Contacter » quand la visionneuse est intégrée ailleurs (ouvre la fiche EventMaster). */
  contactHref?: string;
  shareUrl?: string;
  className?: string;
}

export default function VenueImmersiveViewer({
  venue,
  spaceHref = (slug) => `/marketplace/salles/${encodeURIComponent(slug)}`,
  spaceLinkTarget = '_self',
  onContact,
  contactHref,
  shareUrl,
  className,
}: Props) {
  const layouts = useMemo(() => normalizeLayouts(venue.layouts), [venue.layouts]);
  const mainBlueprint = (venue.layoutPreview as RoomLayoutBlueprint | null | undefined) ?? null;
  const spaces = venue.relatedVenues ?? [];
  const hasPanel = hasLayoutChoice(layouts) || spaces.length > 0;

  const [started, setStarted] = useState(false);
  const [activeLayoutId, setActiveLayoutId] = useState(() => resolveInitialLayoutId(layouts, MAIN_LAYOUT_ID));
  const [panelOpen, setPanelOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { ref, isFullscreen, cssFullscreen, toggle, exit } = useElementFullscreen<HTMLElement>();

  const { blueprint, loading, error, prefetch } = useVenueLayoutBlueprint({
    venueSlug: venue.slug,
    activeLayoutId,
    mainBlueprint,
    enabled: started,
  });

  // Sur grand écran, le panneau s'ouvre dès que la visite démarre ; sur mobile il reste fermé.
  const startExperience = () => {
    setStarted(true);
    if (window.matchMedia(DESKTOP_MEDIA_QUERY).matches) setPanelOpen(true);
  };

  // La fenêtre galerie / le formulaire ne s'affichent pas au-dessus d'un élément en plein écran.
  const openGallery = () => {
    void exit();
    setGalleryOpen(true);
  };
  const handleContact = () => {
    void exit();
    onContact?.();
  };

  const posterUrl = venue.coverUrl ?? venue.photos[0] ?? null;
  const title = venue.headline || venue.name;
  const contactVisible = Boolean(onContact || contactHref);

  return (
    <section
      ref={ref}
      aria-label={`Visite 3D · ${title}`}
      className={cn(
        'relative isolate overflow-hidden bg-stage text-stage-foreground',
        isFullscreen
          ? cn('h-dvh w-full rounded-none', cssFullscreen && 'fixed inset-0 z-[250]')
          : 'aspect-[4/5] min-h-[360px] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] sm:aspect-[16/10] lg:aspect-[21/9]',
        className,
      )}
    >
      <div className="absolute inset-0">
        {started && blueprint ? (
          <RoomLayoutPreview blueprint={blueprint} quality="showcase" showMeta={false} fill allowExpand={false} />
        ) : (
          <div className="absolute inset-0">
            {posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sizedMediaUrl(posterUrl, POSTER_WIDTH)}
                alt=""
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-stage/90 via-stage/40 to-stage/20" aria-hidden />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <button
                type="button"
                onClick={startExperience}
                disabled={started}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary-solid px-5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 touch-manipulation"
              >
                {started ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Box className="h-4 w-4" aria-hidden />}
                {started ? 'Chargement…' : 'Explorer en 3D'}
              </button>
            </div>
          </div>
        )}
      </div>

      {started && hasPanel && panelOpen ? (
        <VenueViewerPanel
          layouts={layouts}
          activeLayoutId={activeLayoutId}
          onSelectLayout={setActiveLayoutId}
          onPrefetchLayout={prefetch}
          spaces={spaces}
          spaceHref={spaceHref}
          spaceLinkTarget={spaceLinkTarget}
          className="absolute inset-x-2 bottom-16 z-20 max-h-[48%] lg:inset-x-auto lg:left-2.5 lg:top-16 lg:bottom-16 lg:max-h-none lg:w-72"
        />
      ) : null}

      <div className="absolute right-2.5 top-2.5 z-30 flex flex-wrap items-center justify-end gap-1.5">
        {started && hasPanel ? (
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-pressed={panelOpen}
            className={overlayButtonClass}
          >
            {panelOpen ? <PanelLeftClose className="h-4 w-4" aria-hidden /> : <PanelLeftOpen className="h-4 w-4" aria-hidden />}
            <span>{hasLayoutChoice(layouts) ? 'Dispositions' : 'Espaces'}</span>
          </button>
        ) : null}
        {venue.photos.length > 0 ? (
          <button type="button" onClick={openGallery} className={overlayButtonClass}>
            <Images className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Galerie</span>
            <span className="sr-only sm:hidden">Galerie</span>
          </button>
        ) : null}
        <button type="button" onClick={() => void toggle()} aria-pressed={isFullscreen} className={overlayButtonClass}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
          <span className="sr-only sm:hidden">{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
        </button>
        <ShareButton
          title={title}
          text={venue.orgName}
          url={shareUrl}
          variant="icon"
        />
        {contactVisible ? (
          contactHref ? (
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(overlayButtonClass, 'bg-primary-solid text-primary-foreground hover:bg-primary-solid hover:opacity-95')}
            >
              <Send className="h-4 w-4" aria-hidden />
              <span>Contacter</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleContact}
              className={cn(overlayButtonClass, 'bg-primary-solid text-primary-foreground hover:bg-primary-solid hover:opacity-95')}
            >
              <Send className="h-4 w-4" aria-hidden />
              <span>Contacter</span>
            </button>
          )
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center px-3" aria-live="polite">
        {loading ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/80 px-3 py-1 text-xs font-semibold text-background">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            Chargement de la disposition…
          </span>
        ) : error ? (
          <span role="alert" className="rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white">{error}</span>
        ) : null}
      </div>

      <VenueGalleryDialog open={galleryOpen} onClose={() => setGalleryOpen(false)} photos={venue.photos} title={title} />
    </section>
  );
}
