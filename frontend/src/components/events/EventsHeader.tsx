'use client';

import React from 'react';
import PageHero, { type PageHeroProps } from '@/components/ui/PageHero';

/** Bandeau de la page Événements (photo du calendrier). */
export function EventsHero(props: Omit<PageHeroProps, 'image'>) {
  return <PageHero {...props} image="/images/events-hero.png" />;
}
