'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui';

const VIEWPORT_ROOT_MARGIN = '280px 0px';

export function LandingSectionFallback({ label }: { label: string }) {
  return (
    <div className="page-container py-14 sm:py-20" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="max-w-xl mx-auto space-y-3">
        <Skeleton className="h-5 w-36 mx-auto rounded-full" />
        <Skeleton className="h-8 w-4/5 mx-auto" />
        <Skeleton className="h-4 w-full max-w-md mx-auto" />
      </div>
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Skeleton className="aspect-[16/10] rounded-[var(--radius-card)]" />
        <Skeleton className="aspect-[16/10] rounded-[var(--radius-card)]" />
        <Skeleton className="hidden lg:block aspect-[16/10] rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

export default function LandingLazyMount({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || ready) return;
    if (typeof IntersectionObserver === 'undefined') {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: VIEWPORT_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  return <div ref={ref}>{ready ? children : <LandingSectionFallback label={label} />}</div>;
}
