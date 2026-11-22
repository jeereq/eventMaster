import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkMarketEstimate,
  marketEstimateAmount,
  marketSourceNote,
  parsePriceSource,
  quantile,
  resolveMarketPrice,
  summarizeObservations,
  type MarketObservation,
  type MarketReferenceRow,
} from './marketPriceStats.ts';
import { extractResearchJson, keepFacebookSources, keepSocialSources, mergeProposals, sanitizeResearchProposals } from './marketPriceResearchParse.ts';

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

test('la source choisie filtre les prix : base EventMaster, web ou Facebook', () => {
  const observed = [catering(1_000_000, 100), catering(1_200_000, 100), catering(1_400_000, 100)];
  const refs: MarketReferenceRow[] = [
    { slot: 'CATERING', city: 'Kinshasa', unit: 'PERSON', lowFc: 20_000, typicalFc: 25_000, highFc: 30_000, reviewedAt: '2026-11-22', source: 'ai_web' },
    { slot: 'CATERING', city: 'Kinshasa', unit: 'PERSON', lowFc: 9_000, typicalFc: 11_000, highFc: 13_000, reviewedAt: '2026-11-22', source: 'ai_facebook' },
    { slot: 'CATERING', city: 'Kinshasa', unit: 'PERSON', lowFc: 12_000, typicalFc: 14_000, highFc: 16_000, reviewedAt: '2026-11-22', source: 'ai_instagram' },
  ];
  assert.equal(parsePriceSource('facebook'), 'facebook');
  assert.equal(parsePriceSource('autre'), 'all');
  assert.equal(resolveMarketPrice('CATERING', 'Kinshasa', observed, refs, undefined, 'all')?.source, 'observed');
  assert.equal(resolveMarketPrice('CATERING', 'Kinshasa', [], refs, undefined, 'app'), null, 'base EventMaster : pas de prix web');
  const web = resolveMarketPrice('CATERING', 'Kinshasa', observed, refs, undefined, 'web');
  assert.equal(web?.typicalFc, 25_000);
  assert.equal(web?.channel, 'web');
  const fb = resolveMarketPrice('CATERING', 'Kinshasa', observed, refs, undefined, 'facebook');
  assert.equal(fb?.typicalFc, 11_000);
  assert.equal(fb?.channel, 'facebook');
  assert.match(marketSourceNote(fb!), /pages Facebook publiques/);
  const ig = resolveMarketPrice('CATERING', 'Kinshasa', observed, refs, undefined, 'instagram');
  assert.equal(ig?.typicalFc, 14_000);
  assert.equal(ig?.channel, 'instagram');
  assert.match(marketSourceNote(ig!), /comptes Instagram publics/);
});

test('un prix publié sans relecture admin le dit, un prix relu aussi', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  const base: MarketReferenceRow = {
    slot: 'DJ', city: 'Kinshasa', unit: 'EVENT', lowFc: 300_000, typicalFc: 400_000, highFc: 600_000,
    reviewedAt: '2026-11-22T10:00:00Z', source: 'ai_web', sources: [{ title: 'DJ', url: 'https://dj.cd' }],
  };
  const auto = resolveMarketPrice('DJ', 'Kinshasa', [], [base], undefined, 'web')!;
  assert.equal(auto.adminReviewed, false);
  assert.doesNotMatch(marketSourceNote(auto), /validés/);
  const check = checkMarketEstimate(auto, 400_000, 1, 400_000, now);
  assert.equal(check.ok, true, 'le calcul reste vérifié');
  assert.match(check.messages.join(' '), /pas encore relu par EventMaster/);
  const reviewed = resolveMarketPrice('DJ', 'Kinshasa', [], [{ ...base, reviewedById: 'admin' }], undefined, 'web')!;
  assert.match(marketSourceNote(reviewed), /validés par EventMaster/);
  assert.doesNotMatch(checkMarketEstimate(reviewed, 400_000, 1, 400_000, now).messages.join(' '), /pas encore relu/);
});

test('une recherche Instagram ne garde que des liens Instagram ; deux moteurs se complètent', () => {
  const kept = keepSocialSources([
    { title: 'Salle', url: 'https://www.instagram.com/p/abc/' },
    { title: 'Page', url: 'https://facebook.com/salle' },
    { title: 'instagram.com', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/x' },
  ], 'instagram');
  assert.deepEqual(kept.map((item) => item.title), ['Salle', 'instagram.com']);
  const one = { unit: 'EVENT' as const, lowFc: 1, typicalFc: 2, highFc: 3, rationale: '', sources: [{ title: 'a', url: 'https://a.cd' }] };
  const merged = mergeProposals([{ ...one, slot: 'DJ' }], [{ ...one, slot: 'DJ', lowFc: 9 }, { ...one, slot: 'CATERING' }]);
  assert.deepEqual(merged.map((item) => [item.slot, item.lowFc]), [['DJ', 1], ['CATERING', 1]]);
});

test('une fourchette aberrante (haut > 20 × bas) est écartée', () => {
  const out = sanitizeResearchProposals({ items: [{ slot: 'DJ', lowFc: 10_000, highFc: 5_000_000, sources: [{ url: 'https://a.cd' }] }] }, ['DJ'], 2500);
  assert.deepEqual(out, []);
});

test('une recherche Facebook ne garde que des liens Facebook', () => {
  const kept = keepFacebookSources([
    { title: 'Traiteur', url: 'https://www.facebook.com/traiteurkin/posts/1' },
    { title: 'Blog', url: 'https://blog.cd/prix' },
    { title: 'facebook.com', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc' },
    { title: 'Faux', url: 'https://facebook.com.evil.cd/x' },
  ]);
  assert.deepEqual(kept.map((item) => item.title), ['Traiteur', 'facebook.com']);
});

test('la réponse de l’IA est lue même entourée de balises, de texte, ou coupée', () => {
  const body = '{"items":[{"slot":"DJ","lowFc":1},{"slot":"CATERING","lowFc":2}]}';
  assert.deepEqual(extractResearchJson('```json\n' + body + '\n```'), JSON.parse(body));
  assert.deepEqual(extractResearchJson('```json\n' + body), JSON.parse(body), 'balise jamais fermée');
  assert.deepEqual(extractResearchJson('Voici les prix :\n' + body + '\nSources : Google.'), JSON.parse(body));
  const cut = '```json\n{"items":[{"slot":"DJ","note":"prix {forfait} \\"soirée\\"","lowFc":1},{"slot":"CATERING","lowFc":';
  assert.deepEqual(extractResearchJson(cut), { items: [{ slot: 'DJ', note: 'prix {forfait} "soirée"', lowFc: 1 }] }, 'réponse coupée : lignes complètes gardées');
  assert.throws(() => extractResearchJson('Je n’ai rien trouvé.'), /illisible/);
});
