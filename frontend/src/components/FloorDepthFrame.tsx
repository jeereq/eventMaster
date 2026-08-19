'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { depthCanvasVars, depthRotateDeg } from '@/lib/roomFloorUtils';

interface FloorDepthFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: number;
  floorStyle: React.CSSProperties;
  maxTilt?: number;
  children: React.ReactNode;
}

const FloorDepthFrame = forwardRef<HTMLDivElement, FloorDepthFrameProps>(function FloorDepthFrame(
  { amount, floorStyle, maxTilt = 42, className, style, children, ...rest },
  ref,
) {
  const tilt = amount > 6;
  const rotate = tilt ? depthRotateDeg(amount, maxTilt) : 0;

  return (
    <div
      ref={ref}
      className={cn(
        'em-floor-canvas em-floor-canvas--photo relative',
        tilt && 'em-floor-canvas--depth',
        className,
      )}
      style={{
        ...(tilt
          ? { background: 'linear-gradient(180deg, #241810 0%, #100c0a 55%, #0a0806 100%)' }
          : floorStyle),
        ...depthCanvasVars(amount),
        ...style,
      }}
      {...rest}
    >
      {tilt && (
        <>
          <div className="em-floor-ceiling" />
          <div
            className="em-floor-back-wall"
            style={{ height: `var(--em-depth-wall, ${12 + amount * 0.14}%)`, opacity: 0.55 + amount / 280 }}
          />
          <div className="em-floor-side-fade em-floor-side-fade--left" style={{ opacity: amount / 120 }} />
          <div className="em-floor-side-fade em-floor-side-fade--right" style={{ opacity: amount / 120 }} />
        </>
      )}
      <div
        className={cn('absolute inset-0 em-floor-scene', tilt && 'em-floor-scene--tilt')}
        style={{
          ...(tilt ? floorStyle : undefined),
          ...(tilt ? { ['--em-depth-rotate' as string]: `${rotate}deg` } : {}),
        }}
      >
        {tilt && <div className="absolute inset-0 pointer-events-none em-floor-depth-haze z-[4]" />}
        {children}
      </div>
    </div>
  );
});

export default FloorDepthFrame;
