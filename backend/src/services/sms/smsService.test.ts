import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneForAsmsc, detectAsmscEncoding, DreamDigitalSmsProvider } from './dreamDigitalProvider.ts';
import { smsRegistry, registerSmsProvider, getSmsProvider, getActiveSmsProvider } from './smsProviderRegistry.ts';
import { sendRealSms } from './smsService.ts';
import {
  clampInvitationChannel,
  resolveDeliveryChannels,
} from '../../utils/notificationChannels.ts';
import { resetOutboundClaims } from '../notificationDedup.ts';
import type { SmsProvider, SmsSendOptions, SmsSendResult } from './types.ts';

describe('Dream Digital aSMSC SMS formatting & encoding', () => {
  it('supprime le signe + et formate le numéro au format pays+numéro', () => {
    assert.equal(formatPhoneForAsmsc('+243812345678'), '243812345678');
    assert.equal(formatPhoneForAsmsc('0812345678'), '243812345678');
    assert.equal(formatPhoneForAsmsc('+33612345678'), '33612345678');
    assert.equal(formatPhoneForAsmsc('00243812345678'), '243812345678');
  });

  it('détecte l encodage T pour du texte GSM standard et U pour de l Unicode / accents', () => {
    assert.equal(detectAsmscEncoding('EventMaster: Votre code OTP est 123456.'), 'T');
    assert.equal(detectAsmscEncoding('Bienvenue à la réception de mariage !'), 'U'); // contient 'à' et 'é'
    assert.equal(detectAsmscEncoding('Rendez-vous ici ✨ 🎉'), 'U'); // contient des emojis
  });
});

describe('Dream Digital aSMSC Provider (Simulation & API payload)', () => {
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
