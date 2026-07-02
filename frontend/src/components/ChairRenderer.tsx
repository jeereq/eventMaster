'use client';

import React from 'react';
import { ChairType, getChairVisualClass } from '@/lib/roomLayoutUtils';

interface ChairRendererProps {
  chairType: ChairType;
  imageUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

const sizeMap = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-5 h-5',
};

export default function ChairRenderer({
  chairType,
  imageUrl,
  size = 'sm',
  title,
  className = '',
}: ChairRendererProps) {
  if (imageUrl) {
    return (
      <span
        className={`inline-block rounded-full overflow-hidden border border-slate-300/80 shadow-sm bg-white ${sizeMap[size]} ${className}`}
        title={title || 'Chaise personnalisée'}
      >
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`inline-block ${getChairVisualClass(chairType)} ${className}`}
      title={title}
    />
  );
}
