'use client';

import React, { useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export type TooltipSide = 'right' | 'left' | 'top' | 'bottom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: TooltipSide;
  disabled?: boolean;
  className?: string;
  delayMs?: number;
}

const sideClasses: Record<TooltipSide, string> = {
  right: 'left-full top-1/2 -translate-y-1/2 ml-2.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2.5',
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2.5',
};

const arrowClasses: Record<TooltipSide, string> = {
  right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45',
  left: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45',
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45',
};

/** Infobulle légère pour icônes (sidebar réduite, actions). */
export default function Tooltip({
  content,
  children,
  side = 'right',
  disabled = false,
  className,
  delayMs = 60,
}: TooltipProps) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (disabled || !content) {
    return <span className={className}>{children}</span>;
  }

  const show = () => {
    timerRef.current = setTimeout(() => setOpen(true), delayMs);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setOpen(false);
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-[80]',
            'rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background',
            'shadow-lg animate-fade-in',
            sideClasses[side],
          )}
        >
          <span className={cn('absolute h-2 w-2 bg-foreground', arrowClasses[side])} aria-hidden />
          {content}
        </span>
      )}
    </span>
  );
}
