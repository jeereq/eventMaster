import {
  isServiceRentalCategory,
  type ServiceCategory,
} from '@/lib/marketplace';

export type VendorRegisterTrack = 'venue' | 'service';
export type VendorServiceGroup = 'trade' | 'rental';

export type RegisterVendorIntent = {
  track: VendorRegisterTrack;
  serviceGroup?: VendorServiceGroup;
  category?: ServiceCategory;
};

const STORAGE_KEY = 'em-register-vendor-intent';

export function serviceGroupForCategory(category: ServiceCategory): VendorServiceGroup {
  return isServiceRentalCategory(category) ? 'rental' : 'trade';
}

export function resolveVendorTrackFromParams(input: {
  action?: string | null;
  plan?: string | null;
}): VendorRegisterTrack | null {
  const action = (input.action || '').toLowerCase();
  const plan = (input.plan || '').toUpperCase();
  if (action === 'venue' || plan === 'VENUE') return 'venue';
  if (
    action === 'services'
    || action === 'quotes'
    || action === 'ai_recommendation'
    || action === 'rentals'
    || plan === 'SERVICE'
  ) {
    return 'service';
  }
  return null;
}

export function planForVendorTrack(track: VendorRegisterTrack, existingPlan?: string | null): string | undefined {
  const current = (existingPlan || '').toUpperCase();
  if (current === 'VENUE' || current === 'SERVICE' || current === 'CATALOG') return current;
  return track === 'venue' ? 'VENUE' : 'SERVICE';
}

export function saveRegisterVendorIntent(intent: RegisterVendorIntent) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    /* private mode */
  }
}

export function readRegisterVendorIntent(): RegisterVendorIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegisterVendorIntent;
    if (parsed.track !== 'venue' && parsed.track !== 'service') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRegisterVendorIntent() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
