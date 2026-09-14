import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { parseRateInput, rateToPercent } from '../utils/ratePercent';
import {
  DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF,
  DEFAULT_AI_TOKEN_PRICE_CDF,
  sanitizeAiTokenMinPurchaseCdf,
  sanitizeAiTokenPriceCdf,
} from './aiTokenPricing';
import {
  DEFAULT_WELCOME_GRANT_RULES,
  sanitizeWelcomeGrantRules,
  type WelcomeGrantRules,
} from './welcomeAiTokensPolicy';
import {
  DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS,
  sanitizeSubscriptionDiscountAccess,
  type SubscriptionDiscountAccess,
} from './subscriptionDiscountAccess';
import {
  DEFAULT_DONATIONS_ACCESS,
  sanitizeDonationsAccess,
  type DonationsAccess,
} from './donationsAccess';

const settingsFilePath = path.join(__dirname, '..', 'config', 'settings.json');
const PLATFORM_CONFIG_ID = 'default';

/** Cache processus : source de vérité après hydratation BD (le fichier est un secours local). */
let memoryCache: PlatformSettings | null = null;

export type AuthOtpChannels = 'EMAIL' | 'WHATSAPP' | 'BOTH';
export type AuthOtpMethod = 'EMAIL' | 'WHATSAPP';

export const AUDIO_NOTIFICATION_PRESETS = ['off', 'chime', 'bell', 'soft', 'urgent', 'cosmic', 'fanfare'] as const;
export type AudioNotificationPreset = (typeof AUDIO_NOTIFICATION_PRESETS)[number];

export const AUDIO_NOTIFICATION_FAMILIES = ['events', 'billing', 'commissions', 'catalog', 'tasks', 'studio'] as const;
export type AudioNotificationFamily = (typeof AUDIO_NOTIFICATION_FAMILIES)[number];

export interface AudioNotificationsSettings {
  enabled: boolean;
  volume: number;
  events: AudioNotificationPreset;
  billing: AudioNotificationPreset;
  commissions: AudioNotificationPreset;
  catalog: AudioNotificationPreset;
  tasks: AudioNotificationPreset;
  studio: AudioNotificationPreset;
  studioStepSound: boolean;
  default: AudioNotificationPreset;
}

export const DEFAULT_AUDIO_NOTIFICATIONS: AudioNotificationsSettings = {
  enabled: true,
  volume: 70,
  events: 'bell',
  billing: 'urgent',
  commissions: 'chime',
  catalog: 'bell',
  tasks: 'soft',
  studio: 'cosmic',
  studioStepSound: true,
  default: 'chime',
};

export interface StudioVisibilitySettings {
  budget: boolean;
  invite: boolean;
  room: boolean;
}

export const DEFAULT_STUDIO_VISIBILITY: StudioVisibilitySettings = {
  budget: true,
  invite: true,
  room: true,
};

export function sanitizeStudioVisibility(raw: unknown): StudioVisibilitySettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    budget: src.budget !== false,
    invite: src.invite !== false,
    room: src.room !== false,
  };
}

export interface CommercialGrantedPermissions {
  canManageTemplates?: boolean;
  canManageMessageTemplates?: boolean;
  canManageCatalog?: boolean;
  canManageEvents?: boolean;
  canManageGuests?: boolean;
  canManageShowcasePlans?: boolean;
}

export interface ShowcaseRoomPlanItem {
  id: string;
  name: string;
  label: string;
  category: string;
  description: string;
  outlineShape?: string;
  blueprint?: unknown;
  presetId?: string;
  isPublished: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export const DEFAULT_SHOWCASE_ROOM_PLANS: ShowcaseRoomPlanItem[] = [
  {
    id: 'banquet-honor',
    name: 'Table d’honneur',
    label: 'Mariage & Table d’Honneur',
    category: 'wedding',
    description: 'Table d’honneur VIP verrouillée avec invités disposés en banquet',
    outlineShape: 'rectangle',
    presetId: 'banquet-honor',
    isPublished: true,
    order: 1,
  },
  {
    id: 'banquet-classic',
    name: 'Banquet classique',
    label: 'Banquet & Réception',
    category: 'banquet',
    description: 'Tables rondes ordonnées en grille avec grande scène de réception',
    outlineShape: 'rectangle',
    presetId: 'banquet-classic',
    isPublished: true,
    order: 2,
  },
  {
    id: 'cocktail',
    name: 'Cocktail & Mange-debout',
    label: 'Cocktail & Mange-debout',
    category: 'cocktail',
    description: 'Espace fluide pour réceptions debout, bar événementiel et zone DJ',
    outlineShape: 'rectangle',
    presetId: 'cocktail',
    isPublished: true,
    order: 3,
  },
  {
    id: 'conference-standard',
    name: 'Conférence standard',
    label: 'Conférence & Séminaire',
    category: 'pro',
    description: 'Rangées de sièges face à la scène principale et pupitre orateur',
    outlineShape: 'rectangle',
    presetId: 'conference-standard',
    isPublished: true,
    order: 4,
  },
  {
    id: 'chairs-ceremony',
    name: 'Allée nuptiale',
    label: 'Cérémonie & Allée Nuptiale',
    category: 'wedding',
    description: 'Double rangée avec allée centrale majestueuse et arche florale',
    outlineShape: 'rectangle',
    presetId: 'chairs-ceremony',
    isPublished: true,
    order: 5,
  },
  {
    id: 'banquet-ushape',
    name: 'Banquet en U',
    label: 'Banquet en U',
    category: 'banquet',
    description: 'Tables rectangulaires conviviales ouvertes vers la scène',
    outlineShape: 'rectangle',
    presetId: 'banquet-ushape',
    isPublished: true,
    order: 6,
  },
  {
    id: 'boardroom',
    name: 'Salle de conseil VIP',
    label: 'Salle de Conseil VIP',
    category: 'pro',
    description: 'Grande table de direction avec fauteuils et écran de présentation',
    outlineShape: 'rectangle',
    presetId: 'boardroom',
    isPublished: true,
    order: 7,
  },
  {
    id: 'chairs-theater',
    name: 'Auditorium & Théâtre',
    label: 'Auditorium & Théâtre',
    category: 'pro',
    description: 'Disposition en gradins théâtraux avec visibilité optimale',
    outlineShape: 'rectangle',
    presetId: 'chairs-theater',
    isPublished: true,
    order: 8,
  },
  {
    id: 'classroom',
    name: 'Formation & Classe',
    label: 'Formation & Classe',
    category: 'pro',
    description: 'Tables de travail partagées avec sièges et allées de circulation',
    outlineShape: 'rectangle',
    presetId: 'classroom',
    isPublished: true,
    order: 9,
  },
];

export function sanitizeShowcaseRoomPlans(raw: unknown): ShowcaseRoomPlanItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SHOWCASE_ROOM_PLANS;
  }
  return raw.map((item, index) => {
    const src = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      id: String(src.id || `showcase-${index + 1}`),
      name: String(src.name || 'Plan sans titre').trim(),
      label: String(src.label || src.name || 'Modèle').trim(),
      category: String(src.category || 'other').trim(),
      description: String(src.description || '').trim(),
      outlineShape: src.outlineShape ? String(src.outlineShape) : 'rectangle',
      blueprint: src.blueprint && typeof src.blueprint === 'object' ? src.blueprint : undefined,
      presetId: src.presetId ? String(src.presetId) : undefined,
      isPublished: src.isPublished !== false,
      order: Number.isFinite(Number(src.order)) ? Number(src.order) : index + 1,
      createdAt: src.createdAt ? String(src.createdAt) : undefined,
      updatedAt: src.updatedAt ? String(src.updatedAt) : undefined,
      updatedBy: src.updatedBy ? String(src.updatedBy) : undefined,
    };
  });
}

export function sanitizeCommercialPermissions(raw: unknown): Record<string, CommercialGrantedPermissions> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const result: Record<string, CommercialGrantedPermissions> = {};
  for (const [userId, perms] of Object.entries(raw as Record<string, unknown>)) {
    if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
      const p = perms as Record<string, unknown>;
      result[userId] = {
        canManageTemplates: Boolean(p.canManageTemplates),
        canManageMessageTemplates: Boolean(p.canManageMessageTemplates),
        canManageCatalog: Boolean(p.canManageCatalog),
        canManageEvents: Boolean(p.canManageEvents),
        canManageGuests: Boolean(p.canManageGuests),
        canManageShowcasePlans: Boolean(p.canManageShowcasePlans),
      };
    }
  }
  return result;
}

function isAudioPreset(value: unknown): value is AudioNotificationPreset {
  return typeof value === 'string' && (AUDIO_NOTIFICATION_PRESETS as readonly string[]).includes(value);
}

export function sanitizeAudioNotifications(raw: unknown): AudioNotificationsSettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const volume = Number(src.volume);
  return {
    enabled: src.enabled !== false,
    volume: Number.isFinite(volume) ? Math.max(0, Math.min(100, Math.round(volume))) : DEFAULT_AUDIO_NOTIFICATIONS.volume,
    events: isAudioPreset(src.events) ? src.events : DEFAULT_AUDIO_NOTIFICATIONS.events,
    billing: isAudioPreset(src.billing) ? src.billing : DEFAULT_AUDIO_NOTIFICATIONS.billing,
    commissions: isAudioPreset(src.commissions) ? src.commissions : DEFAULT_AUDIO_NOTIFICATIONS.commissions,
    catalog: isAudioPreset(src.catalog) ? src.catalog : DEFAULT_AUDIO_NOTIFICATIONS.catalog,
    tasks: isAudioPreset(src.tasks) ? src.tasks : DEFAULT_AUDIO_NOTIFICATIONS.tasks,
    studio: isAudioPreset(src.studio) ? src.studio : DEFAULT_AUDIO_NOTIFICATIONS.studio,
    studioStepSound: src.studioStepSound !== false,
    default: isAudioPreset(src.default) ? src.default : DEFAULT_AUDIO_NOTIFICATIONS.default,
  };
}

export interface PlatformSettings {
  platformName: string;
  platformTagline: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsApp: string;
  whatsappNote: string;
  addressLine1: string;
  addressLine2: string;
  addressShort: string;
  supportHours: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  onlinePaymentsEnabled: boolean;
  /**
   * Mode d’achat des forfaits SaaS :
   * - manual : demande + approbation Super Admin
   * - flexpay : paiement immédiat Visa / Mobile Money via FlexPay
   */
  saasPaymentMode: 'manual' | 'flexpay';
  /** Billets publics : toujours FlexPay (visa + mobile money). */
  ticketPaymentProvider: 'flexpay_card';
  flexPayCardToken: string;
  flexPayCardMerchant: string;
  flexPayCardPayUrl: string;
  flexPayCardCheckUrl: string;
  flexPayMobilePayUrl: string;
  flexPayMobileCheckUrl: string;
  brandPrimary: string;
  brandAccent: string;
  ultramsgInstanceId: string;
  ultramsgToken: string;
  sendgridApiKey: string;
  sendgridFrom: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  /** Commission vendeur marketplace (0.08 = 8 %). */
  marketplaceCommissionRate: number;
  /** Acompte organisateur hors plateforme (0.3 = 30 %). */
  marketplaceDepositRate: number;
  /** Commission commerciale plateforme au premier paiement (0.3 = 30 %). */
  commercialFirstCommissionRate: number;
  /** Commission commerciale plateforme sur les paiements suivants (0.2 = 20 %). */
  commercialRenewalCommissionRate: number;
  /** Taux de change 1 USD en CDF/FC (ex: 2800 = 1$ pour 2800 FC). Configurable par le SuperAdmin. */
  usdExchangeRateCdf: number;
  /** Villes visibles / actives sur le site public. */
  enabledCities: string[];
  /**
   * Canaux OTP d’authentification autorisés :
   * - EMAIL : e-mail uniquement
   * - WHATSAPP : WhatsApp uniquement
   * - BOTH : l’utilisateur choisit
   */
  authOtpChannels: AuthOtpChannels;
  /** Prix d’un jeton IA en FC. */
  aiTokenPriceCdf: number;
  /** Montant minimum d’achat de jetons en FC. */
  aiTokenMinPurchaseCdf: number;
  /** Offres de jetons IA par type de compte et moment de crédit. */
  welcomeAiGrants: WelcomeGrantRules;
  /** Sons in-app des notifications plateforme (cloche web). */
  audioNotifications: AudioNotificationsSettings;
  /** Visibilité des studios IA (budget, invitations, plans 3D). */
  studioVisibility: StudioVisibilitySettings;
  /** Droits délégués aux commerciaux pour les fonctionnalités réservées au Super Admin. */
  commercialPermissions: Record<string, CommercialGrantedPermissions>;
  /** Ouverture des demandes de rabais (période et/ou organisations). */
  subscriptionDiscountAccess: SubscriptionDiscountAccess;
  /** Politique d'autorisation des donations à montant libre. */
  donationsAccess: DonationsAccess;
  /** Plans de salle 2D / 3D affichés en vitrine publique sur /plans-3d. */
  showcaseRoomPlans: ShowcaseRoomPlanItem[];
}

/** Champs exposés publiquement (sans secrets). */
export interface PublicSiteConfig {
  platformName: string;
  platformTagline: string;
  supportEmail: string;
  supportPhone: string;
  supportPhoneHref: string;
  whatsappNote: string;
  addressLine1: string;
  addressLine2: string;
  addressShort: string;
  supportHours: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  onlinePaymentsEnabled: boolean;
  saasPaymentMode: 'manual' | 'flexpay';
  ticketPaymentProvider: 'flexpay_card';
  brandPrimary: string;
  brandAccent: string;
  marketplaceCommissionRate: number;
  marketplaceDepositRate: number;
  marketplaceCommissionPercent: number;
  marketplaceDepositPercent: number;
  commercialFirstCommissionRate: number;
  commercialRenewalCommissionRate: number;
  commercialFirstCommissionPercent: number;
  commercialRenewalCommissionPercent: number;
  /** Taux de change 1 USD en CDF/FC (ex: 2800). */
  usdExchangeRateCdf: number;
  /** Villes visibles / actives sur le site public. */
  enabledCities: string[];
  /** Canaux OTP autorisés pour inscription / validation / reset. */
  authOtpChannels: AuthOtpChannels;
  aiTokenPriceCdf: number;
  aiTokenMinPurchaseCdf: number;
  welcomeAiGrants: WelcomeGrantRules;
  audioNotifications: AudioNotificationsSettings;
  studioVisibility: StudioVisibilitySettings;
  subscriptionDiscountAccess: Pick<SubscriptionDiscountAccess, 'enabled' | 'periodStart' | 'periodEnd'>;
  donationsAccess: DonationsAccess;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'EventMaster',
  platformTagline: 'Préparez votre événement en un clic.',
  supportEmail: process.env.CONTACT_ADMIN_EMAIL || 'mingandajeereq@gmail.com',
  supportPhone: '+243 817 125 577',
  supportWhatsApp: process.env.CONTACT_ADMIN_WHATSAPP || '+243817125577',
  whatsappNote: 'WhatsApp disponible',
  addressLine1: 'Boulevard du 30 Juin, Gombe',
  addressLine2: 'Kinshasa, RD Congo',
  addressShort: 'Boulevard du 30 Juin, Gombe, Kinshasa, RDC',
  supportHours: 'Lun–Sam, 8h–20h (heure de Kinshasa)',
  maintenanceMode: false,
  maintenanceMessage:
    'La plateforme est temporairement en maintenance. Merci de réessayer dans quelques instants.',
  allowRegistration: true,
  onlinePaymentsEnabled: true,
  saasPaymentMode: 'manual',
  ticketPaymentProvider: 'flexpay_card',
  flexPayCardToken: process.env.FLEXPAY_CARD_TOKEN || '',
  flexPayCardMerchant: process.env.FLEXPAY_CARD_MERCHANT || '',
  flexPayCardPayUrl: process.env.FLEXPAY_CARD_PAY_URL || '',
  flexPayCardCheckUrl: process.env.FLEXPAY_CARD_CHECK_URL || '',
  flexPayMobilePayUrl: process.env.FLEXPAY_MOBILE_PAY_URL || '',
  flexPayMobileCheckUrl: process.env.FLEXPAY_MOBILE_CHECK_URL || '',
  brandPrimary: '',
  brandAccent: '',
  ultramsgInstanceId: process.env.ULTRAMSG_INSTANCE_ID || '',
  ultramsgToken: process.env.ULTRAMSG_TOKEN || '',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  sendgridFrom: process.env.SENDGRID_FROM || 'no-reply@eventmaster.cd',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  marketplaceCommissionRate: 0.08,
  marketplaceDepositRate: 0.3,
  commercialFirstCommissionRate: 0.3,
  commercialRenewalCommissionRate: 0.2,
  usdExchangeRateCdf: 2800,
  enabledCities: ['Kinshasa', 'Lubumbashi', 'Goma'],
  authOtpChannels: 'BOTH',
  aiTokenPriceCdf: DEFAULT_AI_TOKEN_PRICE_CDF,
  aiTokenMinPurchaseCdf: DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF,
  welcomeAiGrants: DEFAULT_WELCOME_GRANT_RULES,
  audioNotifications: DEFAULT_AUDIO_NOTIFICATIONS,
  studioVisibility: DEFAULT_STUDIO_VISIBILITY,
  commercialPermissions: {},
  subscriptionDiscountAccess: DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS,
  donationsAccess: DEFAULT_DONATIONS_ACCESS,
  showcaseRoomPlans: DEFAULT_SHOWCASE_ROOM_PLANS,
};

export const PLATFORM_CITY_CATALOG = [
  'Kinshasa',
  'Lubumbashi',
  'Goma',
  'Kisangani',
  'Bukavu',
  'Matadi',
  'Kolwezi',
] as const;

export function sanitizeEnabledCities(value: unknown): string[] {
  const allowed = new Set<string>(PLATFORM_CITY_CATALOG);
  const raw = Array.isArray(value) ? value : DEFAULT_PLATFORM_SETTINGS.enabledCities;
  const picked = raw.map((item) => String(item || '').trim()).filter((item) => allowed.has(item));
  const ordered = PLATFORM_CITY_CATALOG.filter((city) => picked.includes(city));
  if (!ordered.includes('Kinshasa') && !ordered.includes('Lubumbashi')) {
    return ['Kinshasa', ...ordered];
  }
  return ordered.length > 0 ? [...ordered] : ['Kinshasa'];
}

export function sanitizeAuthOtpChannels(value: unknown): AuthOtpChannels {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'EMAIL' || raw === 'WHATSAPP' || raw === 'BOTH') return raw;
  return 'BOTH';
}

export function getAuthOtpChannels(settings = loadPlatformSettings()): AuthOtpChannels {
  return sanitizeAuthOtpChannels(settings.authOtpChannels);
}

export function defaultAuthOtpMethod(settings = loadPlatformSettings()): AuthOtpMethod {
  return getAuthOtpChannels(settings) === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
}

/**
 * Résout une méthode OTP demandée selon la config plateforme.
 * Si un seul canal est autorisé, force ce canal (même si la demande diffère).
 */
export function resolveAuthOtpMethod(
  requested: unknown,
  settings = loadPlatformSettings(),
): AuthOtpMethod {
  const channels = getAuthOtpChannels(settings);
  if (channels === 'EMAIL') return 'EMAIL';
  if (channels === 'WHATSAPP') return 'WHATSAPP';
  return String(requested || '').trim().toUpperCase() === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
}

export function assertAuthOtpMethodAllowed(
  requested: unknown,
  settings = loadPlatformSettings(),
): { ok: true; method: AuthOtpMethod } | { ok: false; error: string } {
  const channels = getAuthOtpChannels(settings);
  const raw = String(requested || '').trim().toUpperCase();
  if (!raw) {
    return { ok: true, method: defaultAuthOtpMethod(settings) };
  }
  if (raw !== 'EMAIL' && raw !== 'WHATSAPP') {
    return { ok: false, error: 'Méthode de validation invalide.' };
  }
  if (channels === 'BOTH' || channels === raw) {
    return { ok: true, method: raw };
  }
  return {
    ok: false,
    error:
      channels === 'EMAIL'
        ? 'Seule la validation par e-mail est activée sur la plateforme.'
        : 'Seule la validation par WhatsApp est activée sur la plateforme.',
  };
}

function ensureSettingsDir() {
  const dir = path.dirname(settingsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function phoneToHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : 'tel:';
}

/** Paiements en ligne (billets événements + forfaits SaaS si mode FlexPay). */
export function isOnlinePaymentsEnabled(settings = loadPlatformSettings()): boolean {
  return settings.onlinePaymentsEnabled !== false;
}

export type TicketPaymentProvider = 'flexpay_card';
export type SaasPaymentMode = 'manual' | 'flexpay';

export function getTicketPaymentProvider(_settings = loadPlatformSettings()): TicketPaymentProvider {
  return 'flexpay_card';
}

export function getSaasPaymentMode(settings = loadPlatformSettings()): SaasPaymentMode {
  return settings.saasPaymentMode === 'flexpay' ? 'flexpay' : 'manual';
}

function mergeStoredSettings(raw: Partial<PlatformSettings> | null | undefined): PlatformSettings {
  const { plans: _ignored, ...rest } = (raw || {}) as Partial<PlatformSettings> & { plans?: unknown };
  return normalizeStoredRates({ ...DEFAULT_PLATFORM_SETTINGS, ...rest });
}

function readSettingsFromFile(): PlatformSettings | null {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const raw = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8')) as Partial<PlatformSettings>;
      return mergeStoredSettings(raw);
    }
  } catch (error) {
    console.warn('[PlatformSettings] Impossible de lire settings.json:', error);
  }
  return null;
}

function writeSettingsFileBestEffort(settings: PlatformSettings) {
  try {
    ensureSettingsDir();
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.warn(
      '[PlatformSettings] Écriture settings.json ignorée (volume éphémère ou lecture seule).',
      error,
    );
  }
}

export function loadPlatformSettings(): PlatformSettings {
  if (memoryCache) return memoryCache;
  memoryCache = readSettingsFromFile() || { ...DEFAULT_PLATFORM_SETTINGS };
  return memoryCache;
}

function normalizeStoredRates(settings: PlatformSettings): PlatformSettings {
  const parsedUsdRate = Number(settings.usdExchangeRateCdf);
  return {
    ...settings,
    marketplaceCommissionRate: parseRateInput(settings.marketplaceCommissionRate, 0.08, 0.01, 0.5),
    marketplaceDepositRate: parseRateInput(settings.marketplaceDepositRate, 0.3, 0.05, 0.9),
    commercialFirstCommissionRate: parseRateInput(settings.commercialFirstCommissionRate, 0.3, 0, 1),
    commercialRenewalCommissionRate: parseRateInput(settings.commercialRenewalCommissionRate, 0.2, 0, 1),
    usdExchangeRateCdf: Number.isFinite(parsedUsdRate) && parsedUsdRate > 0 ? Math.round(parsedUsdRate) : 2800,
    enabledCities: sanitizeEnabledCities(settings.enabledCities),
    authOtpChannels: sanitizeAuthOtpChannels(settings.authOtpChannels),
    aiTokenPriceCdf: sanitizeAiTokenPriceCdf(settings.aiTokenPriceCdf),
    aiTokenMinPurchaseCdf: sanitizeAiTokenMinPurchaseCdf(
      settings.aiTokenMinPurchaseCdf,
      sanitizeAiTokenPriceCdf(settings.aiTokenPriceCdf),
    ),
    welcomeAiGrants: sanitizeWelcomeGrantRules(settings.welcomeAiGrants),
    audioNotifications: sanitizeAudioNotifications(settings.audioNotifications),
    studioVisibility: sanitizeStudioVisibility(settings.studioVisibility),
    commercialPermissions: sanitizeCommercialPermissions(settings.commercialPermissions),
    subscriptionDiscountAccess: sanitizeSubscriptionDiscountAccess(settings.subscriptionDiscountAccess),
    donationsAccess: sanitizeDonationsAccess(settings.donationsAccess),
  };
}

function buildNextSettings(
  partial: Partial<PlatformSettings> & Record<string, unknown>,
): PlatformSettings {
  const current = loadPlatformSettings();
  const { plans: _plans, ...rest } = partial;

  const next: PlatformSettings = { ...current };
  const keys = Object.keys(DEFAULT_PLATFORM_SETTINGS) as Array<keyof PlatformSettings>;
  for (const key of keys) {
    if (key in rest && rest[key] !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = rest[key];
    }
  }

  next.marketplaceCommissionRate = parseRateInput(next.marketplaceCommissionRate, 0.08, 0.01, 0.5);
  next.marketplaceDepositRate = parseRateInput(next.marketplaceDepositRate, 0.3, 0.05, 0.9);
  next.commercialFirstCommissionRate = parseRateInput(next.commercialFirstCommissionRate, 0.3, 0, 1);
  next.commercialRenewalCommissionRate = parseRateInput(next.commercialRenewalCommissionRate, 0.2, 0, 1);
  const parsedUsdRate = Number(next.usdExchangeRateCdf);
  next.usdExchangeRateCdf = Number.isFinite(parsedUsdRate) && parsedUsdRate > 0 ? Math.round(parsedUsdRate) : 2800;
  next.enabledCities = sanitizeEnabledCities(next.enabledCities);
  next.authOtpChannels = sanitizeAuthOtpChannels(next.authOtpChannels);
  next.aiTokenPriceCdf = sanitizeAiTokenPriceCdf(next.aiTokenPriceCdf);
  next.aiTokenMinPurchaseCdf = sanitizeAiTokenMinPurchaseCdf(next.aiTokenMinPurchaseCdf, next.aiTokenPriceCdf);
  next.welcomeAiGrants = sanitizeWelcomeGrantRules(next.welcomeAiGrants);
  next.audioNotifications = sanitizeAudioNotifications(next.audioNotifications);
  next.studioVisibility = sanitizeStudioVisibility(next.studioVisibility);
  next.commercialPermissions = sanitizeCommercialPermissions(next.commercialPermissions);
  next.subscriptionDiscountAccess = sanitizeSubscriptionDiscountAccess(next.subscriptionDiscountAccess);
  next.donationsAccess = sanitizeDonationsAccess(next.donationsAccess);
  next.showcaseRoomPlans = sanitizeShowcaseRoomPlans(next.showcaseRoomPlans);
  next.ticketPaymentProvider = 'flexpay_card';
  next.saasPaymentMode = next.saasPaymentMode === 'flexpay' ? 'flexpay' : 'manual';
  next.onlinePaymentsEnabled = next.onlinePaymentsEnabled !== false;
  return next;
}

async function persistPlatformConfigToDb(settings: PlatformSettings): Promise<void> {
  const payload = JSON.parse(JSON.stringify(settings)) as Prisma.InputJsonValue;
  await prisma.platformConfig.upsert({
    where: { id: PLATFORM_CONFIG_ID },
    create: { id: PLATFORM_CONFIG_ID, payload },
    update: { payload },
  });
}

function applySettingsToCache(next: PlatformSettings): PlatformSettings {
  memoryCache = next;
  writeSettingsFileBestEffort(next);
  return next;
}

export function savePlatformSettings(
  partial: Partial<PlatformSettings> & Record<string, unknown>,
): PlatformSettings {
  const next = applySettingsToCache(buildNextSettings(partial));
  void persistPlatformConfigToDb(next).catch((error) => {
    console.error('[PlatformSettings] Persistance en base échouée:', error);
  });
  return next;
}

/** Sauvegarde admin : cache + fichier local + Postgres (survit aux déploiements). */
export async function savePlatformSettingsDurable(
  partial: Partial<PlatformSettings> & Record<string, unknown>,
): Promise<PlatformSettings> {
  const previous = loadPlatformSettings();
  const next = applySettingsToCache(buildNextSettings(partial));
  try {
    await persistPlatformConfigToDb(next);
    return next;
  } catch (error) {
    applySettingsToCache(previous);
    throw error;
  }
}

/** Charge les réglages depuis Postgres au boot, ou y recopie fichier/défauts si la table est vide. */
export async function hydratePlatformSettingsFromDb(): Promise<void> {
  try {
    const row = await prisma.platformConfig.findUnique({ where: { id: PLATFORM_CONFIG_ID } });
    if (row?.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
      memoryCache = mergeStoredSettings(row.payload as Partial<PlatformSettings>);
      writeSettingsFileBestEffort(memoryCache);
      console.log('[PlatformSettings] Réglages chargés depuis la base.');
      return;
    }

    const seed = loadPlatformSettings();
    await persistPlatformConfigToDb(seed);
    console.log('[PlatformSettings] Réglages initiaux enregistrés en base.');
  } catch (error) {
    console.warn('[PlatformSettings] Hydratation BD impossible — fichier ou défauts.', error);
    loadPlatformSettings();
  }
}

export function getPublicSiteConfig(settings = loadPlatformSettings()): PublicSiteConfig {
  return {
    platformName: settings.platformName,
    platformTagline: settings.platformTagline,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    supportPhoneHref: phoneToHref(settings.supportPhone),
    whatsappNote: settings.whatsappNote,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    addressShort: settings.addressShort || `${settings.addressLine1}, ${settings.addressLine2}`,
    supportHours: settings.supportHours,
    maintenanceMode: Boolean(settings.maintenanceMode),
    maintenanceMessage: settings.maintenanceMessage,
    allowRegistration: settings.allowRegistration !== false,
    onlinePaymentsEnabled: isOnlinePaymentsEnabled(settings),
    saasPaymentMode: getSaasPaymentMode(settings),
    ticketPaymentProvider: getTicketPaymentProvider(settings),
    brandPrimary: settings.brandPrimary || '',
    brandAccent: settings.brandAccent || '',
    marketplaceCommissionRate: parseRateInput(settings.marketplaceCommissionRate, 0.08, 0.01, 0.5),
    marketplaceDepositRate: parseRateInput(settings.marketplaceDepositRate, 0.3, 0.05, 0.9),
    marketplaceCommissionPercent: rateToPercent(
      parseRateInput(settings.marketplaceCommissionRate, 0.08, 0.01, 0.5),
    ),
    marketplaceDepositPercent: rateToPercent(parseRateInput(settings.marketplaceDepositRate, 0.3, 0.05, 0.9)),
    commercialFirstCommissionRate: parseRateInput(settings.commercialFirstCommissionRate, 0.3, 0, 1),
    commercialRenewalCommissionRate: parseRateInput(settings.commercialRenewalCommissionRate, 0.2, 0, 1),
    commercialFirstCommissionPercent: rateToPercent(
      parseRateInput(settings.commercialFirstCommissionRate, 0.3, 0, 1),
    ),
    commercialRenewalCommissionPercent: rateToPercent(
      parseRateInput(settings.commercialRenewalCommissionRate, 0.2, 0, 1),
    ),
    usdExchangeRateCdf: Number(settings.usdExchangeRateCdf) > 0 ? Math.round(Number(settings.usdExchangeRateCdf)) : 2800,
    enabledCities: sanitizeEnabledCities(settings.enabledCities),
    authOtpChannels: sanitizeAuthOtpChannels(settings.authOtpChannels),
    aiTokenPriceCdf: sanitizeAiTokenPriceCdf(settings.aiTokenPriceCdf),
    aiTokenMinPurchaseCdf: sanitizeAiTokenMinPurchaseCdf(
      settings.aiTokenMinPurchaseCdf,
      sanitizeAiTokenPriceCdf(settings.aiTokenPriceCdf),
    ),
    welcomeAiGrants: sanitizeWelcomeGrantRules(settings.welcomeAiGrants),
    audioNotifications: sanitizeAudioNotifications(settings.audioNotifications),
    studioVisibility: sanitizeStudioVisibility(settings.studioVisibility),
    subscriptionDiscountAccess: (() => {
      const access = sanitizeSubscriptionDiscountAccess(settings.subscriptionDiscountAccess);
      return {
        enabled: access.enabled,
        periodStart: access.periodStart,
        periodEnd: access.periodEnd,
      };
    })(),
    donationsAccess: sanitizeDonationsAccess(settings.donationsAccess),
  };
}

export function getDonationsAccess(settings = loadPlatformSettings()) {
  return sanitizeDonationsAccess(settings.donationsAccess);
}

export function getSubscriptionDiscountAccess(settings = loadPlatformSettings()) {
  return sanitizeSubscriptionDiscountAccess(settings.subscriptionDiscountAccess);
}

export function getContactDestinations(settings = loadPlatformSettings()) {
  return {
    email: settings.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail,
    whatsapp: settings.supportWhatsApp || DEFAULT_PLATFORM_SETTINGS.supportWhatsApp,
    platformName: settings.platformName || DEFAULT_PLATFORM_SETTINGS.platformName,
  };
}

/** Masque les secrets pour l’API admin (affichage partiel). */
export function maskSecretsForAdmin(settings: PlatformSettings): PlatformSettings & {
  sendgridConfigured: boolean;
  ultramsgConfigured: boolean;
} {
  const mask = (v: string) => (v && v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : v ? '••••••••' : '');
  return {
    ...settings,
    sendgridApiKey: settings.sendgridApiKey ? mask(settings.sendgridApiKey) : '',
    ultramsgToken: settings.ultramsgToken ? mask(settings.ultramsgToken) : '',
    twilioAuthToken: settings.twilioAuthToken ? mask(settings.twilioAuthToken) : '',
    flexPayCardToken: settings.flexPayCardToken ? mask(settings.flexPayCardToken) : '',
    sendgridConfigured: Boolean(settings.sendgridApiKey?.trim() && settings.sendgridFrom?.trim()),
    ultramsgConfigured: Boolean(settings.ultramsgInstanceId?.trim() && settings.ultramsgToken?.trim()),
  };
}

/**
 * Merge admin PUT body : ne remplace un secret que s’il est fourni en clair
 * (pas une valeur déjà masquée avec « … »).
 */
export function mergeSettingsUpdate(
  current: PlatformSettings,
  body: Record<string, unknown>,
): Partial<PlatformSettings> {
  const secretKeys: Array<keyof PlatformSettings> = [
    'sendgridApiKey',
    'ultramsgToken',
    'twilioAuthToken',
    'flexPayCardToken',
  ];
  const next: Record<string, unknown> = { ...body };
  for (const key of secretKeys) {
    const val = next[key];
    if (typeof val !== 'string' || !val.trim() || val.includes('…') || val.includes('••••')) {
      delete next[key];
    }
  }
  return next as Partial<PlatformSettings>;
}

export interface NotificationCredentials {
  sendgridApiKey: string;
  sendgridFrom: string;
  twilioSid: string;
  twilioAuthToken: string;
  twilioPhone: string;
  ultramsgInstanceId: string;
  ultramsgToken: string;
}

/** Credentials notifications = settings plateforme + fallback env. */
export function getNotificationCredentials(
  settings = loadPlatformSettings(),
): NotificationCredentials {
  const pick = (fromSettings: string, envKey: string, fallback = '') => {
    if (fromSettings?.trim()) return fromSettings.trim();
    const fromEnv = process.env[envKey];
    if (fromEnv?.trim()) return fromEnv.trim();
    return fallback;
  };

  return {
    sendgridApiKey: pick(settings.sendgridApiKey, 'SENDGRID_API_KEY'),
    sendgridFrom: pick(settings.sendgridFrom, 'SENDGRID_FROM', 'no-reply@eventmaster.cd'),
    twilioSid: pick(settings.twilioAccountSid, 'TWILIO_ACCOUNT_SID'),
    twilioAuthToken: pick(settings.twilioAuthToken, 'TWILIO_AUTH_TOKEN'),
    twilioPhone: pick(settings.twilioPhoneNumber, 'TWILIO_PHONE_NUMBER'),
    ultramsgInstanceId: pick(settings.ultramsgInstanceId, 'ULTRAMSG_INSTANCE_ID'),
    ultramsgToken: pick(settings.ultramsgToken, 'ULTRAMSG_TOKEN'),
  };
}

export { settingsFilePath };

export function getCommercialPermissions(userId: string): CommercialGrantedPermissions {
  const settings = loadPlatformSettings();
  return settings.commercialPermissions?.[userId] || {};
}

export function hasCommercialPermission(userId: string, perm: keyof CommercialGrantedPermissions): boolean {
  const userPerms = getCommercialPermissions(userId);
  return Boolean(userPerms[perm]);
}

/** Vérifie si un utilisateur a le droit de gérer les plans vitrine 2D/3D (Super Admin ou Commercial habilité). */
export function canManageShowcasePlans(user?: { id?: string; role?: string }): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'COMMERCIAL' && user.id && hasCommercialPermission(user.id, 'canManageShowcasePlans')) {
    return true;
  }
  return false;
}

export async function setCommercialPermissions(userId: string, permissions: CommercialGrantedPermissions): Promise<void> {
  const settings = loadPlatformSettings();
  const current = { ...(settings.commercialPermissions || {}) };
  current[userId] = {
    canManageTemplates: Boolean(permissions.canManageTemplates),
    canManageMessageTemplates: Boolean(permissions.canManageMessageTemplates),
    canManageCatalog: Boolean(permissions.canManageCatalog),
    canManageEvents: Boolean(permissions.canManageEvents),
    canManageGuests: Boolean(permissions.canManageGuests),
    canManageShowcasePlans: Boolean(permissions.canManageShowcasePlans),
  };
  await savePlatformSettingsDurable({ commercialPermissions: current });
}

export async function removeCommercialPermissions(userId: string): Promise<void> {
  const settings = loadPlatformSettings();
  if (!settings.commercialPermissions?.[userId]) return;
  const current = { ...settings.commercialPermissions };
  delete current[userId];
  await savePlatformSettingsDurable({ commercialPermissions: current });
}

