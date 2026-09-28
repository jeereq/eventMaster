import { formatPhoneE164 } from '../../utils/phone.ts';
import { getSmsGatewayCredentials } from './smsConfig.ts';
import type {
  SmsBalanceResult,
  SmsDeliveryStatusResult,
  SmsEncoding,
  SmsProvider,
  SmsSendOptions,
  SmsSendResult,
} from './types.ts';

const DREAM_DIGITAL_SEND_PATH = '/api/SendSms';
const DREAM_DIGITAL_TIMEOUT_MS = 10_000;
const GSM_7_BASIC_CHARACTERS =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_7_EXTENSION_CHARACTERS = '\f^{}\\[~]|€';
const GSM_7_CHARACTERS = new Set(
  Array.from(`${GSM_7_BASIC_CHARACTERS}${GSM_7_EXTENSION_CHARACTERS}`),
);

/**
 * Normalise un numéro pour aSMSC (Dream Digital) :
 * L'API aSMSC impose un format indicatif pays + numéro sans le préfixe '+' (ex: 243812345678).
 */
export function formatPhoneForAsmsc(raw: string): string {
  const e164 = formatPhoneE164(raw);
  const digits = e164.replace(/^\+/, '');
  return /^\d{7,15}$/.test(digits) ? digits : '';
}

/**
 * Détermine l'encodage selon le contenu :
 * - 'T' : alphabet GSM-7, y compris sa table d'extension
 * - 'U' : Unicode pour les caractères hors GSM-7, notamment les emojis
 */
export function detectAsmscEncoding(text: string): SmsEncoding {
  const isPlainGsm = Array.from(text).every((character) => GSM_7_CHARACTERS.has(character));
  return isPlainGsm ? 'T' : 'U';
}

function isValidApiBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Implémentation de la passerelle SMS Dream Digital basée sur la spécification aSMSC v3.0.
 */
export class DreamDigitalSmsProvider implements SmsProvider {
  readonly name = 'dream-digital';
  readonly label = 'Dream Digital (aSMSC v3.0)';

  private getCredentials() {
    const creds = getSmsGatewayCredentials();
    const baseUrl = (creds.dreamDigitalBaseUrl || '').trim().replace(/\/+$/, '');
    const apiId = (creds.dreamDigitalApiId || '').trim();
    const apiPassword = (creds.dreamDigitalApiPassword || '').trim();
    const senderId = (creds.dreamDigitalSenderId || '').trim();
    return { baseUrl, apiId, apiPassword, senderId };
  }

  isConfigured(): boolean {
    const { baseUrl, apiId, apiPassword, senderId } = this.getCredentials();
    return Boolean(isValidApiBaseUrl(baseUrl) && apiId && apiPassword && senderId);
  }

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    const { baseUrl, apiId, apiPassword, senderId } = this.getCredentials();

    // Normalisation des numéros de téléphone
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const formattedNumbers = recipients
      .map((r) => formatPhoneForAsmsc(r))
      .filter((n) => n.length >= 7);

    if (formattedNumbers.length === 0) {
      return {
        success: false,
        simulated: false,
        provider: this.name,
        error: 'Aucun numéro de téléphone valide fourni.',
      };
    }

    const phoneParam = formattedNumbers.join(',');
    const resolvedSenderId = options.senderId?.trim() || senderId;
    const encoding = options.encoding || detectAsmscEncoding(options.text);
    const smsType = options.smsType || 'T';

    // Simulation uniquement hors production lorsque la configuration Super Admin est incomplète.
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          simulated: false,
          provider: this.name,
          error:
            'Configuration Dream Digital incomplète. Le Super Admin doit définir un hôte HTTPS, un API ID, un mot de passe et un Sender ID.',
        };
      }
      console.log(
        `[Simulation] Dream Digital SMS (aSMSC) vers ${phoneParam} (expéditeur: ${resolvedSenderId || 'non configuré'}, type: ${smsType}, encodage: ${encoding}):\nMessage: ${options.text}\n`,
      );
      return {
        success: true,
        simulated: true,
        provider: this.name,
        messageId: `sim-dd-${Date.now()}`,
        remarks: 'Message simulé avec succès (Dream Digital non configuré)',
      };
    }

    const endpoint = new URL(`${baseUrl}${DREAM_DIGITAL_SEND_PATH}`);
    endpoint.search = new URLSearchParams({
      api_id: apiId,
      api_password: apiPassword,
      sms_type: smsType,
      encoding,
      sender_id: resolvedSenderId,
      phonenumber: phoneParam,
      textmessage: options.text,
    }).toString();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(DREAM_DIGITAL_TIMEOUT_MS),
      });

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { rawText };
      }

      // La spécification aSMSC retourne {"status": "S", "message_id": 4125, "remarks": "..."}
      const statusUpper = String(data?.status || '').toUpperCase();
      const isSuccess = statusUpper === 'S';

      if (response.ok && (isSuccess || data?.message_id)) {
        const messageId = String(data?.message_id || data?.messageId || data?.id || 'dd-sent');
        console.log(
          `[SMS Service] Dream Digital SMS transmis avec succès à ${phoneParam}. ID message: ${messageId}`,
        );
        return {
          success: true,
          simulated: false,
          provider: this.name,
          messageId,
          remarks: data?.remarks || 'Message Submitted Successfully',
          raw: data,
        };
      }

      const errMsg =
        data?.remarks ||
        data?.error ||
        data?.message ||
        `Échec de soumission Dream Digital aSMSC (HTTP ${response.status}): ${rawText.slice(0, 200)}`;

      console.error(`[SMS Service] Erreur Dream Digital pour ${phoneParam}:`, errMsg);
      return {
        success: false,
        simulated: false,
        provider: this.name,
        error: errMsg,
        raw: data,
      };
    } catch (error: any) {
      const errorMessage =
        error?.name === 'TimeoutError'
          ? 'Délai de 10 secondes dépassé lors de l’appel Dream Digital.'
          : 'La requête vers Dream Digital a échoué.';
      console.error(`[SMS Service] Exception lors de l'appel Dream Digital vers ${phoneParam}: ${errorMessage}`);
      return {
        success: false,
        simulated: false,
        provider: this.name,
        error: errorMessage,
      };
    }
  }

  async checkBalance(): Promise<SmsBalanceResult> {
    const { baseUrl, apiId, apiPassword } = this.getCredentials();

    if (!this.isConfigured()) {
      return {
        success: true,
        provider: this.name,
        balance: 0,
        currency: 'USD',
        raw: { simulated: true },
      };
    }

    try {
      const response = await fetch(`${baseUrl}/api/CheckBalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ api_id: apiId, api_password: apiPassword }),
      });

      const data = (await response.json()) as any;
      const balance = Number(data?.BalanceAmount ?? data?.balance ?? 0);
      const currency = String(data?.CurrenceCode || data?.currency || 'USD');

      return {
        success: response.ok,
        provider: this.name,
        balance,
        currency,
        raw: data,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || String(err),
      };
    }
  }

  async getDeliveryStatus(messageId: string, uid?: string): Promise<SmsDeliveryStatusResult> {
    const { baseUrl, apiId, apiPassword } = this.getCredentials();

    if (!this.isConfigured()) {
      return {
        success: true,
        provider: this.name,
        messageId,
        status: 'Delivered',
        remarks: 'Statut simulé (Dream Digital non configuré)',
      };
    }

    try {
      const response = await fetch(`${baseUrl}/api/GetDeliveryStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          api_id: apiId,
          api_password: apiPassword,
          message_id: messageId ? Number(messageId) || messageId : undefined,
          uid: uid || undefined,
        }),
      });

      const data = (await response.json()) as any;
      return {
        success: response.ok,
        provider: this.name,
        messageId: String(data?.message_id || messageId),
        status: data?.DLRStatus || data?.status || 'Unknown',
        sentDateUTC: data?.SentDateUTC,
        remarks: data?.Remarks || data?.remarks,
        raw: data,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || String(err),
      };
    }
  }
}
