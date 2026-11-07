'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Code2, Copy } from 'lucide-react';
import { Button } from '@/components/ui';
import { appOrigin } from '@/lib/share';
import { buildEmbedPath, buildEmbedSnippet } from '@/lib/venueEmbed';

const COPIED_FEEDBACK_MS = 2500;

interface Props {
  slug: string;
  title: string;
}

/** Code d'intégration de la visite 3D publique à coller sur le site du propriétaire. */
export default function EmbedCodeCard({ slug, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const snippet = buildEmbedSnippet(appOrigin(), slug, title);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copy = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Code2 className="h-4 w-4 text-primary" aria-hidden />
            Intégrer la visite 3D sur votre site
          </p>
          <p className="max-w-2xl text-xs leading-relaxed text-muted">
            Collez ce code dans la page de votre site : vos visiteurs explorent la salle et ses dispositions publiées sans
            quitter votre page. Un bouton les renvoie vers votre fiche EventMaster pour demander un devis.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void copy()}
          leftIcon={copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        >
          {copied ? 'Code copié' : 'Copier le code'}
        </Button>
      </div>
      <textarea
        readOnly
        aria-label="Code d’intégration (iframe)"
        value={snippet}
        rows={7}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-3 w-full resize-none rounded-lg border border-border bg-surface-muted p-3 font-mono text-[11px] leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <p className="mt-2 text-[11px] text-muted" aria-live="polite">
        {copyFailed
          ? 'Copie impossible : sélectionnez le code ci-dessus et copiez-le manuellement.'
          : (
            <>
              Aperçu direct : <span className="font-mono">{buildEmbedPath(slug)}</span>
            </>
          )}
      </p>
    </div>
  );
}
