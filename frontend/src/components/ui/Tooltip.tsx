'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const GAP = 10;

/** Infobulle via portal (fixe) — non coupée par overflow de la sidebar. */
export default function Tooltip({
  content,
  children,
  side = 'right',
  disabled = false,
  className,
  delayMs = 80,
}: TooltipProps) {
  const tipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let top = 0;
    let left = 0;
    switch (side) {
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + GAP;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - GAP;
        break;
      case 'top':
        top = rect.top - GAP;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2;
        break;
    }
    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- position tied to open/side only
  }, [open, side]);

  if (disabled || !content) {
    return <span className={className}>{children}</span>;
  }

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, delayMs);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setOpen(false);
  };

  const transform =
    side === 'right' || side === 'left'
      ? `translateY(-50%)${side === 'left' ? ' translateX(-100%)' : ''}`
      : `translateX(-50%)${side === 'top' ? ' translateY(-100%)' : ''}`;

  return (
    <span
      ref={triggerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {mounted &&
        open &&
        coords &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            style={{ top: coords.top, left: coords.left, transform }}
            className={cn(
              'pointer-events-none fixed z-[10050]',
              'max-w-[15rem] rounded-md bg-slate-900 px-2.5 py-1.5',
              'text-[11px] font-medium text-white shadow-xl ring-1 ring-white/10',
              'dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-900/10',
            )}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
