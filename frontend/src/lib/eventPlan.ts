import type { ListingEventTypeId } from '@/lib/listingDetails';
import type { ServiceCategory } from '@/lib/marketplace';

export const EVENT_PLAN_SLOTS: Record<ListingEventTypeId, { required: ServiceCategory[]; optional: ServiceCategory[] }> = {
  wedding: {
    required: ['CATERING', 'PHOTOGRAPHY', 'DJ', 'DECORATION'],
    optional: ['VIDEO', 'FLORIST', 'MC'],
  },
  birthday: {
    required: ['CATERING', 'DJ', 'DECORATION'],
    optional: ['PHOTOGRAPHY'],
  },
  corporate: {
    required: ['CATERING', 'MC'],
    optional: ['PHOTOGRAPHY', 'VIDEO', 'TRANSPORT'],
  },
  gala: {
    required: ['CATERING', 'DJ', 'DECORATION', 'MC'],
    optional: ['PHOTOGRAPHY', 'VIDEO'],
  },
  religious: {
    required: ['CATERING', 'DECORATION'],
    optional: ['TRANSPORT', 'PHOTOGRAPHY', 'MC'],
  },
  private: {
    required: ['CATERING', 'DJ'],
    optional: ['DECORATION', 'PHOTOGRAPHY'],
  },
  shooting: {
    required: ['PHOTOGRAPHY', 'VIDEO'],
    optional: ['DECORATION', 'OTHER'],
  },
};

export type PlanItem = {
  kind: 'venue' | 'service';
  slug: string;
  title: string;
  orgName: string;
  location: string;
  coverUrl: string | null;
  estimatedFc: number;
  categoryLabel?: string;
  category?: ServiceCategory;
  href: string;
  favorite?: boolean;
  match?: 'exact' | 'unknown';
  reused?: boolean;
  capacity?: number | null;
  alternatives?: PlanItem[];
};

export type PlanMissingSlot = {
  slot: 'venue' | ServiceCategory;
  label: string;
  reason: string;
};

export type PlanPackage = {
  id: string;
  label: string;
  blurb?: string;
  totalFc: number;
  leftoverFc: number;
  overBudget: boolean;
  complete?: boolean;
  venue: PlanItem | null;
  services: PlanItem[];
  items?: PlanItem[];
  missing?: PlanMissingSlot[];
  notes?: string[];
  filledCount?: number;
  requiredCount?: number;
};
