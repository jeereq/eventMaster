'use client';

import { useEffect } from 'react';
import { syncFaviconFromComputedStyles } from '@/lib/brandTheme';

/**
 * Aligne la favicon sur le thème / la marque, et empêche Next de réinjecter /icon.svg.
 */
export default function BrandFaviconSync() {
  useEffect(() => {
    let syncing = false;
    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
        syncFaviconFromComputedStyles();
      } finally {
        queueMicrotask(() => {
          syncing = false;
        });
      }
    };

    sync();
    window.addEventListener('em-brand-applied', sync);
    window.addEventListener('em-theme-changed', sync);

    const observer = new MutationObserver(() => {
      const stale = Array.from(
        document.querySelectorAll<HTMLLinkElement>(
          'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
        ),
      ).some((el) => {
        const href = el.getAttribute('href') || '';
        return href.length > 0 && !href.startsWith('data:');
      });
      if (stale) sync();
    });
    observer.observe(document.head, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('em-brand-applied', sync);
      window.removeEventListener('em-theme-changed', sync);
      observer.disconnect();
    };
  }, []);

  return null;
}
