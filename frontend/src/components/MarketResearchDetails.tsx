'use client';

import React from 'react';
import { ExternalLink, Search } from '@/components/icons';

export type MarketResearchSource = { title: string; url: string; price?: string; excerpt?: string; date?: string };

function formatDay(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
}

/**
 * Détail d’un prix trouvé en ligne : explication de l’IA, pages citées avec le prix relevé et la phrase
 * qui le donne, requêtes tapées dans le moteur de recherche, modèle et date.
 */
export default function MarketResearchDetails({
  rationale,
  sources,
  searchQueries,
  model,
  foundAt,
}: {
  rationale?: string | null;
  sources?: MarketResearchSource[] | null;
  searchQueries?: string[] | null;
  model?: string | null;
  foundAt?: string | null;
}) {
  const day = formatDay(foundAt);
  return (
    <div className="space-y-2.5 text-xs">
      {rationale ? (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">Ce que couvre ce prix</p>
          <p className="text-muted leading-relaxed">{rationale}</p>
        </div>
      ) : null}
      {sources?.length ? (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            {sources.length > 1 ? `${sources.length} pages consultées` : 'Page consultée'}
          </p>
          <ul className="space-y-1.5">
            {sources.map((source) => (
              <li key={source.url} className="min-w-0 rounded-lg border border-border/60 bg-surface p-2 space-y-0.5">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex max-w-full items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden />
                  <span className="truncate">{source.title}</span>
                </a>
                {source.price || source.date ? (
                  <p className="text-foreground">
                    {source.price ? <>Prix relevé : <strong className="tabular-nums">{source.price}</strong></> : null}
                    {source.price && source.date ? ' · ' : ''}
                    {source.date ? <span className="text-muted">publié {source.date}</span> : null}
                  </p>
                ) : null}
                {source.excerpt ? <p className="text-muted italic break-words">« {source.excerpt} »</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {searchQueries?.length ? (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Recherches effectuées</p>
          <ul className="flex flex-wrap gap-1">
            {searchQueries.map((query) => (
              <li key={query} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-muted">
                <Search className="w-3 h-3 shrink-0" aria-hidden />
                <span className="truncate">{query}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {model || day ? (
        <p className="text-muted">
          Trouvé{day ? ` le ${day}` : ''}{model ? ` par ${model}` : ''}.
        </p>
      ) : null}
    </div>
  );
}
