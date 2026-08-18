'use client';

import React from 'react';
import { cn } from '@/lib/cn';

function initialsFrom(name?: string | null) {
  if (!name?.trim()) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserAvatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-20 h-20 text-lg',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary/15 text-primary font-bold shrink-0 ring-1 ring-primary/20 overflow-hidden',
        sizes[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        initialsFrom(name)
      )}
    </span>
  );
}
