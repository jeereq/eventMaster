import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createFlexPayPayoutClient,
  describePayoutStatus,
  FlexPayPayoutError,
  getFlexPayPayoutConfig,
  interpretPayoutCheck,
  isFlexPayPayoutConfigured,
  payoutStatusDigit,
} from './flexPayPayoutClient.ts';

const ENV = {
  FLEXPAY_PAYOUT_USERNAME: 'user',
  FLEXPAY_PAYOUT_PASSWORD: 'secret',
  FLEXPAY_PAYOUT_MERCHANT: 'EVENTMASTER',
  FLEXPAY_PAYOUT_BASE_URL: 'https://payout.test:8443/',
};

type Call = { url: string; method: string; headers: Record<string, string>; body: any };

function fakeFlexPay(handler: (call: Call, index: number) => { status?: number; body: unknown } | Error) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const call: Call = {
      url,
      method: init?.method || 'GET',
      headers: (init?.headers || {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };
    calls.push(call);
    const out = handler(call, calls.length - 1);
    if (out instanceof Error) throw out;
    return new Response(JSON.stringify(out.body), { status: out.status ?? 200 });
  };
  return { calls, fetchImpl };
}

const AUTH_OK = { body: { code: '0', token: 'Bearer tok-1', expire_in: 3600 } };

describe('configuration FlexPay Payout', () => {
  it('dérive les URL de la doc depuis la base', () => {
    const cfg = getFlexPayPayoutConfig(ENV);
    assert.equal(cfg.authUrl, 'https://payout.test:8443/api/v1/auth/authenticate');
    assert.equal(cfg.payUrl, 'https://payout.test:8443/api/rest/v1/pay');
    assert.equal(cfg.checkUrlBase, 'https://payout.test:8443/api/rest/v1/check');
    assert.equal(cfg.balanceUrlBase, 'https://payout.test:8443/api/rest/v1/balance');
    assert.equal(isFlexPayPayoutConfigured(cfg), true);
  });

  it('accepte une URL pay explicite et refuse une config incomplète', () => {
    const cfg = getFlexPayPayoutConfig({ ...ENV, FLEXPAY_PAYOUT_PAY_URL: 'https://x.test/v2/pay' });
    assert.equal(cfg.payUrl, 'https://x.test/v2/pay');
    assert.equal(isFlexPayPayoutConfigured(getFlexPayPayoutConfig({ ...ENV, FLEXPAY_PAYOUT_PASSWORD: '' })), false);
    assert.equal(isFlexPayPayoutConfigured(getFlexPayPayoutConfig({})), false);
  });
});

describe('codes statut Payout', () => {
  it('lit 0XX0 et la variante OXX0 de la doc', () => {
    assert.equal(payoutStatusDigit('0XX2'), '2');
    assert.equal(payoutStatusDigit('OXX0'), '0');
    assert.equal(payoutStatusDigit('weird'), null);
    assert.match(describePayoutStatus('0XX2'), /Solde FlexPay insuffisant/);
    assert.match(describePayoutStatus('0XX3'), /bénéficiaire/);
  });
});

describe('envoi Payout', () => {
  it("s'authentifie, envoie le corps de la doc et réutilise le token", async () => {
    const { calls, fetchImpl } = fakeFlexPay((call) => {
      if (call.url.endsWith('/auth/authenticate')) return AUTH_OK;
      return { body: { code: '0', status: '0XX0', message: 'Success', orderNumber: `ORD${calls.length}` } };
    });
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl });
    const req = {
      reference: 'evpabc',
      amount: 15000.4,
      customer: '243815877848',
      description: 'Reversement',
      callbackUrl: 'https://api.test/cb',
    };
    const first = await client.sendMobileMoney(req);
    await client.sendMobileMoney({ ...req, reference: 'evpdef' });

    assert.equal(calls.filter((c) => c.url.endsWith('/auth/authenticate')).length, 1);
    assert.deepEqual(calls[0].body, { username: 'user', password: 'secret' });
    const pay = calls[1];
    assert.equal(pay.url, 'https://payout.test:8443/api/rest/v1/pay');
    assert.equal(pay.headers.Authorization, 'Bearer tok-1');
    assert.deepEqual(pay.body, {
      merchant: 'EVENTMASTER',
      type: '1',
      reference: 'evpabc',
      amount: '15000',
      currency: 'CDF',
      customer: '243815877848',
      description: 'Reversement',
      callback_url: 'https://api.test/cb',
    });
    assert.equal(first.orderNumber, 'ORD2');
  });

  it('renouvelle le token expiré', async () => {
    let clock = 0;
    const { calls, fetchImpl } = fakeFlexPay((call) =>
      call.url.endsWith('/auth/authenticate')
        ? { body: { code: '0', token: 'tok', expire_in: 100 } }
        : { body: { code: '0', status: '0XX0', orderNumber: 'O' } },
    );
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl, now: () => clock });
    await client.authenticate();
    clock = 50_000;
    await client.authenticate();
    clock = 95_000;
    await client.authenticate();
    assert.equal(calls.length, 2);
    assert.equal(await client.authenticate(), 'Bearer tok');
  });

  it('retente une fois sur token refusé (0XX4)', async () => {
    let pays = 0;
    const { calls, fetchImpl } = fakeFlexPay((call) => {
      if (call.url.endsWith('/auth/authenticate')) return AUTH_OK;
      pays += 1;
      return pays === 1
        ? { body: { code: '1', status: '0XX4', message: 'token' } }
        : { body: { code: '0', status: '0XX0', orderNumber: 'OK1' } };
    });
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl });
    const res = await client.sendMobileMoney({
      reference: 'r1', amount: 10, customer: '243815877848', description: 'd', callbackUrl: 'https://c',
    });
    assert.equal(res.orderNumber, 'OK1');
    assert.equal(calls.filter((c) => c.url.endsWith('/auth/authenticate')).length, 2);
  });

  it('un refus FlexPay est définitif (solde insuffisant)', async () => {
    const { fetchImpl } = fakeFlexPay((call) =>
      call.url.endsWith('/auth/authenticate') ? AUTH_OK : { body: { code: '1', status: '0XX2', message: 'x' } },
    );
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl });
    await assert.rejects(
      client.sendMobileMoney({ reference: 'r', amount: 10, customer: '243815877848', description: 'd', callbackUrl: 'https://c' }),
      (err: unknown) =>
        err instanceof FlexPayPayoutError && err.definitive && /insuffisant/.test(err.message),
    );
  });

  it("une coupure réseau pendant l'envoi n'est pas un échec définitif", async () => {
    const { fetchImpl } = fakeFlexPay((call) =>
      call.url.endsWith('/auth/authenticate') ? AUTH_OK : new Error('socket hang up'),
    );
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl });
    await assert.rejects(
      client.sendMobileMoney({ reference: 'r', amount: 10, customer: '243815877848', description: 'd', callbackUrl: 'https://c' }),
      (err: unknown) => err instanceof FlexPayPayoutError && !err.definitive,
    );
  });

  it('refuse une référence de plus de 25 caractères sans appeler FlexPay', async () => {
    const { calls, fetchImpl } = fakeFlexPay(() => AUTH_OK);
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl });
    await assert.rejects(
      client.sendMobileMoney({ reference: 'x'.repeat(26), amount: 10, customer: '243815877848', description: 'd', callbackUrl: 'https://c' }),
    );
    assert.equal(calls.length, 0);
  });
});

describe('vérification Payout', () => {
  const expected = { orderNumber: 'LeR4frf045091721', reference: 'MM0000XXFFR159' };
  const docSuccess = {
    code: '0',
    reference: 'MM0000XXFFR159',
    orderNumber: 'LeR4frf045091721',
    providerReference: 'BCQ036TEDGE',
    message: 'Success',
    status: '0',
    created_at: '20/03/2024 17:30:45',
  };

  it("reconnaît le succès de l'exemple de la doc", () => {
    const r = interpretPayoutCheck(docSuccess, expected);
    assert.equal(r.found, true);
    assert.equal(r.status, 'success');
    assert.equal(r.providerReference, 'BCQ036TEDGE');
  });

  it('reconnaît un échec', () => {
    assert.equal(interpretPayoutCheck({ ...docSuccess, code: '1', status: '1' }, expected).status, 'failed');
  });

  it('transaction non trouvée : rien de conclu', () => {
    const r = interpretPayoutCheck({ code: '1', message: 'Erreur. Transaction non trouvée' }, expected);
    assert.equal(r.found, false);
    assert.equal(r.status, 'pending');
  });

  it("ignore une réponse portant un autre numéro ou une autre référence", () => {
    assert.equal(interpretPayoutCheck({ ...docSuccess, orderNumber: 'AUTRE' }, expected).found, false);
    assert.equal(interpretPayoutCheck({ ...docSuccess, reference: 'AUTRE' }, expected).found, false);
  });

  it('appelle GET {check}/{orderNumber} avec le token', async () => {
    const { calls, fetchImpl } = fakeFlexPay((call) =>
      call.url.endsWith('/auth/authenticate') ? AUTH_OK : { body: docSuccess },
    );
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl });
    const r = await client.checkTransaction(expected.orderNumber, expected.reference);
    assert.equal(r.status, 'success');
    assert.equal(calls[1].url, 'https://payout.test:8443/api/rest/v1/check/LeR4frf045091721');
    assert.equal(calls[1].method, 'GET');
    assert.equal(calls[1].headers.Authorization, 'Bearer tok-1');
  });

  it('lit le solde du marchand', async () => {
    const { calls, fetchImpl } = fakeFlexPay((call) =>
      call.url.endsWith('/auth/authenticate')
        ? AUTH_OK
        : { body: { code: '0', balances: [{ currency: 'USD', amount: '10' }, { currency: 'CDF', amount: '5000' }] } },
    );
    const client = createFlexPayPayoutClient(getFlexPayPayoutConfig(ENV), { fetch: fetchImpl });
    assert.deepEqual(await client.checkBalance(), [
      { currency: 'USD', amount: 10 },
      { currency: 'CDF', amount: 5000 },
    ]);
    assert.equal(calls[1].url, 'https://payout.test:8443/api/rest/v1/balance/EVENTMASTER');
  });
});
