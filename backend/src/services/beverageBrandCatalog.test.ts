import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  beverageInvitationOption,
  formatBeverageSale,
  joinBeverageInvitationOptions,
  parseBrandDraft,
  parseVendorPriceOffers,
} from './beverageBrandCatalog.ts';

describe('catalogue de marques de boissons', () => {
  it('formate une option d’invitation sans virgule parasite', () => {
    const label = beverageInvitationOption({ name: 'Moët & Chandon', kind: 'CHAMPAGNE' });
    assert.equal(label, 'Moët & Chandon (Champagne)');
    const joined = joinBeverageInvitationOptions([
      { name: 'Primus', kind: 'BEER' },
      { name: 'Vin rouge', kind: 'WINE' },
    ]);
    assert.equal(joined, 'Primus (Bière), Vin rouge (Vin)');
  });

  it('refuse une marque sans famille ou sans nom', () => {
    assert.equal('error' in parseBrandDraft({ name: 'A', kind: 'BEER' }), true);
    assert.equal('error' in parseBrandDraft({ name: 'Primus', kind: 'CIDER' }), true);
  });

  it('normalise une marque valide', () => {
    const parsed = parseBrandDraft({
      name: '  Turbo   King ',
      kind: 'BEER',
      producer: ' Bralima ',
      isActive: true,
    });
    assert.ok('draft' in parsed);
    if ('draft' in parsed) {
      assert.equal(parsed.draft.name, 'Turbo King');
      assert.equal(parsed.draft.producer, 'Bralima');
      assert.equal(parsed.draft.kind, 'BEER');
    }
  });

  it('accepte plusieurs conditionnements pour une même marque', () => {
    const ok = parseVendorPriceOffers({
      offers: [
        { brandId: 'bb-1', priceFc: 2500, unitKind: 'BOTTLE', quantity: 1 },
        { brandId: 'bb-1', priceFc: 28000, unitKind: 'CRATE', quantity: 24 },
        { brandId: 'bb-1', priceFc: 14000, unitKind: 'PACK', quantity: 6 },
        { brandId: 'bb-1', priceFc: 90000, unitKind: 'OTHER', quantity: 1, unitLabel: 'Fût' },
      ],
    });
    assert.ok('offers' in ok);
    if ('offers' in ok) {
      assert.equal(ok.offers[1].unitLabel, 'casier');
      assert.equal(ok.offers[1].quantity, 24);
      assert.equal(formatBeverageSale(ok.offers[1]), 'Casier de 24');
      assert.equal(formatBeverageSale(ok.offers[0]), '1 bouteille');
      assert.equal(formatBeverageSale(ok.offers[3]), 'Fût');
    }
    const duplicate = parseVendorPriceOffers({
      offers: [
        { brandId: 'bb-1', priceFc: 1000, unitKind: 'CRATE', quantity: 12 },
        { brandId: 'bb-1', priceFc: 2000, unitKind: 'CRATE', quantity: 20 },
      ],
    });
    assert.equal('error' in duplicate, true);
    const missingOther = parseVendorPriceOffers({
      offers: [{ brandId: 'bb-1', priceFc: 1000, unitKind: 'OTHER', quantity: 1, unitLabel: '' }],
    });
    assert.equal('error' in missingOther, true);
    const promo = parseVendorPriceOffers({
      offers: [{ brandId: 'bb-1', priceFc: 2500, unitKind: 'BOTTLE', quantity: 1, promoPriceFc: 2600 }],
    });
    assert.equal('error' in promo, true);
    const dated = parseVendorPriceOffers({
      offers: [{ brandId: 'bb-1', priceFc: 2500, unitKind: 'BOTTLE', quantity: 1, promoPriceFc: 2000, promoEndsAt: '2026-12-01' }],
    });
    assert.equal('offers' in dated, true);
    if ('offers' in dated) assert.equal(dated.offers[0].promoPriceFc, 2000);
    const badDate = parseVendorPriceOffers({
      offers: [{ brandId: 'bb-1', priceFc: 2500, unitKind: 'BOTTLE', quantity: 1, promoPriceFc: 2000, promoEndsAt: 'demain' }],
    });
    assert.equal('error' in badDate, true);
  });
});
