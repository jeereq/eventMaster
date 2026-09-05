'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const START_PCT = 14;
const CRAWL_CAP = 88;
const CRAWL_STEP = 3;
const CRAWL_MS = 280;
const COMPLETE_HOLD_MS = 240;
const SAFETY_MS = 9000;

function sameAppLocation(href: string): boolean {
  const url = new URL(href, window.location.href);
  return url.pathname === window.location.pathname && url.search === window.location.search;
}

function isInternalNavAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }
  const url = new URL(href, window.location.href);
  return url.origin === window.location.origin && !sameAppLocation(url.href);
}

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const [pct, setPct] = useState(0);
  const pendingRef = useRef(false);
  const hideTimer = useRef<number>(0);
  const safetyTimer = useRef<number>(0);

  const finish = () => {
    window.clearTimeout(safetyTimer.current);
    if (!pendingRef.current && !visible) return;
    pendingRef.current = false;
    setPct(100);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setPct(0);
    }, COMPLETE_HOLD_MS);
  };

  const start = () => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(safetyTimer.current);
    pendingRef.current = true;
    setVisible(true);
    setPct(START_PCT);
    safetyTimer.current = window.setTimeout(finish, SAFETY_MS);
  };

  useEffect(() => {
    finish();
    // La barre se termine quand la nouvelle route est montée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor || !isInternalNavAnchor(anchor)) return;
      start();
    };

    const onPopState = () => start();
    const originalPush = history.pushState;
    history.pushState = function patchedPushState(...args) {
      const url = args[2];
      if (typeof url === 'string' && !sameAppLocation(url)) start();
      return originalPush.apply(this, args);
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      history.pushState = originalPush;
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(safetyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!visible || pct >= CRAWL_CAP || pct <= 0) return;
    const timer = window.setInterval(() => {
      setPct((current) => (current >= CRAWL_CAP ? current : Math.min(CRAWL_CAP, current + CRAWL_STEP)));
    }, CRAWL_MS);
    return () => window.clearInterval(timer);
  }, [visible, pct]);

  return (
    <div
      className="pointer-events-none fixed top-0 right-0 left-0 z-[11000]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        role="progressbar"
        aria-hidden={!visible}
        aria-busy={visible}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={visible ? Math.round(pct) : 0}
        aria-label="Chargement de la page"
        className="h-[3px] origin-left bg-primary-solid transition-[transform,opacity] duration-200 ease-out"
        style={{
          transform: `scaleX(${Math.max(0, Math.min(1, pct / 100))})`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
