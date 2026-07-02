'use client';

import React from 'react';
import { FlowerType, flowerTypeLabels } from '@/lib/roomLayoutUtils';

interface FlowerRendererProps {
  flowerType: FlowerType;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  imageUrl?: string | null;
  className?: string;
}

const sizeMap = {
  xs: 'text-base w-6 h-6',
  sm: 'text-xl w-8 h-8',
  md: 'text-2xl w-10 h-10',
  lg: 'text-3xl w-14 h-14',
};

const flowerEmoji: Record<FlowerType, string> = {
  rose: '🌹',
  tulipe: '🌷',
  orchidee: '🪻',
  tournesol: '🌻',
  lavande: '💜',
  boquet: '💐',
  personnalise: '🌸',
};

export default function FlowerRenderer({
  flowerType,
  color = '#e11d48',
  size = 'sm',
  imageUrl,
  className = '',
}: FlowerRendererProps) {
  if (imageUrl) {
    return (
      <span
        className={`inline-block rounded-lg overflow-hidden border border-white/60 shadow-sm ${sizeMap[size]} ${className}`}
        title={flowerTypeLabels[flowerType]}
      >
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center select-none ${sizeMap[size]} ${className}`}
      title={flowerTypeLabels[flowerType]}
      style={{
        filter: color ? `drop-shadow(0 1px 2px ${color}55)` : undefined,
      }}
    >
      <span
        className="leading-none"
        style={{
          color,
          textShadow: `0 0 8px ${color}44`,
        }}
      >
        {flowerEmoji[flowerType]}
      </span>
    </span>
  );
}
