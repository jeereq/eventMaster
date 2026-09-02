import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import GuestPortalGate from '@/components/GuestPortalGate';
import { apiBaseUrl, fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';

async function fetchGuestShareMeta(guestId: string) {
  try {
    const res = await fetch(`${apiBaseUrl()}/rsvp/${encodeURIComponent(guestId)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      event?: { title?: string };
      organizationName?: string;
    };
    const eventTitle = data.event?.title?.trim() || '';
    const organizationName = data.organizationName?.trim() || '';
    if (!eventTitle && !organizationName) return null;
    return { eventTitle, organizationName };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ guestId: string }>;
}): Promise<Metadata> {
  const { guestId } = await params;
  const [site, guest] = await Promise.all([
    fetchPublicSiteSnapshot(),
    fetchGuestShareMeta(guestId),
  ]);

  const brand = guest?.organizationName || site.platformName;
  const title = guest?.eventTitle
    ? `${guest.eventTitle} — Invitation ${brand}`
    : `Invitation — ${site.platformName}`;
  const description = guest?.eventTitle
    ? `Confirmez votre présence et consultez votre badge pour « ${guest.eventTitle} ».`
    : `Espace invité ${site.platformName} : RSVP, badge QR, itinéraire et plan de table.`;

  return {
    title,
    description,
    applicationName: site.platformName,
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      url: `/rsvp/${guestId}`,
      siteName: site.platformName,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: site.platformName,
    },
  };
}

export default function GuestRsvpLayout({ children }: { children: ReactNode }) {
  return <GuestPortalGate>{children}</GuestPortalGate>;
}
