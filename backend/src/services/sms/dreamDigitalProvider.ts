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

/**
 * Normalise un numéro pour aSMSC (Dream Digital) :
 * L'API aSMSC impose un format indicatif pays + numéro sans le préfixe '+' (ex: 243812345678).
 */
export function formatPhoneForAsmsc(raw: string): string {
  const e164 = formatPhoneE164(raw);
  return e164.replace(/[^\d]/g, '');
}

/**
 * Détermine l'encodage selon le contenu :
 * - 'T' : texte GSM-7 / ASCII standard (160 car./SMS)
 * - 'U' : Unicode pour caractères spéciaux, accents ou emojis (70 car./SMS)
 */
export function detectAsmscEncoding(text: string): SmsEncoding {
  // Détecte si des caractères dépassent l'ASCII imprimable basique
  const isPlainGsm = /^[\x20-\x7E\r\n]*$/.test(text);
  return isPlainGsm ? 'T' : 'U';
}

/**
 * Implémentation de la passerelle SMS Dream Digital basée sur la spécification aSMSC v3.0.
 */
export class DreamDigitalSmsProvider implements SmsProvider {
  readonly name = 'dream-digital';
  readonly label = 'Dream Digital (aSMSC v3.0)';

  private getCredentials() {
    const creds = getSmsGatewayCredentials();
    const baseUrl = (creds.dreamDigitalBaseUrl || 'https://sms.dreamdigital.cd').replace(/\/+$/, '');
    const apiId = (creds.dreamDigitalApiId || '').trim();
    const apiPassword = (creds.dreamDigitalApiPassword || '').trim();
    const senderId = (creds.dreamDigitalSenderId || 'EVENTMASTER').trim();
    return { baseUrl, apiId, apiPassword, senderId };
  }

  isConfigured(): boolean {
    const { apiId, apiPassword } = this.getCredentials();
    return Boolean(apiId && apiPassword);
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

    const isMulti = formattedNumbers.length > 1;
    const phoneParam = formattedNumbers.join(',');
    const resolvedSenderId = options.senderId?.trim() || senderId || 'EVENTMASTER';
    const encoding = options.encoding || detectAsmscEncoding(options.text);
    const smsType = options.smsType || 'T';

    // Simulation si identifiants manquants (mode démo / environnement de dev)
    if (!this.isConfigured()) {
      console.log(
        `[Simulation] Dream Digital SMS (aSMSC) vers ${phoneParam} (expéditeur: ${resolvedSenderId}, type: ${smsType}, encodage: ${encoding}):\nMessage: ${options.text}\n`,
      );
      return {
        success: true,
        simulated: true,
        provider: this.name,
        messageId: `sim-dd-${Date.now()}`,
        remarks: 'Message simulé avec succès (Dream Digital non configuré)',
      };
    }

    const endpoint = isMulti ? `${baseUrl}/api/SendSMSMulti` : `${baseUrl}/api/SendSMS`;

    const payload: Record<string, unknown> = {
      api_id: apiId,
      api_password: apiPassword,
      sms_type: smsType,
      encoding,
      sender_id: resolvedSenderId,
      phonenumber: phoneParam,
      templateid: null,
      textmessage: options.text,
      V1: null,
      V2: null,
      V3: null,
      V4: null,
      V5: null,
      ValidityPeriodInSeconds: options.validitySeconds || 172800,
      uid: options.uid || null,
      callback_url: options.callbackUrl || null,
      pe_id: null,
      template_id: null,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
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

      if (isSuccess || (response.ok && data?.message_id)) {
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
      console.error(`[SMS Service] Exception lors de l'appel Dream Digital vers ${phoneParam}:`, error);
      return {
        success: false,
        simulated: false,
        provider: this.name,
        error: error.message || String(error),
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
