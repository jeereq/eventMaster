import fs from 'fs';
import path from 'path';

const settingsFilePath = path.join(__dirname, 'settings.json');

export interface NotificationCredentials {
  sendgridApiKey: string;
  sendgridFrom: string;
  twilioSid: string;
  twilioAuthToken: string;
  twilioPhone: string;
  ultramsgInstanceId: string;
  ultramsgToken: string;
}

function readSettingsFile(): Record<string, unknown> {
  try {
    if (fs.existsSync(settingsFilePath)) {
      return JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
    }
  } catch (error) {
    console.warn('[Notification Config] Impossible de lire settings.json:', error);
  }
  return {};
}

function pickString(settings: Record<string, unknown>, settingsKey: string, envKey: string, fallback = ''): string {
  const fromSettings = settings[settingsKey];
  if (typeof fromSettings === 'string' && fromSettings.trim()) {
    return fromSettings.trim();
  }
  const fromEnv = process.env[envKey];
  if (fromEnv?.trim()) {
    return fromEnv.trim();
  }
  return fallback;
}

/** Lit settings.json (panneau admin) avec repli sur les variables d'environnement. */
export function getNotificationCredentials(): NotificationCredentials {
  const settings = readSettingsFile();

  return {
    sendgridApiKey: pickString(settings, 'sendgridApiKey', 'SENDGRID_API_KEY'),
    sendgridFrom: pickString(settings, 'sendgridFrom', 'SENDGRID_FROM', 'no-reply@eventmaster.cd'),
    twilioSid: pickString(settings, 'twilioAccountSid', 'TWILIO_ACCOUNT_SID'),
    twilioAuthToken: pickString(settings, 'twilioAuthToken', 'TWILIO_AUTH_TOKEN'),
    twilioPhone: pickString(settings, 'twilioPhoneNumber', 'TWILIO_PHONE_NUMBER'),
    ultramsgInstanceId: pickString(settings, 'ultramsgInstanceId', 'ULTRAMSG_INSTANCE_ID'),
    ultramsgToken: pickString(settings, 'ultramsgToken', 'ULTRAMSG_TOKEN'),
  };
}

export function isUltraMsgConfigured(credentials = getNotificationCredentials()): boolean {
  return !!(credentials.ultramsgInstanceId && credentials.ultramsgToken);
}

export function logNotificationConfigStatus(): void {
  const creds = getNotificationCredentials();
  const settingsExists = fs.existsSync(settingsFilePath);

  console.log(`[Notification Config] settings.json ${settingsExists ? 'trouvé' : 'absent'} — credentials chargées depuis le panneau admin et/ou les variables d'environnement.`);

  if (creds.sendgridApiKey) {
    console.log('[Notification Service] SendGrid configuré.');
  } else {
    console.warn('[Notification Service] SendGrid non configuré — envoi e-mail simulé.');
  }

  if (creds.twilioSid && creds.twilioAuthToken && creds.twilioPhone) {
    console.log('[Notification Service] Twilio configuré.');
  } else {
    console.warn('[Notification Service] Twilio non configuré — envoi SMS simulé.');
  }

  if (isUltraMsgConfigured(creds)) {
    console.log('[Notification Service] UltraMsg configuré pour WhatsApp.');
  } else {
    console.warn('[Notification Service] UltraMsg non configuré — envoi WhatsApp simulé.');
  }
}
