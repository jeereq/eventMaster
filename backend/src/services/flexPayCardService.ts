import {
  getTicketPaymentProvider,
  loadPlatformSettings,
  type TicketPaymentProvider,
} from './platformSettingsService';

export type FlexPayCurrency = 'CDF' | 'USD';

export type FlexPayPayRequest = {
  reference: string;
  amount: number;
  currency?: FlexPayCurrency;
  description: string;
  callbackUrl: string;
  approveUrl: string;
  cancelUrl: string;
  declineUrl: string;
  language?: 'fr' | 'en';
};

export type FlexPayPayResult = {
  orderNumber: string;
  redirectUrl: string;
  raw: Record<string, unknown>;
};

export type FlexPayCheckResult = {
  found: boolean;
  status: 'success' | 'failed' | 'unknown';
  reference: string | null;
  orderNumber: string | null;
  amount: number | null;
  amountCustomer: number | null;
  currency: string | null;
  raw: Record<string, unknown>;
};

function envOrSetting(envKey: string, settingValue?: string): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return (settingValue || '').trim();
}

export function getFlexPayCardConfig() {
  const settings = loadPlatformSettings();
  const token = envOrSetting('FLEXPAY_CARD_TOKEN', settings.flexPayCardToken);
  const merchant = envOrSetting('FLEXPAY_CARD_MERCHANT', settings.flexPayCardMerchant);
  const payUrl = envOrSetting('FLEXPAY_CARD_PAY_URL', settings.flexPayCardPayUrl);
  const checkUrlBase = envOrSetting('FLEXPAY_CARD_CHECK_URL', settings.flexPayCardCheckUrl);

  return {
    token,
    merchant,
    payUrl: payUrl || 'https://cardpayment.flexpay.cd/v1.1/pay',
    checkUrlBase: checkUrlBase || 'https://cardpayment.flexpay.cd/api/rest/v1/check',
  };
}

export function isFlexPayCardConfigured(): boolean {
  const { token, merchant } = getFlexPayCardConfig();
  return Boolean(token && merchant && !token.includes('mock'));
}

export function isFlexPayCardMock(): boolean {
  return !isFlexPayCardConfigured();
}

export function resolveTicketCheckoutProvider(): TicketPaymentProvider {
  return getTicketPaymentProvider() === 'flexpay_card' ? 'flexpay_card' : 'stripe';
}

function authHeader(token: string): string {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

/**
 * Crée une session de paiement carte FlexPay et retourne l’URL de redirection.
 * Doc : POST /v1.1/pay (JSON) → { code: "0", orderNumber, url }
 */
export async function createFlexPayCardCheckout(input: FlexPayPayRequest): Promise<FlexPayPayResult> {
  const cfg = getFlexPayCardConfig();
  if (!cfg.token || !cfg.merchant) {
    throw new Error('FlexPay Card non configuré (token / merchant manquants).');
  }

  const body = {
    authorization: authHeader(cfg.token),
    merchant: cfg.merchant,
    reference: input.reference,
    amount: String(Math.max(1, Math.round(input.amount))),
    currency: input.currency || 'CDF',
    language: (input.language || 'fr').toUpperCase(),
    description: input.description.slice(0, 200),
    callback_url: input.callbackUrl,
    approve_url: input.approveUrl,
    cancel_url: input.cancelUrl,
    decline_url: input.declineUrl,
  };

  const res = await fetch(cfg.payUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader(cfg.token),
    },
    body: JSON.stringify(body),
  });

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const code = String(raw.code ?? '');
  if (!res.ok || code !== '0') {
    throw new Error(String(raw.message || `FlexPay a refusé le paiement (HTTP ${res.status}).`));
  }

  const orderNumber = String(raw.orderNumber || '');
  const redirectUrl = String(raw.url || '');
  if (!orderNumber || !redirectUrl) {
    throw new Error('Réponse FlexPay incomplète (orderNumber / url manquants).');
  }

  return { orderNumber, redirectUrl, raw };
}

/**
 * Vérifie une transaction FlexPay Card.
 * Doc : GET …/check/{orderNumber}
 */
export async function checkFlexPayCardOrder(orderNumber: string): Promise<FlexPayCheckResult> {
  const cfg = getFlexPayCardConfig();
  if (!cfg.token) throw new Error('FlexPay Card non configuré.');

  const url = `${cfg.checkUrlBase.replace(/\/$/, '')}/${encodeURIComponent(orderNumber)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: authHeader(cfg.token),
    },
  });

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const code = String(raw.code ?? '');
  if (code !== '0' || !raw.transaction || typeof raw.transaction !== 'object') {
    return {
      found: false,
      status: 'unknown',
      reference: null,
      orderNumber,
      amount: null,
      amountCustomer: null,
      currency: null,
      raw,
    };
  }

  const tx = raw.transaction as Record<string, unknown>;
  const statusCode = String(tx.status ?? '');
  return {
    found: true,
    status: statusCode === '0' ? 'success' : statusCode === '1' ? 'failed' : 'unknown',
    reference: tx.reference != null ? String(tx.reference) : null,
    orderNumber: tx.orderNumber != null ? String(tx.orderNumber) : orderNumber,
    amount: tx.amount != null ? Number(tx.amount) : null,
    amountCustomer: tx.amountCustomer != null ? Number(tx.amountCustomer) : null,
    currency: tx.currency != null ? String(tx.currency) : null,
    raw,
  };
}

/** Interprète un callback FlexPay (payload peu documenté → champs courants). */
export function parseFlexPayCallbackPayload(body: Record<string, unknown>, query: Record<string, unknown>) {
  const src = { ...query, ...body };
  const reference = String(
    src.reference || src.Reference || src.merchantReference || src.merchant_reference || '',
  ).trim();
  const orderNumber = String(src.orderNumber || src.order_number || src.OrderNumber || '').trim();
  const statusRaw = String(src.status || src.Status || src.code || '').trim();
  const success =
    statusRaw === '0' ||
    statusRaw.toLowerCase() === 'success' ||
    statusRaw.toLowerCase() === 'approved' ||
    String(src.transactionStatus || '').toLowerCase() === 'success';

  return { reference, orderNumber, success, statusRaw, raw: src };
}

export function getPublicApiBaseUrl(): string {
  return (
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    `http://localhost:${process.env.PORT || 5001}`
  ).replace(/\/$/, '');
}
