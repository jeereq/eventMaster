import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneForAsmsc, detectAsmscEncoding, DreamDigitalSmsProvider } from './dreamDigitalProvider.ts';
import { smsRegistry, registerSmsProvider, getSmsProvider, getActiveSmsProvider } from './smsProviderRegistry.ts';
import { sendRealSms } from './smsService.ts';
import { getSmsGatewayCredentials, setSmsRuntimeCredentials } from './smsConfig.ts';
import {
  clampInvitationChannel,
  resolveDeliveryChannels,
} from '../../utils/notificationChannels.ts';
import { resetOutboundClaims } from '../notificationDedup.ts';
import type { SmsProvider, SmsSendOptions, SmsSendResult } from './types.ts';

beforeEach(() => {
  setSmsRuntimeCredentials(null);
});

afterEach(() => {
  setSmsRuntimeCredentials(null);
});

describe('Dream Digital aSMSC SMS formatting & encoding', () => {
  it('supprime le signe + et formate le numéro au format pays+numéro', () => {
    assert.equal(formatPhoneForAsmsc('+243812345678'), '243812345678');
    assert.equal(formatPhoneForAsmsc('0812345678'), '243812345678');
    assert.equal(formatPhoneForAsmsc('+33612345678'), '33612345678');
    assert.equal(formatPhoneForAsmsc('00243812345678'), '243812345678');
    assert.equal(formatPhoneForAsmsc('abc1234567'), '');
    assert.equal(formatPhoneForAsmsc('+1234567890123456'), '');
  });

  it('détecte l encodage T pour GSM-7 et U pour les caractères hors GSM-7', () => {
    assert.equal(detectAsmscEncoding('EventMaster: Votre code OTP est 123456.'), 'T');
    assert.equal(detectAsmscEncoding('Bienvenue à la réception de mariage !'), 'T');
    assert.equal(detectAsmscEncoding('Prix: 10€'), 'T');
    assert.equal(detectAsmscEncoding('Caractère ` non GSM'), 'U');
    assert.equal(detectAsmscEncoding('Rendez-vous ici ✨ 🎉'), 'U');
  });
});

describe('Dream Digital aSMSC Provider (Simulation & API payload)', () => {
  it('ignore les anciennes variables d environnement Dream Digital', () => {
    const previous = {
      baseUrl: process.env.DREAM_DIGITAL_BASE_URL,
      apiId: process.env.DREAM_DIGITAL_API_ID,
      apiPassword: process.env.DREAM_DIGITAL_API_PASSWORD,
      senderId: process.env.DREAM_DIGITAL_SENDER_ID,
    };
    process.env.DREAM_DIGITAL_BASE_URL = 'https://env.example';
    process.env.DREAM_DIGITAL_API_ID = 'env-id';
    process.env.DREAM_DIGITAL_API_PASSWORD = 'env-password';
    process.env.DREAM_DIGITAL_SENDER_ID = 'ENV';

    try {
      const credentials = getSmsGatewayCredentials();
      assert.equal(credentials.dreamDigitalBaseUrl, '');
      assert.equal(credentials.dreamDigitalApiId, '');
      assert.equal(credentials.dreamDigitalApiPassword, '');
      assert.equal(credentials.dreamDigitalSenderId, '');
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        const envKey = {
          baseUrl: 'DREAM_DIGITAL_BASE_URL',
          apiId: 'DREAM_DIGITAL_API_ID',
          apiPassword: 'DREAM_DIGITAL_API_PASSWORD',
          senderId: 'DREAM_DIGITAL_SENDER_ID',
        }[key]!;
        if (value === undefined) delete process.env[envKey];
        else process.env[envKey] = value;
      }
    }
  });

  it('retombe en simulation avec succès lorsque les identifiants ne sont pas définis', async () => {
    const provider = new DreamDigitalSmsProvider();
    const result = await provider.sendSms({
      to: '+243812345678',
      text: 'Test message EventMaster',
    });

    assert.equal(result.success, true);
    assert.equal(result.simulated, true);
    assert.equal(result.provider, 'dream-digital');
    assert.ok(result.messageId?.startsWith('sim-dd-'));
  });

  it('gère l envoi multi-numéros en mode simulation', async () => {
    const provider = new DreamDigitalSmsProvider();
    const result = await provider.sendSms({
      to: ['+243812345678', '+243999999999'],
      text: 'Test multi',
    });

    assert.equal(result.success, true);
    assert.equal(result.simulated, true);
  });

  it('refuse une configuration incomplète en production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    setSmsRuntimeCredentials({
      dreamDigitalBaseUrl: 'https://sms.example',
      dreamDigitalApiId: 'audit-id',
      dreamDigitalApiPassword: 'audit-password',
      dreamDigitalSenderId: '',
    });

    try {
      const result = await new DreamDigitalSmsProvider().sendSms({
        to: '+243812345678',
        text: 'Test',
      });
      assert.equal(result.success, false);
      assert.equal(result.simulated, false);
      assert.match(result.error || '', /Super Admin/);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('appelle GET /api/SendSms avec les sept paramètres encodés', async () => {
    setSmsRuntimeCredentials({
      dreamDigitalBaseUrl: 'https://sms.example/',
      dreamDigitalApiId: 'audit-id',
      dreamDigitalApiPassword: 'audit-password',
      dreamDigitalSenderId: 'EVENT MASTER',
    });
    const originalFetch = globalThis.fetch;
    let capturedUrl: URL | null = null;
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = (async (input, init) => {
      capturedUrl = new URL(String(input));
      capturedInit = init;
      return new Response(JSON.stringify({ status: 'S', message_id: 42, remarks: 'ok' }), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      const result = await new DreamDigitalSmsProvider().sendSms({
        to: ['+243812345678', '+243999999999'],
        text: 'Bienvenue à Kinshasa',
      });

      assert.equal(result.success, true);
      assert.equal(capturedUrl?.origin, 'https://sms.example');
      assert.equal(capturedUrl?.pathname, '/api/SendSms');
      assert.equal(capturedInit?.method, 'GET');
      assert.equal(capturedInit?.body, undefined);
      assert.deepEqual(
        Array.from(capturedUrl!.searchParams.keys()).sort(),
        ['api_id', 'api_password', 'encoding', 'phonenumber', 'sender_id', 'sms_type', 'textmessage'].sort(),
      );
      assert.equal(capturedUrl?.searchParams.get('api_id'), 'audit-id');
      assert.equal(capturedUrl?.searchParams.get('api_password'), 'audit-password');
      assert.equal(capturedUrl?.searchParams.get('sms_type'), 'T');
      assert.equal(capturedUrl?.searchParams.get('encoding'), 'T');
      assert.equal(capturedUrl?.searchParams.get('sender_id'), 'EVENT MASTER');
      assert.equal(capturedUrl?.searchParams.get('phonenumber'), '243812345678,243999999999');
      assert.equal(capturedUrl?.searchParams.get('textmessage'), 'Bienvenue à Kinshasa');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('ne considère pas un statut applicatif réussi sur une réponse HTTP en erreur', async () => {
    setSmsRuntimeCredentials({
      dreamDigitalBaseUrl: 'https://sms.example',
      dreamDigitalApiId: 'audit-id',
      dreamDigitalApiPassword: 'audit-password',
      dreamDigitalSenderId: 'EVENTMASTER',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ status: 'S', message_id: 42 }), { status: 500 })) as typeof fetch;

    try {
      const result = await new DreamDigitalSmsProvider().sendSms({
        to: '+243812345678',
        text: 'Test',
      });
      assert.equal(result.success, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Extensibilité de la passerelle SMS (Registry & Custom Providers)', () => {
  it('contient par défaut dream-digital, twilio et custom', () => {
    const list = smsRegistry.list();
    const names = list.map((l) => l.name);
    assert.ok(names.includes('dream-digital'));
    assert.ok(names.includes('twilio'));
    assert.ok(names.includes('custom'));
  });

  it('permet d enregistrer dynamiquement une nouvelle passerelle SMS tierce sans bloquer les autres', async () => {
    let mockSent = false;
    const orangeProvider: SmsProvider = {
      name: 'orange-sms',
      label: 'Orange RDC SMS API',
      isConfigured: () => true,
      async sendSms(opts: SmsSendOptions): Promise<SmsSendResult> {
        mockSent = true;
        return {
          success: true,
          simulated: false,
          provider: 'orange-sms',
          messageId: 'orange-msg-999',
          remarks: 'Transmis via Orange',
        };
      },
    };

    registerSmsProvider(orangeProvider);
    const retrieved = getSmsProvider('orange-sms');
    assert.ok(retrieved);
    assert.equal(retrieved?.name, 'orange-sms');

    // Test de l'envoi via la nouvelle passerelle
    const res = await sendRealSms('+243812345678', 'Message via Orange', { provider: 'orange-sms' });
    assert.equal(res.success, true);
    assert.equal(res.provider, 'orange-sms');
    assert.equal(res.messageId, 'orange-msg-999');
    assert.equal(mockSent, true);
  });
});

describe('Résolution des canaux de diffusion (notificationChannels)', () => {
  it('résout correctement les canaux SMS, EMAIL_AND_SMS et ALL_CHANNELS', () => {
    assert.deepEqual(resolveDeliveryChannels('SMS'), ['SMS']);
    assert.deepEqual(resolveDeliveryChannels('EMAIL_AND_SMS'), ['EMAIL', 'SMS']);
    assert.deepEqual(resolveDeliveryChannels('WHATSAPP_AND_SMS'), ['WHATSAPP', 'SMS']);
    assert.deepEqual(resolveDeliveryChannels('ALL_CHANNELS'), ['EMAIL', 'WHATSAPP', 'SMS']);
    assert.deepEqual(resolveDeliveryChannels(['EMAIL', 'SMS']), ['EMAIL', 'SMS']);
  });

  it('ne conserve que les moyens d invitation autorisés par la plateforme', () => {
    assert.equal(clampInvitationChannel('ALL_CHANNELS', ['EMAIL', 'WHATSAPP']), 'EMAIL_AND_WHATSAPP');
    assert.equal(clampInvitationChannel('WHATSAPP_AND_SMS', ['SMS']), 'SMS');
    assert.equal(clampInvitationChannel('EMAIL', ['WHATSAPP', 'SMS']), null);
    assert.equal(clampInvitationChannel('SMS_AND_EMAIL', ['EMAIL', 'SMS']), 'EMAIL_AND_SMS');
  });
});

describe('Déduplication des envois SMS', () => {
  beforeEach(() => {
    resetOutboundClaims();
  });

  it('déduplique un SMS identique envoyé successivement au même destinataire', async () => {
    const to = '+243819998877';
    const text = 'Confirmation de votre table VIP';

    const first = await sendRealSms(to, text);
    assert.equal(first.success, true);
    assert.notEqual(first.provider, 'dedup');

    const second = await sendRealSms(to, text);
    assert.equal(second.success, true);
    assert.equal(second.provider, 'dedup');
    assert.equal(second.messageId, 'deduped-same-channel');
  });
});
