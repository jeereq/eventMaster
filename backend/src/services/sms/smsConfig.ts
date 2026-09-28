/**
 * Configuration et identifiants pour la passerelle SMS.
 * Isolée des modules de base de données pour permettre l'exécution légère,
 * les tests unitaires et l'extensibilité sans dépendance circulaire.
 */

export interface SmsGatewayCredentials {
  smsProvider?: string;
  dreamDigitalBaseUrl?: string;
  dreamDigitalApiId?: string;
  dreamDigitalApiPassword?: string;
  dreamDigitalSenderId?: string;
  twilioSid?: string;
  twilioAuthToken?: string;
  twilioPhone?: string;
  customSmsUrl?: string;
  customSmsApiKey?: string;
  customSmsSenderId?: string;
}

let runtimeCredentials: SmsGatewayCredentials | null = null;

/**
 * Définit ou surcharge les identifiants SMS à l'exécution
 * (appelé par platformSettingsService lors du chargement des réglages plateforme).
 */
export function setSmsRuntimeCredentials(creds: Partial<SmsGatewayCredentials> | null): void {
  if (!creds) {
    runtimeCredentials = null;
    return;
  }
  runtimeCredentials = { ...(runtimeCredentials || {}), ...creds };
}

/**
 * Récupère les identifiants SMS actuels.
 * La configuration Dream Digital provient exclusivement des réglages Super Admin
 * synchronisés à l'exécution par platformSettingsService.
 */
export function getSmsGatewayCredentials(): SmsGatewayCredentials {
  return {
    smsProvider: runtimeCredentials?.smsProvider || 'dream-digital',
    dreamDigitalBaseUrl: runtimeCredentials?.dreamDigitalBaseUrl || '',
    dreamDigitalApiId: runtimeCredentials?.dreamDigitalApiId || '',
    dreamDigitalApiPassword: runtimeCredentials?.dreamDigitalApiPassword || '',
    dreamDigitalSenderId: runtimeCredentials?.dreamDigitalSenderId || '',
    twilioSid: runtimeCredentials?.twilioSid || process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: runtimeCredentials?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhone: runtimeCredentials?.twilioPhone || process.env.TWILIO_PHONE_NUMBER || '',
    customSmsUrl: runtimeCredentials?.customSmsUrl || process.env.CUSTOM_SMS_URL || '',
    customSmsApiKey: runtimeCredentials?.customSmsApiKey || process.env.CUSTOM_SMS_API_KEY || '',
    customSmsSenderId: runtimeCredentials?.customSmsSenderId || process.env.CUSTOM_SMS_SENDER_ID || 'EVENTMASTER',
  };
}
