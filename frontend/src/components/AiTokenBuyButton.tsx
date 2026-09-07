'use client';

import React from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { AI_SIMULATION_TOKEN_COST, resolveAiTokenPricing } from '@/lib/aiTokens';

export default function AiTokenBuyButton({
  onClick,
  variant = 'secondary',
  size = 'sm',
  fullWidth = false,
  compact = false,
  className,
}: {
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { site } = usePlatformSite();
  const pricing = resolveAiTokenPricing(site);
  const packLabel = `${pricing.minCount} simulation${pricing.minCount > 1 ? 's' : ''} dès ${formatFc(pricing.minAmountCdf)}`;
  const ariaLabel = `Acheter des jetons de simulation — ${packLabel} · ${AI_SIMULATION_TOKEN_COST} jeton par simulation`;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onClick={onClick}
      leftIcon={<Coins className="w-3.5 h-3.5" aria-hidden />}
      className={className}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {compact ? 'Acheter des jetons' : `Acheter des jetons · ${packLabel}`}
    </Button>
  );
}
