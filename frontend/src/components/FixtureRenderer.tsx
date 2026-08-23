'use client';

import React from 'react';
import { RoomLayoutBlueprint, getFixtureClass } from '@/lib/roomLayoutUtils';
import { ZONE_MATERIAL_COLORS } from '@/lib/roomWebGLMaterials';
import { getCroppedBackgroundStyle } from '@/lib/imageCropUtils';
import FlowerRenderer from '@/components/FlowerRenderer';

type Fixture = RoomLayoutBlueprint['fixtures'][number];

interface FixtureRendererProps {
  fixture: Fixture;
  className?: string;
  showLabel?: boolean;
  /** Si true, remplit le conteneur parent (pas de position absolue) */
  fill?: boolean;
}

export default function FixtureRenderer({ fixture, className = '', showLabel = true, fill = false }: FixtureRendererProps) {
  const isColumn = fixture.kind === 'pillar' || fixture.kind === 'column';
  const isStage = fixture.kind === 'stage' || fixture.kind === 'podium';
  const isFlower = fixture.kind === 'flower';
  const usesZoneMaterial = fixture.kind === 'stage' || fixture.kind === 'podium' || fixture.kind === 'buffet' || fixture.kind === 'stairs';
  const colShape = fixture.columnShape ?? 'round';
  const hasImage = Boolean(fixture.imageUrl);

  const imageStyle = hasImage ? getCroppedBackgroundStyle(fixture.imageUrl!, fixture.imageCrop) : undefined;

  const positionStyle: React.CSSProperties = fill
    ? { width: '100%', height: '100%', transform: fixture.rotation ? `rotate(${fixture.rotation}deg)` : undefined }
    : {
        left: `${fixture.x}%`,
        top: `${fixture.y}%`,
        width: `${fixture.w}%`,
        height: `${fixture.h}%`,
        transform: fixture.rotation ? `rotate(${fixture.rotation}deg)` : undefined,
      };

  if (isFlower) {
    return (
      <div
        className={`${fill ? 'relative' : 'absolute'} flex items-center justify-center ${className}`}
        style={positionStyle}
      >
        <FlowerRenderer
          flowerType={fixture.flowerType ?? 'boquet'}
          color={fixture.flowerColor ?? '#e11d48'}
          imageUrl={fixture.imageUrl}
          size="lg"
        />
        {showLabel && fixture.label && (
          <span className="absolute -bottom-4 text-[8px] font-bold text-muted whitespace-nowrap">{fixture.label}</span>
        )}
      </div>
    );
  }

  const materialTint = usesZoneMaterial && fixture.material && !hasImage
    ? ZONE_MATERIAL_COLORS[fixture.material]
    : undefined;

  return (
    <div
      className={`${fill ? 'relative' : 'absolute'} border-2 text-[9px] font-bold flex items-center justify-center px-1 text-center overflow-hidden ${getFixtureClass(fixture.kind)} ${className} ${isColumn && colShape === 'round' && !hasImage ? 'rounded-full' : isColumn && !hasImage ? 'rounded-md' : ''}`}
      style={{
        ...positionStyle,
        backgroundColor: materialTint ?? (!hasImage && isColumn && fixture.color ? fixture.color : undefined),
        ...imageStyle,
      }}
    >
      {hasImage && <div className="absolute inset-0 bg-black/10" />}
      {fixture.kind !== 'aisle' && showLabel && !hasImage && (fixture.label || fixture.kind)}
      {hasImage && isStage && fixture.label && (
        <span className="relative z-10 bg-black/40 text-white px-1.5 py-0.5 rounded text-[8px]">{fixture.label}</span>
      )}
    </div>
  );
}
