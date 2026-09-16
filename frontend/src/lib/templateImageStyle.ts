export const TEMPLATE_IMAGE_STYLES = [
  { id: 'rounded', label: 'Arrondi' },
  { id: 'circle', label: 'Cercle' },
  { id: 'arch', label: 'Arche' },
  { id: 'arch-gold', label: 'Arche dorée' },
  { id: 'oval', label: 'Ovale' },
  { id: 'diamond', label: 'Losange' },
  { id: 'gold-frame', label: 'Cadre doré' },
  { id: 'magazine', label: 'Magazine' },
  { id: 'full-bleed', label: 'Plein cadre' },
  { id: 'diamond-frame', label: 'Losange cadré' },
  { id: 'vintage', label: 'Sépia' },
  { id: 'shadow-luxury', label: 'Ombre douce' },
] as const;

export type TemplateImageStyleId = (typeof TEMPLATE_IMAGE_STYLES)[number]['id'];

export function templateImageStyleClass(style?: string): string {
  switch (style) {
    case 'circle':
      return 'rounded-full border-2 border-amber-200 aspect-square';
    case 'arch':
      return 'rounded-t-[120px] border-2 border-amber-100';
    case 'arch-gold':
      return 'rounded-t-[140px] border-[3px] border-amber-400 shadow-[0_8px_24px_rgba(212,175,55,0.28)]';
    case 'oval':
      return 'rounded-[50%] border-2 border-amber-100 aspect-[3/4]';
    case 'diamond':
      return 'border-0 aspect-square';
    case 'gold-frame':
      return 'rounded-2xl border-4 border-amber-400/80 p-1 bg-surface shadow-lg';
    case 'magazine':
      return 'rounded-none border-0';
    case 'full-bleed':
      return 'rounded-none border-0 w-full h-full';
    case 'diamond-frame':
      return 'border-0 aspect-square';
    case 'vintage':
      return 'rounded-none border-8 border-amber-950/10 shadow-xl sepia contrast-[1.1]';
    case 'shadow-luxury':
      return 'rounded-3xl border border-border shadow-[0_15px_30px_rgba(197,160,89,0.12)]';
    default:
      return 'rounded-2xl border border-border shadow-sm';
  }
}

export function templateImageStyleExtra(style?: string): { clipPath?: string; filter?: string } {
  if (style === 'diamond') {
    return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
  }
  if (style === 'diamond-frame') {
    return {
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      filter: 'drop-shadow(0 0 0 5px #111111) drop-shadow(0 10px 18px rgba(0,0,0,0.28))',
    };
  }
  return {};
}
