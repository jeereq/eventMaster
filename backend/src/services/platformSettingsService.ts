import fs from 'fs';
import path from 'path';

const settingsFilePath = path.join(__dirname, '..', 'config', 'settings.json');

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
  brandPrimary: string;
  brandAccent: string;
  ultramsgInstanceId: string;
  ultramsgToken: string;
  sendgridApiKey: string;
  sendgridFrom: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
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
  brandPrimary: string;
  brandAccent: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'EventMaster',
  platformTagline: 'Organisez vos événements, de la salle au scan invité.',
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
  brandPrimary: '',
  brandAccent: '',
  ultramsgInstanceId: process.env.ULTRAMSG_INSTANCE_ID || '',
  ultramsgToken: process.env.ULTRAMSG_TOKEN || '',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  sendgridFrom: process.env.SENDGRID_FROM || 'no-reply@eventmaster.cd',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
};

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

export function loadPlatformSettings(): PlatformSettings {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const raw = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8')) as Partial<PlatformSettings>;
      const { plans: _ignored, ...rest } = raw as Partial<PlatformSettings> & { plans?: unknown };
      return { ...DEFAULT_PLATFORM_SETTINGS, ...rest };
    }
  } catch (error) {
    console.warn('[PlatformSettings] Impossible de lire settings.json:', error);
  }
  return { ...DEFAULT_PLATFORM_SETTINGS };
}

export function savePlatformSettings(
  partial: Partial<PlatformSettings> & Record<string, unknown>,
): PlatformSettings {
  ensureSettingsDir();
  const current = loadPlatformSettings();
  const { plans: _plans, ...rest } = partial;

  const next: PlatformSettings = { ...current };
  const keys = Object.keys(DEFAULT_PLATFORM_SETTINGS) as Array<keyof PlatformSettings>;
  for (const key of keys) {
    if (key in rest && rest[key] !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = rest[key];
    }
  }

  fs.writeFileSync(settingsFilePath, JSON.stringify(next, null, 2), 'utf-8');
  return next;
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
    brandPrimary: settings.brandPrimary || '',
    brandAccent: settings.brandAccent || '',
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
