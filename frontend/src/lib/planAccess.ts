import type { PlanCapabilities, PlanQuotaInfo, OrgAccess } from '@/context/AuthContext';

/** Limite « illimitée » côté API (9999+). */
export function isUnlimitedQuota(limit: number | null | undefined): boolean {
  return limit == null || limit >= 9999;
}

export function isAtQuota(
  usage: number | null | undefined,
  limit: number | null | undefined,
): boolean {
  if (isUnlimitedQuota(limit)) return false;
  return (usage ?? 0) >= (limit as number);
}

/** Feature absente du forfait chargé (ne bloque pas tant que planFeatures est null). */
export function isPlanFeatureLocked(
  planFeatures: PlanCapabilities | null | undefined,
  feature: keyof PlanCapabilities,
): boolean {
  if (!planFeatures) return false;
  const value = planFeatures[feature];
  if (typeof value === 'boolean') return value === false;
  return false;
}

export function hasPlanFeature(
  planFeatures: PlanCapabilities | null | undefined,
  feature: keyof PlanCapabilities,
  opts?: { bypass?: boolean },
): boolean {
  if (opts?.bypass) return true;
  if (!planFeatures) return false;
  const value = planFeatures[feature];
  if (typeof value === 'boolean') return value === true;
  return Boolean(value);
}

export function getQuotaLockMessage(
  kind: 'events' | 'guests' | 'templates' | 'rooms' | 'services' | 'orgManagers',
  planQuota: PlanQuotaInfo | null | undefined,
): string | null {
  if (!planQuota) return null;
  const map = {
    events: { usage: planQuota.usage.events, limit: planQuota.limits.maxEvents, label: 'événements' },
    guests: { usage: planQuota.usage.guests, limit: planQuota.limits.maxGuests, label: 'invités' },
    templates: { usage: planQuota.usage.templates, limit: planQuota.limits.maxTemplates, label: 'modèles' },
    rooms: { usage: planQuota.usage.rooms, limit: planQuota.limits.maxRooms, label: 'salles' },
    services: { usage: planQuota.usage.services ?? 0, limit: planQuota.limits.maxServices ?? 0, label: 'prestations' },
    orgManagers: {
      usage: planQuota.usage.orgManagers,
      limit: planQuota.limits.maxOrgManagers,
      label: 'managers',
    },
  } as const;
  const row = map[kind];
  if (!isUnlimitedQuota(row.limit) && (row.limit as number) <= 0) {
    return `${row.label.charAt(0).toUpperCase()}${row.label.slice(1)} non inclus dans votre forfait. Choisissez une offre adaptée.`;
  }
  if (!isAtQuota(row.usage, row.limit)) return null;
  return `Quota ${row.label} atteint (${row.usage}/${row.limit}). Passez à un forfait supérieur.`;
}

export function getFeatureLockMessage(
  feature: keyof PlanCapabilities,
  planName?: string | null,
): string {
  const labels: Partial<Record<keyof PlanCapabilities, string>> = {
    protocolQr: 'Le protocole QR n’est pas inclus dans votre forfait',
    seatNotifications: 'Les notifications PDF / GPS de placement ne sont pas incluses dans votre forfait',
    customTemplates: 'Les modèles personnalisés ne sont pas inclus dans votre forfait',
    mockupOcr: 'L’import OCR n’est pas inclus dans votre forfait',
    roomThemesFixtures: 'Thèmes et fixtures de salle non inclus dans votre forfait',
    commercialNetwork: 'Le réseau commercial n’est pas inclus dans votre forfait',
    adminReports: 'Les rapports avancés ne sont pas inclus dans votre forfait',
  };
  const base = labels[feature] || 'Fonctionnalité non incluse dans votre forfait';
  return planName ? `${base} (actuel : ${planName}).` : `${base}.`;
}

export type QuotaKind = 'events' | 'guests' | 'templates' | 'rooms' | 'services' | 'orgManagers';

export type PlanLimitGuide = {
  title: string;
  what: string;
  why: string;
  how: string;
  href: string;
};

export const QUOTA_GUIDES: Record<QuotaKind, PlanLimitGuide> = {
  events: {
    title: 'Limite d’événements',
    what: 'Votre forfait plafonne le nombre d’événements que vous pouvez créer.',
    why: 'Chaque événement consomme invitations, stockage, envois RSVP et éventuellement de la billetterie.',
    how: 'Passez à un forfait supérieur depuis Facturation, ou supprimez un événement terminé pour libérer une place.',
    href: '/dashboard/billing',
  },
  guests: {
    title: 'Limite d’invités',
    what: 'Le nombre total d’invités (tous événements) est plafonné par votre offre.',
    why: 'Les envois, le RSVP et le plan de table sont dimensionnés selon ce quota.',
    how: 'Augmentez le forfait pour plus d’invités, ou retirez des invités en trop. L’import CSV compte aussi dans le quota.',
    href: '/dashboard/billing',
  },
  templates: {
    title: 'Limite de modèles',
    what: 'Vous avez atteint le nombre de modèles d’invitation de votre forfait.',
    why: 'Les modèles personnalisés et l’éditeur visuel sont des options payantes au-delà de la bibliothèque.',
    how: 'Passez à Business Premium (ou plus) pour l’éditeur, ou supprimez un modèle existant. La bibliothèque EventMaster reste utilisable.',
    href: '/dashboard/billing',
  },
  rooms: {
    title: 'Limite de salles',
    what: 'Votre forfait limite le nombre de salles (plans 2D) configurables.',
    why: 'Chaque salle stocke un plan, des thèmes et éventuellement une fiche marketplace.',
    how: 'Passez à un forfait Salle / Premium, ou supprimez une salle inutilisée. La publication catalogue dépend aussi de l’audience du forfait.',
    href: '/dashboard/billing',
  },
  services: {
    title: 'Limite de prestations',
    what: 'Le nombre de fiches prestataire / location est plafonné.',
    why: 'Chaque fiche apparaît sur le marketplace et consomme photos, carte et demandes.',
    how: 'Passez au forfait Prestataire ou Salle & presta, ou archivez une fiche pour en créer une autre.',
    href: '/dashboard/billing',
  },
  orgManagers: {
    title: 'Limite de managers',
    what: 'Le nombre de managers d’organisation est limité.',
    why: 'Un manager a accès à toute l’organisation ; les agents protocole restent souvent illimités.',
    how: 'Passez à un forfait supérieur, ou assignez le rôle Protocole (accueil jour J) plutôt que Manager.',
    href: '/dashboard/billing',
  },
};

export const FEATURE_GUIDES: Partial<Record<keyof PlanCapabilities, PlanLimitGuide>> = {
  protocolQr: {
    title: 'Protocole QR non inclus',
    what: 'Le scan des badges et la confirmation de présence le jour J nécessitent un forfait avec protocole.',
    why: 'C’est un module d’accueil (QR, check-in, notes) distinct de la simple liste d’invités.',
    how: 'Activez-le en passant à un forfait Business / Premium depuis Facturation.',
    href: '/dashboard/billing',
  },
  seatNotifications: {
    title: 'Notifications de placement',
    what: 'L’envoi automatique du PDF de table, du siège et du GPS n’est pas dans votre offre actuelle.',
    why: 'Ces envois (email / WhatsApp) sont facturés dans les forfaits payants.',
    how: 'Passez à un forfait payant pour notifier les invités dès qu’un siège leur est attribué.',
    href: '/dashboard/billing',
  },
  customTemplates: {
    title: 'Éditeur de modèles',
    what: 'L’éditeur visuel et les modèles 100 % perso ne sont pas inclus.',
    why: 'Vous pouvez toujours utiliser la bibliothèque EventMaster.',
    how: 'Passez à Business Premium 1 ou plus pour concevoir vos propres invitations.',
    href: '/dashboard/billing',
  },
  mockupOcr: {
    title: 'Import OCR',
    what: 'La reconnaissance de texte sur une maquette n’est pas incluse.',
    why: 'L’OCR analyse l’image et pré-remplit l’éditeur.',
    how: 'Passez à un forfait qui inclut l’OCR, ou importez une maquette sans texte auto.',
    href: '/dashboard/billing',
  },
  roomThemesFixtures: {
    title: 'Thèmes de salle',
    what: 'Thèmes, textures de sol et décorations avancées ne sont pas dans ce forfait.',
    why: 'L’éditeur essentiel (tables simples) reste disponible selon le niveau d’éditeur.',
    how: 'Passez à Premium / Complet pour thèmes, sol, scène et fleurs.',
    href: '/dashboard/billing',
  },
};

export function getQuotaGuide(kind: QuotaKind): PlanLimitGuide {
  return QUOTA_GUIDES[kind];
}

export function getQuotaActionMessage(
  kind: QuotaKind,
  planQuota: PlanQuotaInfo | null | undefined,
  planName?: string | null,
): string {
  const lock = getQuotaLockMessage(kind, planQuota);
  const guide = QUOTA_GUIDES[kind];
  if (lock) {
    return `${lock} ${guide.how}${planName ? ` Offre actuelle : ${planName}.` : ''}`;
  }
  return `${guide.what} ${guide.how}`;
}

export type RoomEditorLevel = 'basic' | 'standard' | 'advanced' | 'complete';

export const ROOM_TYPE_MIN_LEVEL: Record<string, RoomEditorLevel> = {
  SIMPLE: 'basic',
  BANQUET: 'standard',
  CONFERENCE: 'standard',
  AMPHITHEATER: 'advanced',
  TENT: 'advanced',
  CUSTOM: 'complete',
};

const ROOM_LEVEL_HINT: Record<RoomEditorLevel, string> = {
  basic: 'Essentials',
  standard: 'Business',
  advanced: 'Premium',
  complete: 'Salle, Particulier, Salle & presta ou Enterprise 1',
};

/** Publication d’une salle sur le marketplace (VENUE / CATALOG, ou essai FREE). */
export function canPublishVenueCatalog(
  planFeatures?: PlanCapabilities | null,
  planQuota?: PlanQuotaInfo | null,
  planId?: string | null,
): boolean {
  if (planId?.startsWith('PERSONAL') || planFeatures?.audience === 'B2C') return false;
  const maxRooms = planQuota?.limits.maxRooms;
  if (maxRooms != null && maxRooms <= 0) return false;
  const audience = planFeatures?.audience;
  if (audience === 'VENUE' || audience === 'CATALOG') return true;
  if (planId === 'FREE') return (maxRooms ?? 0) > 0;
  if (audience === 'B2B' || audience === 'SERVICE') return false;
  return (maxRooms ?? 0) > 0;
}

export function getRoomTypeLockMessage(roomType: string, planName?: string | null): string {
  const level = ROOM_TYPE_MIN_LEVEL[roomType] || 'standard';
  const needed = ROOM_LEVEL_HINT[level];
  const base = `Le type « ${roomType} » nécessite le forfait ${needed} ou supérieur`;
  return planName ? `${base} (actuel : ${planName}).` : `${base}.`;
}

export interface WorkspaceModules {
  showEvents: boolean;
  showRooms: boolean;
  showMarketplace: boolean;
  showTemplates: boolean;
  showAnalytics: boolean;
  showProtocol: boolean;
  showTeam: boolean;
}

/** Menus workspace selon type de compte + quotas du forfait. */
export function getWorkspaceModules(opts: {
  accountKind?: string | null;
  access?: OrgAccess | null;
  planQuota?: PlanQuotaInfo | null;
  planFeatures?: PlanCapabilities | null;
}): WorkspaceModules {
  const kind = opts.accountKind || 'ORGANIZER';
  const vendorOnly = kind === 'VENDOR';
  const canRooms = Boolean(opts.access?.canManageRooms);
  const canTeam = Boolean(opts.access?.canManageTeam);
  const protocolOnly = Boolean(opts.access?.isProtocolOnly);

  if (vendorOnly && !opts.planQuota) {
    return {
      showEvents: false,
      showRooms: canRooms,
      showMarketplace: !protocolOnly,
      showTemplates: false,
      showAnalytics: false,
      showProtocol: false,
      showTeam: canTeam,
    };
  }

  const maxEvents = opts.planQuota?.limits.maxEvents ?? 3;
  const maxRooms = opts.planQuota?.limits.maxRooms ?? 1;
  const maxTemplates = opts.planQuota?.limits.maxTemplates ?? 2;
  const maxServices = opts.planQuota?.limits.maxServices ?? 0;

  const showEvents = maxEvents > 0;
  const showRooms = canRooms && maxRooms > 0;
  const showMarketplace = maxServices > 0 && !protocolOnly;

  return {
    showEvents,
    showRooms,
    showMarketplace,
    showTemplates: showEvents && maxTemplates > 0 && !protocolOnly,
    showAnalytics: showEvents && !protocolOnly,
    showProtocol:
      showEvents &&
      Boolean(opts.access?.canProtocolAllEvents || opts.access?.level === 'staff') &&
      opts.planFeatures?.protocolQr !== false,
    showTeam: canTeam,
  };
}
