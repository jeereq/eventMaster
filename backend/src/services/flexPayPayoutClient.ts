/**
 * Client FlexPay Payout (décaissement Mobile Money) — documentation « FlexPaie Payout » v1.03.
 *
 * - POST {auth}               { username, password }              → { code, token, expire_in }
 * - POST {pay}                { merchant, type, reference, amount, currency, customer,
 *                               description, callback_url }       → { code, status, message, orderNumber }
 * - GET  {check}/{orderNumber}                                    → { code, reference, orderNumber, status, … }
 * - GET  {balance}/{merchant}                                     → { code, balances: [{ currency, amount }] }
 *
 * Ce module n'accède pas à la base : il est testable avec un `fetch` simulé.
 * Les identifiants et URL viennent uniquement des variables d'environnement.
 */

export type FlexPayPayoutCurrency = 'CDF' | 'USD';

export type FlexPayPayoutConfig = {
  username: string;
  password: string;
  merchant: string;
  authUrl: string;
  payUrl: string;
  checkUrlBase: string;
  balanceUrlBase: string;
  timeoutMs: number;
};

export type FlexPayPayoutRequest = {
  reference: string;
  amount: number;
  currency?: FlexPayPayoutCurrency;
  /** Numéro Mobile Money du bénéficiaire, format 243XXXXXXXXX. */
  customer: string;
  description: string;
  callbackUrl: string;
};

export type FlexPayPayoutSendResult = {
  orderNumber: string;
  statusCode: string;
  message: string;
  raw: Record<string, unknown>;
};

export type FlexPayPayoutCheckStatus = 'success' | 'failed' | 'pending';

export type FlexPayPayoutCheckResult = {
  /** FlexPay connaît la transaction et elle correspond bien à notre référence. */
  found: boolean;
  status: FlexPayPayoutCheckStatus;
  reference: string | null;
  orderNumber: string | null;
  providerReference: string | null;
  message: string | null;
  raw: Record<string, unknown>;
};

export type FlexPayPayoutBalance = { currency: string; amount: number };

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Erreur Payout. `definitive` = FlexPay a répondu et refusé : aucun argent n'est parti,
 * le versement peut être marqué échoué. Sinon (réseau, délai, réponse illisible) on ne sait
 * pas si FlexPay a reçu la demande : le versement doit rester en attente.
 */
export class FlexPayPayoutError extends Error {
  readonly definitive: boolean;
  readonly statusCode: string | null;

  constructor(message: string, opts: { definitive: boolean; statusCode?: string | null }) {
    super(message);
    this.name = 'FlexPayPayoutError';
    this.definitive = opts.definitive;
    this.statusCode = opts.statusCode ?? null;
  }
}

const PAYOUT_STATUS_MESSAGES: Record<string, string> = {
  '1': 'Une transaction FlexPay est déjà en attente. Réessayez dans 30 secondes.',
  '2': 'Solde FlexPay insuffisant pour ce versement.',
  '3': 'Numéro du bénéficiaire non pris en charge par FlexPay.',
  '4': 'Authentification FlexPay refusée (token).',
  '5': 'FlexPay a refusé le versement.',
};

/** Code statut de la réponse pay : « 0XX0 » (doc) ou « OXX0 » (exemple de la doc). */
export function payoutStatusDigit(status: unknown): string | null {
  const s = String(status ?? '').trim().toUpperCase();
  const m = /^[0O]XX(\d)$/.exec(s);
  return m ? m[1] : null;
}

export function describePayoutStatus(status: unknown, fallback?: string): string {
  const digit = payoutStatusDigit(status);
  if (digit && PAYOUT_STATUS_MESSAGES[digit]) return PAYOUT_STATUS_MESSAGES[digit];
  return fallback?.trim() || 'FlexPay a refusé le versement.';
}

function trimSlash(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getFlexPayPayoutConfig(
  env: Record<string, string | undefined> = process.env,
): FlexPayPayoutConfig {
  const read = (key: string) => (env[key] || '').trim();
  const base = trimSlash(read('FLEXPAY_PAYOUT_BASE_URL'));
  const fromBase = (path: string) => (base ? `${base}${path}` : '');
  const timeout = Number(read('FLEXPAY_PAYOUT_TIMEOUT_MS'));

  return {
    username: read('FLEXPAY_PAYOUT_USERNAME'),
    password: read('FLEXPAY_PAYOUT_PASSWORD'),
    merchant: read('FLEXPAY_PAYOUT_MERCHANT'),
    authUrl: read('FLEXPAY_PAYOUT_AUTH_URL') || fromBase('/api/v1/auth/authenticate'),
    payUrl: read('FLEXPAY_PAYOUT_PAY_URL') || fromBase('/api/rest/v1/pay'),
    checkUrlBase: trimSlash(read('FLEXPAY_PAYOUT_CHECK_URL') || fromBase('/api/rest/v1/check')),
    balanceUrlBase: trimSlash(read('FLEXPAY_PAYOUT_BALANCE_URL') || fromBase('/api/rest/v1/balance')),
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 30_000,
  };
}

export function isFlexPayPayoutConfigured(cfg: FlexPayPayoutConfig = getFlexPayPayoutConfig()): boolean {
  return Boolean(
    cfg.username && cfg.password && cfg.merchant && cfg.authUrl && cfg.payUrl && cfg.checkUrlBase,
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function bearer(token: string): string {
  const t = token.trim();
  return /^Bearer\s/i.test(t) ? t : `Bearer ${t}`;
}

/**
 * Interprète la réponse « Check transaction ». On ne retient le statut que si FlexPay renvoie
 * la même transaction que celle enregistrée chez nous (orderNumber et, si présente, référence).
 */
export function interpretPayoutCheck(
  rawInput: unknown,
  expected: { orderNumber: string; reference?: string | null },
): FlexPayPayoutCheckResult {
  const raw = asRecord(rawInput);
  const tx = Object.keys(asRecord(raw.transaction)).length ? asRecord(raw.transaction) : raw;
  const orderNumber = str(tx.orderNumber ?? tx.order_number) || null;
  const reference = str(tx.reference) || null;
  const providerReference = str(tx.providerReference ?? tx.provider_reference) || null;
  const message = str(tx.message ?? raw.message) || null;

  const notFound: FlexPayPayoutCheckResult = {
    found: false,
    status: 'pending',
    reference,
    orderNumber,
    providerReference,
    message,
    raw,
  };

  if (!orderNumber || orderNumber !== expected.orderNumber) return notFound;
  if (expected.reference && reference && reference !== expected.reference) return notFound;

  const code = str(raw.code);
  const status = str(tx.status);
  let result: FlexPayPayoutCheckStatus = 'pending';
  if (status === '0' && (code === '' || code === '0')) result = 'success';
  else if (status === '1') result = 'failed';

  return { found: true, status: result, reference, orderNumber, providerReference, message, raw };
}

export function createFlexPayPayoutClient(
  cfg: FlexPayPayoutConfig,
  deps: { fetch?: FetchLike; now?: () => number } = {},
) {
  const doFetch: FetchLike = deps.fetch ?? ((url, init) => fetch(url, init));
  const now = deps.now ?? (() => Date.now());
  let cached: { token: string; expiresAt: number } | null = null;

  function assertConfigured() {
    if (!isFlexPayPayoutConfigured(cfg)) {
      throw new FlexPayPayoutError(
        'FlexPay Payout non configuré (FLEXPAY_PAYOUT_USERNAME / PASSWORD / MERCHANT / BASE_URL).',
        { definitive: true },
      );
    }
  }

  async function call(
    url: string,
    init: RequestInit,
  ): Promise<{ httpStatus: number; body: Record<string, unknown> }> {
    let res: Response;
    try {
      res = await doFetch(url, { ...init, signal: AbortSignal.timeout(cfg.timeoutMs) });
    } catch (err) {
      throw new FlexPayPayoutError(
        `FlexPay Payout injoignable (${err instanceof Error ? err.message : 'erreur réseau'}).`,
        { definitive: false },
      );
    }
    const text = await res.text().catch(() => '');
    let body: Record<string, unknown> = {};
    try {
      body = asRecord(JSON.parse(text));
    } catch {
      body = {};
    }
    return { httpStatus: res.status, body };
  }

  async function authenticate(force = false): Promise<string> {
    assertConfigured();
    if (!force && cached && cached.expiresAt > now()) return cached.token;

    const { httpStatus, body } = await call(cfg.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: cfg.username, password: cfg.password }),
    });
    const token = str(body.token);
    if (str(body.code) !== '0' || !token) {
      cached = null;
      throw new FlexPayPayoutError(
        str(body.message) || `Authentification FlexPay Payout refusée (HTTP ${httpStatus}).`,
        { definitive: true },
      );
    }
    const expireIn = Number(body.expire_in);
    // Marge d'une minute (ou 10 %) pour ne jamais envoyer un token sur le point d'expirer.
    const ttlMs = Number.isFinite(expireIn) && expireIn > 0 ? expireIn * 1000 : 5 * 60_000;
    const margin = Math.min(60_000, ttlMs * 0.1);
    cached = { token: bearer(token), expiresAt: now() + ttlMs - margin };
    return cached.token;
  }

  async function sendMobileMoney(input: FlexPayPayoutRequest): Promise<FlexPayPayoutSendResult> {
    assertConfigured();
    const reference = input.reference.trim();
    if (!reference || reference.length > 25) {
      throw new FlexPayPayoutError('Référence de versement invalide.', { definitive: true });
    }
    const currency = input.currency || 'CDF';
    const amount =
      currency === 'USD'
        ? (Math.round(input.amount * 100) / 100).toFixed(2)
        : String(Math.round(input.amount));
    if (!(Number(amount) > 0)) {
      throw new FlexPayPayoutError('Montant de versement invalide.', { definitive: true });
    }

    const payload = JSON.stringify({
      merchant: cfg.merchant,
      type: '1',
      reference,
      amount,
      currency,
      customer: input.customer,
      description: input.description.slice(0, 200),
      callback_url: input.callbackUrl,
    });

    const attempt = async (token: string) =>
      call(cfg.payUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
        },
        body: payload,
      });

    let { httpStatus, body } = await attempt(await authenticate());
    // Token refusé (0XX4 / 401) : rien n'a été créé chez FlexPay, on renouvelle une seule fois.
    if (payoutStatusDigit(body.status) === '4' || httpStatus === 401) {
      ({ httpStatus, body } = await attempt(await authenticate(true)));
    }

    const code = str(body.code);
    const statusCode = str(body.status);
    const orderNumber = str(body.orderNumber ?? body.order_number);
    if (code === '0' && orderNumber) {
      return { orderNumber, statusCode, message: str(body.message), raw: body };
    }
    if (code === '0' && !orderNumber) {
      // Acceptée mais sans numéro : impossible à vérifier, on ne conclut pas à un échec.
      throw new FlexPayPayoutError('Réponse FlexPay Payout sans orderNumber.', { definitive: false });
    }
    if (code === '' && httpStatus >= 500) {
      throw new FlexPayPayoutError(`FlexPay Payout indisponible (HTTP ${httpStatus}).`, {
        definitive: false,
      });
    }
    throw new FlexPayPayoutError(describePayoutStatus(statusCode, str(body.message)), {
      definitive: true,
      statusCode: statusCode || null,
    });
  }

  async function checkTransaction(
    orderNumber: string,
    reference?: string | null,
  ): Promise<FlexPayPayoutCheckResult> {
    const token = await authenticate();
    const url = `${cfg.checkUrlBase}/${encodeURIComponent(orderNumber)}`;
    let { httpStatus, body } = await call(url, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: token },
    });
    if (httpStatus === 401) {
      ({ body } = await call(url, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: await authenticate(true) },
      }));
    }
    return interpretPayoutCheck(body, { orderNumber, reference });
  }

  async function checkBalance(): Promise<FlexPayPayoutBalance[]> {
    const token = await authenticate();
    if (!cfg.balanceUrlBase) {
      throw new FlexPayPayoutError('URL du solde FlexPay non configurée.', { definitive: true });
    }
    const { httpStatus, body } = await call(
      `${cfg.balanceUrlBase}/${encodeURIComponent(cfg.merchant)}`,
      { method: 'GET', headers: { Accept: 'application/json', Authorization: token } },
    );
    if (str(body.code) !== '0' || !Array.isArray(body.balances)) {
      throw new FlexPayPayoutError(
        str(body.message) || `Solde FlexPay indisponible (HTTP ${httpStatus}).`,
        { definitive: true },
      );
    }
    return (body.balances as unknown[])
      .map(asRecord)
      .map((b) => ({ currency: str(b.currency).toUpperCase(), amount: Number(b.amount) }))
      .filter((b) => b.currency && Number.isFinite(b.amount));
  }

  return { authenticate, sendMobileMoney, checkTransaction, checkBalance };
}

export type FlexPayPayoutClient = ReturnType<typeof createFlexPayPayoutClient>;

let sharedClient: FlexPayPayoutClient | null = null;
let sharedKey = '';

/** Client partagé (token mis en cache) ; recréé si la configuration change. */
export function getFlexPayPayoutClient(): FlexPayPayoutClient {
  const cfg = getFlexPayPayoutConfig();
  const key = JSON.stringify(cfg);
  if (!sharedClient || key !== sharedKey) {
    sharedClient = createFlexPayPayoutClient(cfg);
    sharedKey = key;
  }
  return sharedClient;
}
