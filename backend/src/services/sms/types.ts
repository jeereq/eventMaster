/**
 * Types et interfaces pour la passerelle SMS extensible d'EventMaster.
 * Permet d'intégrer Dream Digital (aSMSC v3.0) tout en restant ouvert
 * à l'ajout ultérieur d'autres passerelles (Twilio, Orange, Infobip, passerelle générique HTTP, etc.).
 */

export type SmsType = 'T' | 'P'; // 'T' = Transactionnel (OTP, RSVP, rappels), 'P' = Promotionnel
export type SmsEncoding = 'T' | 'U' | 'FS' | 'UFS'; // 'T' = Texte GSM standard, 'U' = Unicode (accents, emojis)

export interface SmsSendOptions {
  /** Numéro(s) de téléphone destinataire (format national ou international). */
  to: string | string[];
  /** Contenu texte du SMS. */
  text: string;
  /** Nom ou numéro de l'expéditeur (Sender ID). Par défaut: configuration active. */
  senderId?: string;
  /** Référence unique de message (renvoyée dans les statuts et callbacks). */
  uid?: string;
  /** Type de SMS (T = transactionnel, P = promotionnel). Défaut: 'T'. */
  smsType?: SmsType;
  /** Encodage explicite (détecté automatiquement si non renseigné). */
  encoding?: SmsEncoding;
  /** Durée de validité en secondes (défaut aSMSC: 172800 = 2 jours). */
  validitySeconds?: number;
  /** URL de webhook pour le rapport d'acheminement (Delivery Report). */
  callbackUrl?: string;
}

export interface SmsSendResult {
  /** Succès de la soumission du SMS à la passerelle. */
  success: boolean;
  /** Indique si l'envoi a été simulé (identifiants non renseignés ou mode dev). */
  simulated: boolean;
  /** Identifiant de la passerelle utilisée ('dream-digital', 'twilio', 'custom', etc.). */
  provider: string;
  /** Identifiant du message retourné par la passerelle (message_id). */
  messageId?: string;
  /** Remarques ou statut textuel retourné par la passerelle. */
  remarks?: string;
  /** Message d'erreur en cas d'échec. */
  error?: string;
  /** Charge brute retournée par l'API pour inspection/debug. */
  raw?: unknown;
}

export interface SmsBalanceResult {
  success: boolean;
  provider: string;
  balance?: number;
  currency?: string;
  error?: string;
  raw?: unknown;
}

export interface SmsDeliveryStatusResult {
  success: boolean;
  provider: string;
  messageId?: string;
  status?: string; // Ex: 'Delivered', 'Pending', 'Failed', 'Undeliverable'
  sentDateUTC?: string;
  remarks?: string;
  error?: string;
  raw?: unknown;
}

/**
 * Interface normalisée pour toute passerelle SMS intégrable dans EventMaster.
 */
export interface SmsProvider {
  /** Identifiant unique de la passerelle (ex: 'dream-digital', 'twilio', 'custom'). */
  readonly name: string;
  /** Nom lisible pour l'administration et les logs (ex: 'Dream Digital (aSMSC v3.0)'). */
  readonly label: string;

  /** Indique si la passerelle dispose des identifiants nécessaires pour émettre de vrais SMS. */
  isConfigured(): boolean;

  /** Émet un ou plusieurs SMS via cette passerelle. */
  sendSms(options: SmsSendOptions): Promise<SmsSendResult>;

  /** Interroge le solde restant (optionnel). */
  checkBalance?(): Promise<SmsBalanceResult>;

  /** Interroge le rapport d'acheminement d'un SMS envoyé (optionnel). */
  getDeliveryStatus?(messageId: string, uid?: string): Promise<SmsDeliveryStatusResult>;
}
