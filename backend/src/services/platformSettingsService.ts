import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { parseRateInput, rateToPercent } from '../utils/ratePercent';

const settingsFilePath = path.join(__dirname, '..', 'config', 'settings.json');
const PLATFORM_CONFIG_ID = 'default';

/** Cache processus : source de vérité après hydratation BD (le fichier est un secours local). */
let memoryCache: PlatformSettings | null = null;

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
  };
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
