import {
  AI_INVITATION_COMPOSE_TOKEN_COST,
  AI_ROOM_PLAN_TOKEN_COST,
  AI_SIMULATION_TOKEN_COST,
  aiTokenCostLegend,
} from '@/lib/aiTokens';

export type AiFabMood = 'celebrate' | 'work';
export type AiFabClick = 'open' | 'scroll' | 'href';
export type AiFabHighlight = 'budget' | 'invite' | 'room' | 'tokens';

export type AiFabPlacement = {
  mood: AiFabMood;
  label: string;
  subtitle: string;
  ariaLabel: string;
  title: string;
  click: AiFabClick;
  href?: string;
  scrollId?: string;
  modalTitle: string;
  modalDescription: string;
  highlight: AiFabHighlight;
  embedSimulator: boolean;
  inviteHref: string;
  roomsHref: string;
  catalogueHref: string;
};

export function resolveAiFabPlacement(input: {
  pathname: string;
  search?: string;
  canUseRooms: boolean;
  emptyTokens: boolean;
}): AiFabPlacement {
  const pathname = input.pathname || '/';
  const params = new URLSearchParams(input.search || '');
  const onDashboard = pathname.startsWith('/dashboard');
  const onCataloguePlan =
    pathname.startsWith('/dashboard/catalogue') &&
    (params.get('tab') === 'plan' || params.get('planView') === 'ai');
  const onTemplates = pathname.startsWith('/dashboard/templates');
  const onRooms = pathname.startsWith('/dashboard/rooms');
  const onHome = pathname === '/';
  const onModeles = pathname.startsWith('/modeles');
  const onPlans3d = pathname.startsWith('/plans-3d');

  const inviteHref = onDashboard ? '/dashboard/templates' : '/modeles';
  const roomsHref = '/dashboard/rooms';
  const catalogueHref = onDashboard
    ? '/dashboard/catalogue?tab=plan&planView=ai'
    : '/#simulateur-ia';

  if (input.emptyTokens) {
    return {
      mood: onDashboard ? 'work' : 'celebrate',
      label: 'Recharger l’IA',
      subtitle: 'Plus de jetons',
      ariaLabel: 'Recharger les jetons IA',
      title: aiTokenCostLegend(),
      click: 'open',
      modalTitle: 'Plus de jetons IA',
      modalDescription: aiTokenCostLegend(),
      highlight: 'tokens',
      embedSimulator: !onHome && !onCataloguePlan,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  if (onHome) {
    return {
      mood: 'celebrate',
      label: 'Estimer mon budget',
      subtitle: `3 formules · ${AI_SIMULATION_TOKEN_COST} jeton`,
      ariaLabel: 'Aller au simulateur de budget IA',
      title: `Trois packs chiffrés dans votre enveloppe · ${aiTokenCostLegend()}`,
      click: 'scroll',
      scrollId: 'simulateur-ia',
      href: '/#simulateur-ia',
      modalTitle: 'Estimer un budget',
      modalDescription: `Trois formules (éco, équilibré, confort) à partir du catalogue réel. ${aiTokenCostLegend()}.`,
      highlight: 'budget',
      embedSimulator: false,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  if (onPlans3d) {
    return {
      mood: 'celebrate',
      label: 'Studio plan IA',
      subtitle: `${AI_ROOM_PLAN_TOKEN_COST} jetons · 2D / 3D`,
      ariaLabel: 'Aller au studio IA de plan de salle',
      title: `Composer un plan depuis un brief ou une photo · ${AI_ROOM_PLAN_TOKEN_COST} jetons`,
      click: 'scroll',
      scrollId: 'studio-ia',
      href: '/plans-3d#studio-ia',
      modalTitle: 'Studio plan de salle',
      modalDescription: `Brief ou photo → plan 2D / 3D éditable. ${aiTokenCostLegend()}.`,
      highlight: 'room',
      embedSimulator: false,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  if (onModeles) {
    return {
      mood: 'celebrate',
      label: 'Invitation IA',
      subtitle: `${AI_INVITATION_COMPOSE_TOKEN_COST} jetons · carte éditable`,
      ariaLabel: 'Aller au générateur d’invitation IA',
      title: `Créer une carte à partir d’un brief et de photos · ${AI_INVITATION_COMPOSE_TOKEN_COST} jetons`,
      click: 'scroll',
      scrollId: 'generateur-ia',
      href: '/modeles#generateur-ia',
      modalTitle: 'Invitation IA',
      modalDescription: `Brief + photos → carte éditable. ${aiTokenCostLegend()}.`,
      highlight: 'invite',
      embedSimulator: false,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  if (onRooms && input.canUseRooms) {
    return {
      mood: 'work',
      label: 'Plan de salle',
      subtitle: `${AI_ROOM_PLAN_TOKEN_COST} jetons · studio 2D / 3D`,
      ariaLabel: 'Lire un plan de salle avec l’IA',
      title: `Créer le plan de salle à la main ou depuis une photo · ${AI_ROOM_PLAN_TOKEN_COST} jetons`,
      click: 'open',
      modalTitle: 'Plan de salle IA',
      modalDescription: `Studio IA dans l’éditeur : brief ou photo, puis le plan s’ouvre en 2D / 3D. ${aiTokenCostLegend()}.`,
      highlight: 'room',
      embedSimulator: true,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  if (onTemplates) {
    return {
      mood: 'work',
      label: 'Invitation IA',
      subtitle: `${AI_INVITATION_COMPOSE_TOKEN_COST} jetons · studio`,
      ariaLabel: 'Jetons IA pour le studio d’invitations',
      title: `Utilisez « Créer avec l’IA » dans le studio · ${AI_INVITATION_COMPOSE_TOKEN_COST} jetons`,
      click: 'open',
      modalTitle: 'Studio IA',
      modalDescription: `Vous êtes dans le studio. ${aiTokenCostLegend()}.`,
      highlight: 'invite',
      embedSimulator: true,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  if (onCataloguePlan) {
    return {
      mood: 'work',
      label: 'Jetons IA',
      subtitle: `${AI_SIMULATION_TOKEN_COST} / ${AI_INVITATION_COMPOSE_TOKEN_COST} / ${AI_ROOM_PLAN_TOKEN_COST}`,
      ariaLabel: 'Solde et autres outils IA',
      title: aiTokenCostLegend(),
      click: 'open',
      modalTitle: 'Atelier IA',
      modalDescription: `Le simulateur est déjà ouvert ici. ${aiTokenCostLegend()}.`,
      highlight: 'tokens',
      embedSimulator: false,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  if (onDashboard) {
    return {
      mood: 'work',
      label: 'Budget IA',
      subtitle: 'Packs · invitations · salles',
      ariaLabel: 'Ouvrir l’atelier IA : budget, invitations et plans de salle',
      title: aiTokenCostLegend(),
      click: 'open',
      modalTitle: 'Atelier IA',
      modalDescription: `Composez un pack, une invitation ou un plan de salle. ${aiTokenCostLegend()}.`,
      highlight: 'budget',
      embedSimulator: true,
      inviteHref,
      roomsHref,
      catalogueHref,
    };
  }

  return {
    mood: 'celebrate',
    label: 'Estimer mon budget',
    subtitle: `3 formules · ${AI_SIMULATION_TOKEN_COST} jeton`,
    ariaLabel: 'Estimer un budget avec 3 formules IA',
    title: aiTokenCostLegend(),
    click: pathname.startsWith('/marketplace') ? 'open' : 'href',
    href: '/#simulateur-ia',
    modalTitle: 'Estimer un budget',
    modalDescription: `Trois formules à partir du catalogue réel. ${aiTokenCostLegend()}.`,
    highlight: 'budget',
    embedSimulator: true,
    inviteHref,
    roomsHref,
    catalogueHref,
  };
}

export function scrollToPageSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}
