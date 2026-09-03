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
        <span className="hidden sm:inline">{caption}</span>
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
            ? 'bg-primary text-white border-primary'
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
        'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] border shadow-sm transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        copied
          ? 'bg-primary border-primary text-white'
          : 'bg-surface border-border text-muted hover:text-foreground',
        className,
      )}
      aria-label={caption}
      title={caption}
    >
      {icon}
    </button>
  );
}
