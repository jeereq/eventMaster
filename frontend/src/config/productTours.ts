import type { UserGuideId } from '@/config/userGuides';

export interface ProductTourStep {
  id: string;
  title: string;
  description: string;
  /** Route Next.js (pathname + query) */
  route?: string;
  /** Valeur de l'attribut data-tour sur l'élément à mettre en avant */
  target?: string;
}

/** @deprecated Utiliser getProductTour depuis buildNavProductTour.ts */
export const PRODUCT_TOURS = {} as Record<Exclude<UserGuideId, 'guest'>, ProductTourStep[]>;

export { getProductTour } from '@/lib/buildNavProductTour';
