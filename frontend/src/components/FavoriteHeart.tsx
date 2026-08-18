'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function FavoriteHeart({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition',
        active
          ? 'bg-rose-500 border-rose-500 text-white'
          : 'bg-white/95 border-border text-muted hover:text-rose-500',
        className,
      )}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={active}
    >
      <Heart className={cn('w-4 h-4', active && 'fill-current')} />
    </button>
  );
}
