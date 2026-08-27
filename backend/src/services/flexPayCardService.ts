import {
  loadPlatformSettings,
  type TicketPaymentProvider,
} from './platformSettingsService';

export type FlexPayCurrency = 'CDF' | 'USD';
export type FlexPayMethod = 'card' | 'mobile';

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

export type FlexPayMobilePayRequest = {
  reference: string;
  amount: number;
  currency?: FlexPayCurrency;
  phone: string;
  callbackUrl: string;
};

export type FlexPayCheckStatus = 'success' | 'failed' | 'pending' | 'unknown';

export type FlexPayPayResult = {
  orderNumber: string;
  redirectUrl: string | null;
  raw: Record<string, unknown>;
};

export type FlexPayCheckResult = {
  found: boolean;
  status: FlexPayCheckStatus;
  reference: string | null;
  orderNumber: string | null;
  amount: number | null;
  amountCustomer: number | null;
  currency: string | null;
  channel: string | null;
  providerReference: string | null;
  raw: Record<string, unknown>;
};

export type FlexPayCallbackParsed = {
  reference: string;
  orderNumber: string;
  success: boolean;
  statusRaw: string;
  channel: string | null;
  amountCustomer: number | null;
  providerReference: string | null;
  raw: Record<string, unknown>;
};

/** Données Prisma à merger pour TicketOrder / SubscriptionRequest. */
export type FlexPayMetadataUpdate = {
  flexPayChannel?: string;
  flexPayAmountCustomer?: number;
  flexPayProviderReference?: string;
};

function parseOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeFlexPayChannel(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw || null;
}

function extractProviderReference(src: Record<string, unknown>): string | null {
  const v =
    src.provider_reference ??
    src.providerReference ??
    src.ProviderReference ??
    src.providerRef;
  const s = String(v ?? '').trim();
  return s || null;
}

/** Mappe les codes status check FlexPay (doc API Paiement v1.5). */
export function mapFlexPayTransactionStatus(statusCode: string): FlexPayCheckStatus {
  switch (String(statusCode ?? '').trim()) {
    case '0':
      return 'success';
    case '1':
    case '4':
    case '5':
      return 'failed';
    case '2':
    case '3':
      return 'pending';
    default:
      return 'unknown';
  }
}

export function buildFlexPayMetadataUpdate(
  source: {
    channel?: string | null;
    amountCustomer?: number | null;
    providerReference?: string | null;
  },
): FlexPayMetadataUpdate {
  const data: FlexPayMetadataUpdate = {};
  if (source.channel) data.flexPayChannel = source.channel;
  if (source.amountCustomer != null && Number.isFinite(source.amountCustomer)) {
    data.flexPayAmountCustomer = source.amountCustomer;
  }
  if (source.providerReference) data.flexPayProviderReference = source.providerReference;
  return data;
}

function envOrSetting(envKey: string, settingValue?: string): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return (settingValue || '').trim();
}

function authHeader(token: string): string {
  const t = token.trim();
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

/** Normalise un numéro RDC vers 243XXXXXXXXX. */
export function normalizeFlexPayPhone(input: string): string | null {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return null;
  let phone = digits;
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('0') && phone.length === 10) phone = `243${phone.slice(1)}`;
  if (phone.length === 9 && /^[89]/.test(phone)) phone = `243${phone}`;
  if (!phone.startsWith('243') || phone.length < 12 || phone.length > 13) return null;
  return phone;
}

export function getFlexPayCardConfig() {
  const settings = loadPlatformSettings();
  const token = (
    envOrSetting('FLEXPAY_CARD_TOKEN', settings.flexPayCardToken) ||
    envOrSetting('FLEXPAY_TOKEN', '')
  ).trim();
  const merchant = (
    envOrSetting('FLEXPAY_CARD_MERCHANT', settings.flexPayCardMerchant) ||
    envOrSetting('FLEXPAY_MERCHANT', '')
  ).trim();
  const payUrl = envOrSetting('FLEXPAY_CARD_PAY_URL', settings.flexPayCardPayUrl);
  const checkUrlBase = envOrSetting('FLEXPAY_CARD_CHECK_URL', settings.flexPayCardCheckUrl);
  const mobilePayUrl = envOrSetting('FLEXPAY_MOBILE_PAY_URL', settings.flexPayMobilePayUrl);
  const mobileCheckUrl = envOrSetting('FLEXPAY_MOBILE_CHECK_URL', settings.flexPayMobileCheckUrl);
  const payoutUrl = envOrSetting('FLEXPAY_PAYOUT_URL', '');

  return {
    token,
    merchant,
    payUrl: payUrl || 'https://cardpayment.flexpay.cd/v1.1/pay',
    checkUrlBase: checkUrlBase || 'https://cardpayment.flexpay.cd/api/rest/v1/check',
    mobilePayUrl: mobilePayUrl || 'https://backend.flexpay.cd/api/rest/v1/paymentService',
    mobileCheckUrlBase: mobileCheckUrl || 'https://backend.flexpay.cd/api/rest/v1/check',
    payoutUrl: payoutUrl || 'https://backend.flexpay.cd/api/rest/v1/merchantPayOutService',
  };
}

export function isFlexPayCardConfigured(): boolean {
  const { token, merchant } = getFlexPayCardConfig();
  if (!token || !merchant) return false;
  const bare = token.replace(/^Bearer\s+/i, '').trim().toLowerCase();
  return bare.length > 0 && !bare.includes('mock');
}

/** @deprecated Ne plus utiliser pour court-circuiter un paiement — préférer isFlexPayCardConfigured(). */
export function isFlexPayCardMock(): boolean {
  return !isFlexPayCardConfigured();
}

export function assertFlexPayConfigured(): void {
  if (!isFlexPayCardConfigured()) {
    throw new Error('Paiements FlexPay non configurés (token / merchant manquants).');
  }
}

/** Billets : uniquement FlexPay (plus de Stripe). */
export function resolveTicketCheckoutProvider(): TicketPaymentProvider {
  return 'flexpay_card';
}

/**
 * Crée une session de paiement carte FlexPay (Visa / Mastercard).
 * Doc : POST /v1.1/pay (JSON) → { code: "0", orderNumber, url }
 */
export async function createFlexPayCardCheckout(input: FlexPayPayRequest): Promise<FlexPayPayResult> {
  assertFlexPayConfigured();
  const cfg = getFlexPayCardConfig();

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
 * Déclenche un paiement Mobile Money FlexPay (Airtel / Orange / M-Pesa / Afrimoney).
 * Doc : POST …/paymentService → { code: "0", orderNumber, message }
 */
export async function createFlexPayMobileCheckout(
  input: FlexPayMobilePayRequest,
): Promise<FlexPayPayResult> {
  assertFlexPayConfigured();
  const cfg = getFlexPayCardConfig();

  const phone = normalizeFlexPayPhone(input.phone);
  if (!phone) {
    throw new Error('Numéro Mobile Money invalide. Utilisez le format 243XXXXXXXXX.');
  }

  const body = {
    merchant: cfg.merchant,
    type: '1',
    phone,
    reference: input.reference,
    amount: String(Math.max(1, Math.round(input.amount))),
    currency: input.currency || 'CDF',
    callbackUrl: input.callbackUrl,
  };

  const res = await fetch(cfg.mobilePayUrl, {
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
  if (!res.ok || (code !== '0' && code !== '0.0')) {
    throw new Error(
      String(raw.message || `FlexPay Mobile Money a refusé le paiement (HTTP ${res.status}).`),
    );
  }

  const orderNumber = String(raw.orderNumber || raw.order_number || '');
  if (!orderNumber) {
    throw new Error('Réponse FlexPay Mobile Money incomplète (orderNumber manquant).');
  }

  return { orderNumber, redirectUrl: null, raw };
}

/**
 * Décaissement marchand → Mobile Money (Pay Out).
 * Doc API Paiement v1.5 : POST …/merchantPayOutService
 */
export async function createFlexPayMobilePayout(
  input: FlexPayMobilePayRequest,
): Promise<FlexPayPayResult> {
  assertFlexPayConfigured();
  const cfg = getFlexPayCardConfig();

  const phone = normalizeFlexPayPhone(input.phone);
  if (!phone) {
    throw new Error('Numéro Mobile Money invalide. Utilisez le format 243XXXXXXXXX.');
  }

  const body = {
    merchant: cfg.merchant,
    type: '1',
    phone,
    reference: input.reference,
    amount: String(Math.max(1, Math.round(input.amount))),
    currency: input.currency || 'CDF',
    callbackUrl: input.callbackUrl,
  };

  const res = await fetch(cfg.payoutUrl, {
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
  if (!res.ok || (code !== '0' && code !== '0.0')) {
    throw new Error(
      String(raw.message || `FlexPay Pay Out a refusé le versement (HTTP ${res.status}).`),
    );
  }

  const orderNumber = String(raw.orderNumber || raw.order_number || '');
  if (!orderNumber) {
    throw new Error('Réponse FlexPay Pay Out incomplète (orderNumber manquant).');
  }

  return { orderNumber, redirectUrl: null, raw };
}

async function checkOrderAt(
  baseUrl: string,
  token: string,
  orderNumber: string,
): Promise<FlexPayCheckResult> {
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(orderNumber)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: authHeader(token),
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
      channel: null,
      providerReference: null,
      raw,
    };
  }

  const tx = raw.transaction as Record<string, unknown>;
  const statusCode = String(tx.status ?? '');
  return {
    found: true,
    status: mapFlexPayTransactionStatus(statusCode),
    reference: tx.reference != null ? String(tx.reference) : null,
    orderNumber: tx.orderNumber != null ? String(tx.orderNumber) : orderNumber,
    amount: parseOptionalNumber(tx.amount),
    amountCustomer: parseOptionalNumber(tx.amountCustomer),
    currency: tx.currency != null ? String(tx.currency) : null,
    channel: normalizeFlexPayChannel(tx.channel),
    providerReference: extractProviderReference(tx),
    raw,
  };
}

/** Vérifie une transaction FlexPay (essaie check Card puis Mobile). */
export async function checkFlexPayCardOrder(orderNumber: string): Promise<FlexPayCheckResult> {
  const cfg = getFlexPayCardConfig();
  if (!cfg.token) throw new Error('FlexPay non configuré.');

  const card = await checkOrderAt(cfg.checkUrlBase, cfg.token, orderNumber);
  if (card.found) return card;
  return checkOrderAt(cfg.mobileCheckUrlBase, cfg.token, orderNumber);
}

/** Interprète un callback FlexPay (API Paiement v1.5 + variantes Card). */
export function parseFlexPayCallbackPayload(
  body: Record<string, unknown>,
  query: Record<string, unknown>,
): FlexPayCallbackParsed {
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

  return {
    reference,
    orderNumber,
    success,
    statusRaw,
    channel: normalizeFlexPayChannel(src.channel),
    amountCustomer: parseOptionalNumber(src.amountCustomer ?? src.amount_customer),
    providerReference: extractProviderReference(src),
    raw: src,
  };
}

export function getPublicApiBaseUrl(): string {
  return (
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    `http://localhost:${process.env.PORT || 5001}`
  )
    .trim()
    .replace(/\/$/, '');
}
