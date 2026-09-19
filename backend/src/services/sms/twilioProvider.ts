import { formatPhoneE164 } from '../../utils/phone.ts';
import { getSmsGatewayCredentials } from './smsConfig.ts';
import type {
  SmsBalanceResult,
  SmsDeliveryStatusResult,
  SmsProvider,
  SmsSendOptions,
  SmsSendResult,
} from './types.ts';

/**
 * Passerelle SMS Twilio (fournisseur alternatif).
 */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';
  readonly label = 'Twilio SMS';

  private getCredentials() {
    const creds = getSmsGatewayCredentials();
    const accountSid = (creds.twilioSid || '').trim();
    const authToken = (creds.twilioAuthToken || '').trim();
    const fromNumber = (creds.twilioPhone || '').trim();
    return { accountSid, authToken, fromNumber };
  }

  isConfigured(): boolean {
    const { accountSid, authToken, fromNumber } = this.getCredentials();
    return Boolean(accountSid && authToken && fromNumber);
  }

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    const { accountSid, authToken, fromNumber } = this.getCredentials();
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const target = formatPhoneE164(recipients[0] || '');

    if (!target) {
      return {
        success: false,
        simulated: false,
        provider: this.name,
        error: 'Numéro de destinataire manquant ou invalide.',
      };
    }

    const from = options.senderId?.trim() || fromNumber;

    if (!this.isConfigured()) {
      console.log(`[Simulation] Twilio SMS vers ${target} (from: ${from}):\n${options.text}\n`);
      return {
        success: true,
        simulated: true,
        provider: this.name,
        messageId: `sim-twilio-${Date.now()}`,
        remarks: 'Message simulé avec succès (Twilio non configuré)',
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const form = new URLSearchParams();
      form.append('To', target);
      form.append('From', from);
      form.append('Body', options.text);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      const data = (await response.json()) as any;
      if (response.ok && data?.sid) {
        return {
          success: true,
          simulated: false,
          provider: this.name,
          messageId: String(data.sid),
          remarks: data.status,
          raw: data,
        };
      }

      return {
        success: false,
        simulated: false,
        provider: this.name,
        error: data?.message || `Erreur Twilio (${response.status})`,
        raw: data,
      };
    } catch (err: any) {
      return {
        success: false,
        simulated: false,
        provider: this.name,
        error: err.message || String(err),
      };
    }
  }

  async checkBalance(): Promise<SmsBalanceResult> {
    return {
      success: true,
      provider: this.name,
      balance: 0,
      currency: 'USD',
      raw: { note: 'Twilio balance query via API requires subaccount usage API' },
    };
  }

  async getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatusResult> {
    const { accountSid, authToken } = this.getCredentials();
    if (!this.isConfigured()) {
      return {
        success: true,
        provider: this.name,
        messageId,
        status: 'delivered',
        remarks: 'Simulé',
      };
    }
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageId}.json`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      });
      const data = (await response.json()) as any;
      return {
        success: response.ok,
        provider: this.name,
        messageId,
        status: data?.status || 'unknown',
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
