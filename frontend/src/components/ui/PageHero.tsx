import React from 'react';
import { cn } from '@/lib/cn';

export interface PageHeroProps {
  /** Petit repère au-dessus du titre (domaine de la page). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Photo affichée à droite ; elle s’efface progressivement vers le texte. */
  image?: string;
  /** Cadrage vertical de la photo (`object-position`). */
  imagePosition?: string;
  className?: string;
}

/** Bandeau de page : petit titre, titre, phrase, et photo à droite. */
export default function PageHero({ eyebrow, title, subtitle, image, imagePosition = 'center 48%', className }: PageHeroProps) {
  // Fondu en courbe douce : une photo sombre ne laisse pas de bande grise nette contre le fond clair.
  const mask =
    'linear-gradient(to right, transparent 0%, rgba(0,0,0,.04) 6%, rgba(0,0,0,.16) 12%, rgba(0,0,0,.4) 20%, rgba(0,0,0,.72) 29%, #000 40%)';
  return (
    <section className={cn('relative flex min-h-36 items-center overflow-hidden py-4 sm:min-h-44', className)}>
      <div className="relative z-10 min-w-0 max-w-[26rem]">
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute right-0 top-0 h-full w-3/5 max-w-[34rem] select-none object-cover opacity-60 sm:opacity-100"
          style={{ objectPosition: imagePosition, WebkitMaskImage: mask, maskImage: mask }}
        />
      ) : null}
    </section>
  );
}
