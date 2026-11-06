'use client';

import { useMemo } from 'react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { buildMessagingChannels, type MessagingChannels } from '@/lib/messagingChannels';

/** Canaux e-mail / WhatsApp / SMS activés par le superadmin, avec helpers de texte. */
export function useMessagingChannels(): MessagingChannels {
  const { site } = usePlatformSite();
  const channels = site.notificationChannels;
  return useMemo(() => buildMessagingChannels(channels), [channels]);
}
