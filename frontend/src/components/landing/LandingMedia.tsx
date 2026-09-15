'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

const LOCAL_FALLBACKS: Record<string, string> = {
  'https://i.pinimg.com/1200x/81/58/1b/81581bb9fe9108c7f9d5c405a4f0389e.jpg':
    '/images/landing/card-fete-mariage.jpg',
  'https://i.pinimg.com/736x/8e/7c/81/8e7c81136e2f481af7114856524906ae.jpg':
    '/images/landing/card-billetterie-pro.jpg',
  'https://i.pinimg.com/736x/04/d5/fc/04d5fcdcc825f807b7f4cee2306e1c7c.jpg':
    '/images/landing/card-trouver-lieu-talent.jpg',
};

export default function LandingMedia({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const isPinterest = currentSrc.includes('pinimg.com');

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isPinterest}
      onError={() => {
        const fallback = LOCAL_FALLBACKS[src];
        if (fallback && currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
      className={cn('object-cover', className)}
    />
  );
}
