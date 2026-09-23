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
 * Récupère les identifiants SMS actuels (réglages d'exécution ou variables d'environnement).
 */
export function getSmsGatewayCredentials(): SmsGatewayCredentials {
  return {
    smsProvider: runtimeCredentials?.smsProvider || process.env.SMS_PROVIDER || 'dream-digital',
    dreamDigitalBaseUrl:
      runtimeCredentials?.dreamDigitalBaseUrl ||
      process.env.DREAM_DIGITAL_BASE_URL ||
      process.env.SMS_API_URL ||
      'https://api2.dream-digital.info',
    dreamDigitalApiId:
      runtimeCredentials?.dreamDigitalApiId ||
      process.env.DREAM_DIGITAL_API_ID ||
      process.env.SMS_API_ID ||
      '',
    dreamDigitalApiPassword:
      runtimeCredentials?.dreamDigitalApiPassword ||
      process.env.DREAM_DIGITAL_API_PASSWORD ||
      process.env.SMS_API_PASSWORD ||
      '',
    dreamDigitalSenderId:
      runtimeCredentials?.dreamDigitalSenderId ||
      process.env.DREAM_DIGITAL_SENDER_ID ||
      process.env.SMS_SENDER_ID ||
      'EVENTMASTER',
    twilioSid: runtimeCredentials?.twilioSid || process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: runtimeCredentials?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhone: runtimeCredentials?.twilioPhone || process.env.TWILIO_PHONE_NUMBER || '',
    customSmsUrl: runtimeCredentials?.customSmsUrl || process.env.CUSTOM_SMS_URL || '',
    customSmsApiKey: runtimeCredentials?.customSmsApiKey || process.env.CUSTOM_SMS_API_KEY || '',
    customSmsSenderId: runtimeCredentials?.customSmsSenderId || process.env.CUSTOM_SMS_SENDER_ID || 'EVENTMASTER',
  };
}
