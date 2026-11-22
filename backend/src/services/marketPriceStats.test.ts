import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkMarketEstimate,
  marketEstimateAmount,
  quantile,
  resolveMarketPrice,
  summarizeObservations,
  type MarketObservation,
  type MarketReferenceRow,
} from './marketPriceStats.ts';
import { sanitizeResearchProposals } from './marketPriceResearchParse.ts';

const catering = (amountFc: number, guestCount: number | null, city = 'Kinshasa'): MarketObservation => ({
  slot: 'CATERING',
  city,
  amountFc,
  guestCount,
});

test('quantile interpole entre deux valeurs', () => {
  assert.equal(quantile([10, 20, 30, 40], 0.5), 25);
  assert.equal(quantile([5], 0.75), 5);
  assert.equal(quantile([], 0.5), 0);
});

test('le traiteur se résume par invité quand les réservations précisent le nombre d’invités', () => {
  const stat = summarizeObservations([
    catering(1_000_000, 100),
    catering(3_000_000, 200),
    catering(2_000_000, 100),
  ], 'CATERING', 'Kinshasa');
  assert.ok(stat);
  assert.equal(stat.unit, 'PERSON');
  assert.equal(stat.typicalFc, 15_000);
  assert.equal(stat.lowFc, 12_500);
  assert.equal(stat.highFc, 17_500);
  assert.equal(stat.sampleCount, 3);
});

test('moins de 3 prix réels : pas d’estimation', () => {
  assert.equal(summarizeObservations([catering(1_000_000, 100), catering(2_000_000, 100)], 'CATERING', 'Kinshasa'), null);
});

test('les prix réels de la ville passent avant une référence web, la référence de la ville avant le national', () => {
  const observed = [catering(1_000_000, 100), catering(1_200_000, 100), catering(1_400_000, 100)];
  const references: MarketReferenceRow[] = [
    { slot: 'CATERING', city: 'Kinshasa', unit: 'PERSON', lowFc: 20_000, typicalFc: 25_000, highFc: 30_000, reviewedAt: '2026-11-22T10:00:00Z' },
    { slot: 'CATERING', city: '', unit: 'PERSON', lowFc: 8_000, typicalFc: 9_000, highFc: 10_000, reviewedAt: '2026-11-22T10:00:00Z' },
  ];
  assert.equal(resolveMarketPrice('CATERING', 'Kinshasa', observed, references)?.source, 'observed');
  assert.equal(resolveMarketPrice('CATERING', 'Kinshasa', [], references)?.typicalFc, 25_000);
  assert.equal(resolveMarketPrice('CATERING', 'Lubumbashi', [], references)?.typicalFc, 9_000);
  assert.equal(resolveMarketPrice('DJ', 'Kinshasa', observed, references), null);
});

test('le montant suit le style du pack et retombe au bas de fourchette si le plafond est dépassé', () => {
  const stat = { slot: 'CATERING', city: 'Kinshasa', unit: 'PERSON' as const, lowFc: 10_000, typicalFc: 15_000, highFc: 20_000, source: 'reference' as const, reviewedAt: null };
  assert.equal(marketEstimateAmount(stat, 100, 'cheap')?.amountFc, 1_000_000);
  assert.equal(marketEstimateAmount(stat, 100, 'balanced')?.amountFc, 1_500_000);
  assert.equal(marketEstimateAmount(stat, 100, 'comfort', 1_600_000)?.amountFc, 1_500_000);
  assert.equal(marketEstimateAmount(stat, 100, 'comfort', 1_200_000)?.amountFc, 1_000_000);
  assert.equal(marketEstimateAmount(stat, 100, 'comfort', 900_000), null);
  assert.equal(marketEstimateAmount(stat, 0, 'balanced'), null, 'prix par invité sans nombre d’invités');
  assert.match(marketEstimateAmount(stat, 100, 'balanced')?.note || '', /trouvés sur le web à Kinshasa/);
});

test('la recherche web : lignes connues, dollars convertis, fourchette remise en ordre, sources exigées', () => {
  const proposals = sanitizeResearchProposals({
    items: [
      { slot: 'venue', unit: 'EVENT', currency: 'USD', lowFc: 3000, typicalFc: 1000, highFc: 2000, sources: [{ title: 'Salle X', url: 'https://example.cd/salle' }] },
      { slot: 'CATERING', lowFc: 12000, typicalFc: 15000, highFc: 20000, sources: [] },
      { slot: 'DJ', lowFc: 100, sources: [{ url: 'javascript:alert(1)' }] },
      { slot: 'INCONNU', lowFc: 1, sources: [{ url: 'https://a.cd' }] },
    ],
  }, ['venue', 'CATERING', 'DJ'], 2500, [{ title: 'Google', url: 'https://source.cd/traiteur' }]);
  assert.equal(proposals.length, 3);
  const venue = proposals.find((item) => item.slot === 'venue');
  assert.deepEqual([venue?.lowFc, venue?.typicalFc, venue?.highFc], [2_500_000, 5_000_000, 7_500_000]);
  const food = proposals.find((item) => item.slot === 'CATERING');
  assert.equal(food?.unit, 'PERSON');
  assert.equal(food?.sources[0]?.url, 'https://source.cd/traiteur', 'source de la recherche reprise');
  const dj = proposals.find((item) => item.slot === 'DJ');
  assert.equal(dj?.sources[0]?.url, 'https://source.cd/traiteur', 'URL non web écartée');
  assert.deepEqual(sanitizeResearchProposals({ items: [{ slot: 'DJ', lowFc: 100 }] }, ['DJ'], 2500), [], 'sans source, rien');
});

test('le coût estimé est contrôlé : calcul, fourchette, fraîcheur et sources', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  const fresh = {
    slot: 'CATERING', city: 'Kinshasa', unit: 'PERSON' as const, lowFc: 10_000, typicalFc: 15_000, highFc: 20_000,
    source: 'reference' as const, reviewedAt: '2026-11-01T00:00:00Z', sources: [{ title: 'Traiteur', url: 'https://t.cd' }],
  };
  const priced = marketEstimateAmount(fresh, 100, 'balanced');
  assert.equal(priced?.quantity, 100);
  assert.equal(priced?.unitFc, 15_000);
  const ok = checkMarketEstimate(fresh, 15_000, 100, 1_500_000, now);
  assert.equal(ok.ok, true);
  assert.match(ok.messages[0], /Calcul vérifié : 100 × 15[\s ]000 FC = 1[\s ]500[\s ]000 FC/);

  assert.equal(checkMarketEstimate(fresh, 15_000, 100, 1_400_000, now).ok, false, 'total faux');
  assert.equal(checkMarketEstimate(fresh, 25_000, 100, 2_500_000, now).ok, false, 'hors fourchette');
  const old = checkMarketEstimate({ ...fresh, reviewedAt: '2026-01-01T00:00:00Z' }, 15_000, 100, 1_500_000, now);
  assert.equal(old.ok, false);
  assert.match(old.messages.join(' '), /plus de 6 mois/);
  assert.equal(checkMarketEstimate({ ...fresh, sources: [] }, 15_000, 100, 1_500_000, now).ok, false, 'sans source');
});
