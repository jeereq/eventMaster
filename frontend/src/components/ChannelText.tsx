'use client';

import React from 'react';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';
import type { MessagingChannel } from '@/lib/messagingChannels';

/**
 * Texte adapté aux canaux activés par le superadmin (utilisable depuis un composant serveur) :
 * les énumérations sont recomposées et les mentions d’un canal désactivé reformulées.
 */
export function ChannelText({ text }: { text: string }) {
  const messaging = useMessagingChannels();
  return <>{messaging.adapt(text)}</>;
}

/** Affiche son contenu seulement si le canal est activé (ou, avec `not`, s’il est désactivé). */
export function IfChannel({
  channel,
  not = false,
  children,
}: {
  channel: MessagingChannel;
  not?: boolean;
  children: React.ReactNode;
}) {
  const messaging = useMessagingChannels();
  const on = messaging.has(channel);
  return <>{on !== not ? children : null}</>;
}
