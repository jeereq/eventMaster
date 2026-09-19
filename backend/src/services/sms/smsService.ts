import { getActiveSmsProvider, getSmsProvider, listAvailableSmsProviders } from './smsProviderRegistry.ts';
import { claimSimilarOutbound, outboundChannelFingerprint } from '../notificationDedup.ts';
import type { SmsBalanceResult, SmsDeliveryStatusResult, SmsSendOptions, SmsSendResult } from './types.ts';

export type { SmsSendOptions, SmsSendResult, SmsBalanceResult, SmsDeliveryStatusResult };

/**
 * Envoie un SMS transactionnel via la passerelle SMS active (Dream Digital ou alternative configurée).
 * Gère la déduplication automatique des envois identiques récents et la simulation si non configuré.
 */
export async function sendRealSms(
  to: string | string[],
  text: string,
  options?: Partial<Omit<SmsSendOptions, 'to' | 'text'>> & { provider?: string },
): Promise<SmsSendResult> {
  const target = Array.isArray(to) ? to.join(',') : to;

  // Déduplication sur le canal SMS pour éviter les doubles envois intempestifs
  const fingerprint = outboundChannelFingerprint({
    channel: 'SMS',
    to: target,
    body: text,
  });

  if (!claimSimilarOutbound(fingerprint)) {
    return {
      success: true,
      simulated: false,
      provider: 'dedup',
      messageId: 'deduped-same-channel',
      remarks: 'Message dédupliqué (envoi identique récent)',
    };
  }

  const provider = options?.provider ? getSmsProvider(options.provider) || getActiveSmsProvider() : getActiveSmsProvider();

  return provider.sendSms({
    to,
    text,
    senderId: options?.senderId,
    uid: options?.uid,
    smsType: options?.smsType || 'T',
    encoding: options?.encoding,
    validitySeconds: options?.validitySeconds,
    callbackUrl: options?.callbackUrl,
  });
}

/**
 * Interroge le solde de la passerelle active (ex: Dream Digital aSMSC).
 */
export async function checkActiveSmsBalance(providerName?: string): Promise<SmsBalanceResult> {
  const provider = providerName ? getSmsProvider(providerName) || getActiveSmsProvider() : getActiveSmsProvider();
  if (provider.checkBalance) {
    return provider.checkBalance();
  }
  return {
    success: false,
    provider: provider.name,
    error: `La passerelle '${provider.name}' ne supporte pas l'interrogation de solde via API.`,
  };
}

/**
 * Récupère le statut d'acheminement d'un SMS envoyé.
 */
export async function getSmsDeliveryStatus(
  messageId: string,
  uid?: string,
  providerName?: string,
): Promise<SmsDeliveryStatusResult> {
  const provider = providerName ? getSmsProvider(providerName) || getActiveSmsProvider() : getActiveSmsProvider();
  if (provider.getDeliveryStatus) {
    return provider.getDeliveryStatus(messageId, uid);
  }
  return {
    success: false,
    provider: provider.name,
    messageId,
    error: `La passerelle '${provider.name}' ne supporte pas la vérification du statut via API.`,
  };
}

export { listAvailableSmsProviders };
