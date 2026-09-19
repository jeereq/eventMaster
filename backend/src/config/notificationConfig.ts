import {
  getNotificationCredentials as loadNotificationCredentials,
  type NotificationCredentials,
} from '../services/platformSettingsService.ts';

export type { NotificationCredentials };

export function getNotificationCredentials(): NotificationCredentials {
  return loadNotificationCredentials();
}

export function isSendGridConfigured(credentials = getNotificationCredentials()): boolean {
  return !!(credentials.sendgridApiKey?.trim() && credentials.sendgridFrom?.trim());
}

export function isUltraMsgConfigured(credentials = getNotificationCredentials()): boolean {
  return !!(credentials.ultramsgInstanceId && credentials.ultramsgToken);
}

export function isSmsConfigured(credentials = getNotificationCredentials()): boolean {
  const provider = (credentials.smsProvider || 'dream-digital').toLowerCase();
  if (provider === 'twilio') {
    return Boolean(credentials.twilioSid && credentials.twilioAuthToken && credentials.twilioPhone);
  }
  if (provider === 'custom') {
    return Boolean(credentials.customSmsUrl?.trim());
  }
  return Boolean(credentials.dreamDigitalApiId?.trim() && credentials.dreamDigitalApiPassword?.trim());
}

export function assertSendGridConfigured(): void {
  if (!isSendGridConfigured()) {
    throw new Error(
      "SendGrid obligatoire pour l'envoi d'e-mails. Configurez sendgridApiKey et sendgridFrom dans les réglages plateforme (ou SENDGRID_API_KEY / SENDGRID_FROM).",
    );
  }
}

export function logNotificationConfigStatus(): void {
  const creds = getNotificationCredentials();

  console.log(
    "[Notification Config] Credentials chargées depuis les réglages plateforme et/ou les variables d'environnement.",
  );

  if (isSendGridConfigured(creds)) {
    console.log(`[Notification Service] SendGrid configuré (expéditeur: ${creds.sendgridFrom}).`);
  } else {
    console.error('[Notification Service] SendGrid NON configuré — les e-mails ne pourront PAS être envoyés.');
  }

  if (isUltraMsgConfigured(creds)) {
    console.log('[Notification Service] UltraMsg configuré pour WhatsApp.');
  } else {
    console.warn('[Notification Service] UltraMsg non configuré — envoi WhatsApp simulé.');
  }

  if (isSmsConfigured(creds)) {
    const provider = creds.smsProvider || 'dream-digital';
    const sender = provider === 'twilio' ? creds.twilioPhone : creds.dreamDigitalSenderId || 'EVENTMASTER';
    console.log(`[Notification Service] Passerelle SMS configurée (fournisseur: ${provider}, expéditeur: ${sender}).`);
  } else {
    console.warn('[Notification Service] Passerelle SMS non configurée — envoi SMS simulé.');
  }
}
