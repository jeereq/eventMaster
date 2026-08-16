'use client';

import { usePlatformSite } from '@/context/PlatformSiteContext';

export default function LegalSupportEmail({ className }: { className?: string }) {
  const { site } = usePlatformSite();
  return (
    <a href={`mailto:${site.supportEmail}`} className={className}>
      {site.supportEmail}
    </a>
  );
}
