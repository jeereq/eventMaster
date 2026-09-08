import type { ComponentType } from 'react';
import type { TenantAccountKind } from '@/lib/marketplace';

export interface RegistrationActionConfig {
  key: string;
  heroTitle: string;
  heroDescription: string;
  defaultAccountKind: TenantAccountKind;
  defaultNextPath: string;
  submitButtonLabel: string;
  orgLabel: string;
  orgPlaceholder: string;
  features: Array<{
    step: number;
    icon: ComponentType<{ className?: string }>;
    title: string;
    desc: string;
  }>;
}

export function resolveActionConfig(
  lookup: Record<string, RegistrationActionConfig>,
  action: string | null,
  intent: string | null,
  accountKind: TenantAccountKind,
  isClientFlow: boolean,
  plan: string | null,
): RegistrationActionConfig {
  const fallback = lookup.ORGANIZER;
  if (!fallback) {
    throw new Error('ORGANIZER registration config is required');
  }
  if (action && lookup[action]) return lookup[action];
  if (action === 'venues' || action === 'packs') {
    return lookup.seeker ?? lookup.CLIENT ?? fallback;
  }
  if (action === 'ai_recommendation' || action === 'rentals') {
    return lookup.services ?? lookup.VENDOR ?? fallback;
  }
  const planKey = (plan || '').toUpperCase();
  if (planKey === 'VENUE') return lookup.venue ?? lookup.VENDOR ?? fallback;
  if (planKey === 'SERVICE') return lookup.services ?? lookup.VENDOR ?? fallback;
  if (intent && lookup[intent]) return lookup[intent];
  if (isClientFlow) return lookup.CLIENT ?? fallback;
  if (accountKind in lookup) return lookup[accountKind];
  return fallback;
}
