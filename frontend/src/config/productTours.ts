export interface ProductTourStep {
  id: string;
  title: string;
  description: string;
  /** Route Next.js (pathname + query) */
  route?: string;
  /** Valeur de l'attribut data-tour sur l'élément à mettre en avant */
  target?: string;
}

export { getProductTour } from '@/lib/buildNavProductTour';
