'use client';

import React, { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { canonicalShareUrl, shareOrCopy } from '@/lib/share';

export default function ShareButton({
  title,
  text,
  url,
  label = 'Partager',
  variant = 'icon',
  className,
}: {
  title: string;
  text?: string;
  url?: string;
  label?: string;
  variant?: 'icon' | 'button' | 'fab';
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    try {
      const result = await shareOrCopy({
        title,
        text,
        url: url || canonicalShareUrl(),
      });
      if (result === 'copied') {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* ignore */
    }
  };

  const icon = copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />;
  const caption = copied ? 'Lien copié' : label;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => void onShare()}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--radius-button)] text-xs font-semibold border border-border bg-surface text-foreground hover:bg-surface-muted transition',
          className,
        )}
        aria-label={caption}
      >
        {icon}
        {caption}
      </button>
    );
  }

  if (variant === 'fab') {
    return (
      <button
        type="button"
        onClick={() => void onShare()}
        className={cn(
          'relative h-11 w-11 shrink-0 rounded-[var(--radius-button)] border shadow-lg backdrop-blur-xl inline-flex items-center justify-center transition',
          copied
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-surface/90 text-foreground border-white/25 dark:border-white/10',
          className,
        )}
        aria-label={caption}
        title={caption}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] border shadow-sm transition',
        copied
          ? 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-white/95 border-border text-muted hover:text-foreground',
        className,
      )}
      aria-label={caption}
      title={caption}
    >
      {icon}
    </button>
  );
}
