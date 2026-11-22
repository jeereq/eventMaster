import { ServiceCategory } from '@prisma/client';
import { prisma } from '../db';
import { getGeminiApiKey, getGeminiTextModel } from './geminiJsonClient';
import { getOpenAiApiKey } from './openaiJsonClient';
import { loadPlatformSettings } from './platformSettingsService';
import { serviceCategoryLabel } from '../utils/publicVenue';
import { channelSource, defaultMarketUnit, isReferenceChannel, type ReferenceChannel } from './marketPriceStats.ts';
import {
  researchEnginePlan,
  extractResearchJson,
  keepSocialSources,
  mergeProposals,
  sanitizeResearchProposals,
  sanitizeQueries,
  sanitizeSources,
  type ResearchProposal,
  type ResearchSource,
} from './marketPriceResearchParse.ts';
import { invalidateMarketPriceCache } from './marketPriceEstimates';

type HttpError = Error & { status?: number };

function fail(status: number, message: string): never {
  const error: HttpError = new Error(message);
  error.status = status;
  throw error;
}

const SERVICE_SLOTS = Object.values(ServiceCategory) as string[];
export const MARKET_SLOTS = ['venue', ...SERVICE_SLOTS];
const MAX_SLOTS_PER_RUN = 12;
const TIMEOUT_MS = 120_000;

export function marketSlotLabel(slot: string): string {
  if (slot === 'venue') return 'Salle de réception';
  return SERVICE_SLOTS.includes(slot) ? serviceCategoryLabel(slot as ServiceCategory) : slot;
}

export function parseMarketSlots(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter((slot) => MARKET_SLOTS.includes(slot)))];
}

export type ResearchChannel = ReferenceChannel;

export function parseResearchChannel(value: unknown): ResearchChannel {
  return isReferenceChannel(value) ? value : 'web';
}

export function researchChannelLabel(channel: ResearchChannel): string {
  return channel === 'facebook' ? 'Facebook' : channel === 'instagram' ? 'Instagram' : 'web';
}

function researchPrompt(city: string, slots: string[], usdRate: number, guestHint: number, channel: ResearchChannel): { system: string; user: string } {
  const place = city ? `${city}, République démocratique du Congo` : 'République démocratique du Congo (Kinshasa en priorité)';
  const lines = slots.map((slot) => {
    const unit = defaultMarketUnit(slot) === 'PERSON' ? 'prix PAR INVITÉ' : 'prix FORFAITAIRE pour un événement';
    return `- ${slot} : ${marketSlotLabel(slot)} (${unit})`;
  });
  const today = new Date().toISOString().slice(0, 10);
  const cityWord = city || 'Kinshasa';
  const where = channel === 'facebook'
    ? `Tu cherches UNIQUEMENT sur des pages et publications Facebook publiques (requêtes du type « site:facebook.com traiteur ${cityWord} prix ») : pages de traiteurs, salles, décorateurs, DJ, loueurs de matériel, groupes publics d’annonces, Marketplace. Chaque source doit être une URL facebook.com.`
    : channel === 'instagram'
      ? `Tu cherches UNIQUEMENT sur des comptes et publications Instagram publics (requêtes du type « site:instagram.com salle de fête ${cityWord} prix ») : comptes de traiteurs, salles, décorateurs, DJ, photographes, loueurs. Les prix sont souvent dans la légende ou les commentaires. Chaque source doit être une URL instagram.com.`
      : `Tu fais plusieurs recherches web par ligne (en français et en lingala ou anglais si utile, avec le nom de la ville et le mot « prix » ou « tarif ») : sites de prestataires, annuaires, annonces (Jumia, Expat-Dakar, groupes d’annonces), pages Facebook ou Instagram publiques, articles de presse.`;
  const system = [
    'Tu es analyste des prix de l’événementiel en République démocratique du Congo.',
    where,
    `Nous sommes le ${today}. Privilégie les prix des 12 derniers mois et ignore ceux de plus de 2 ans.`,
    'Croise au moins deux sources par ligne quand c’est possible ; la fourchette basse et haute reflète l’écart entre les sources, le prix typique la valeur la plus fréquente.',
    'Un prix au mètre, à l’heure ou par article est ramené au prix par invité ou au forfait pour l’événement de référence, et tu l’expliques dans rationale.',
    'Tu n’inventes jamais un prix. Si tu ne trouves pas de source fiable pour une ligne, tu l’omets.',
    'Tu réponds uniquement avec un objet JSON, sans texte autour.',
  ].join(' ');
  const user = [
    `Lieu : ${place}. Événement de référence : environ ${guestHint} invités.`,
    'Lignes à chiffrer :',
    ...lines,
    '',
    `Donne pour chaque ligne une fourchette basse, typique et haute en francs congolais (FC). Si la source est en dollars, convertis au taux 1 USD = ${usdRate} FC, ou renvoie currency "USD" avec les montants en dollars.`,
    'Format :',
    '{"items":[{"slot":"CATERING","unit":"PERSON","currency":"FC","lowFc":0,"typicalFc":0,"highFc":0,"rationale":"2 à 3 phrases en français : ce que couvre le prix (menu, boissons, service, durée…), comment la fourchette est construite à partir des sources, et ce qui peut le faire varier","sources":[{"title":"nom du prestataire ou de la page","url":"https://...","price":"prix tel qu’affiché sur la page, avec sa devise et son unité","excerpt":"phrase copiée de la page qui donne ce prix","date":"date de publication si connue (AAAA-MM)"}]}]}',
    'unit vaut "PERSON" pour un prix par invité, "EVENT" pour un forfait. Chaque ligne cite au moins une source avec son URL, et pour chaque source le prix relevé et la phrase qui le donne.',
  ].join('\n');
  return { system, user };
}

type AiAnswer = { raw: unknown; sources: ResearchSource[]; model: string; queries: string[] };

async function askGemini(system: string, user: string, preferredModel?: string): Promise<AiAnswer> {
  const key = getGeminiApiKey();
  if (!key) fail(503, 'GEMINI_API_KEY manquante.');
  const model = preferredModel || getGeminiTextModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          // La recherche Google ancre la réponse sur des pages réelles.
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>; webSearchQueries?: string[] };
      }>;
    };
    if (!response.ok) fail(502, payload.error?.message || 'Gemini n’a pas répondu.');
    const candidate = payload.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((part) => part.text || '').join('').trim();
    if (!text) fail(502, 'Gemini n’a renvoyé aucun prix.');
    const sources = sanitizeSources(
      (candidate?.groundingMetadata?.groundingChunks || []).map((chunk) => ({ url: chunk.web?.uri, title: chunk.web?.title })),
    );
    return { raw: extractResearchJson(text), sources, model, queries: sanitizeQueries(candidate?.groundingMetadata?.webSearchQueries) };
  } finally {
    clearTimeout(timer);
  }
}

async function askOpenAi(system: string, user: string, preferredModel?: string): Promise<AiAnswer> {
  const key = getOpenAiApiKey();
  if (!key) fail(503, 'OPENAI_API_KEY manquante.');
  const model = (preferredModel || process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-4o').trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: system,
        input: user,
        tools: [{ type: 'web_search' }],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      output?: Array<{
        type?: string;
        action?: { query?: string; queries?: string[] };
        content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; url?: string; title?: string }> }>;
      }>;
    };
    if (!response.ok) fail(502, payload.error?.message || 'OpenAI n’a pas répondu.');
    let text = '';
    const cited: Array<{ url?: string; title?: string }> = [];
    const queries: unknown[] = [];
    for (const item of payload.output || []) {
      if (item.type === 'web_search_call') {
        if (item.action?.query) queries.push(item.action.query);
        queries.push(...(item.action?.queries || []));
      }
      if (item.type !== 'message') continue;
      for (const part of item.content || []) {
        if (part.type !== 'output_text') continue;
        text += part.text || '';
        for (const note of part.annotations || []) {
          if (note.type === 'url_citation') cited.push({ url: note.url, title: note.title });
        }
      }
    }
    if (!text.trim()) fail(502, 'OpenAI n’a renvoyé aucun prix.');
    return { raw: extractResearchJson(text), sources: sanitizeSources(cited), model, queries: sanitizeQueries(queries) };
  } finally {
    clearTimeout(timer);
  }
}

function cleanProposals(answer: AiAnswer, slots: string[], usdRate: number, channel: ResearchChannel): ResearchProposal[] {
  return cleanChannelProposals(answer, slots, usdRate, channel)
    .map((proposal) => ({ ...proposal, model: answer.model, queries: answer.queries }));
}

function cleanChannelProposals(answer: AiAnswer, slots: string[], usdRate: number, channel: ResearchChannel): ResearchProposal[] {
  if (channel === 'web') return sanitizeResearchProposals(answer.raw, slots, usdRate, answer.sources);
  const network = channel;
  return sanitizeResearchProposals(answer.raw, slots, usdRate, keepSocialSources(answer.sources, network))
    .map((proposal) => ({ ...proposal, sources: keepSocialSources(proposal.sources, network) }))
    .filter((proposal) => proposal.sources.length > 0);
}

/**
 * Interroge d’abord le modèle choisi dans les paramètres IA de la plateforme (Gemini avec Google Search,
 * ou OpenAI avec la recherche web), puis l’autre fournisseur pour les lignes encore sans prix.
 * Deux moteurs de recherche couvrent plus de pages qu’un seul.
 */
async function searchPrices(
  city: string,
  slots: string[],
  usdRate: number,
  guestHint: number,
  channel: ResearchChannel,
  chosenModel?: string,
): Promise<{ proposals: ResearchProposal[]; model: string }> {
  let proposals: ResearchProposal[] = [];
  const models: string[] = [];
  let lastError: Error | null = null;
  for (const step of researchEnginePlan(chosenModel)) {
    const available = step.engine === 'gemini' ? getGeminiApiKey() : getOpenAiApiKey();
    if (!available) continue;
    const missing = slots.filter((slot) => !proposals.some((item) => item.slot === slot));
    if (!missing.length) break;
    try {
      const { system, user } = researchPrompt(city, missing, usdRate, guestHint, channel);
      const answer = step.engine === 'gemini'
        ? await askGemini(system, user, step.model)
        : await askOpenAi(system, user, step.model);
      proposals = mergeProposals(proposals, cleanProposals(answer, missing, usdRate, channel));
      models.push(answer.model);
    } catch (error) {
      lastError = error as Error;
      console.warn(`[marketPrices] ${step.engine === 'gemini' ? 'Gemini' : 'OpenAI'} a échoué :`, lastError.message);
    }
  }
  if (!models.length) fail(502, lastError?.message || 'La recherche web n’a rien renvoyé.');
  return { proposals, model: models.join(' + ') };
}

/** Une seule recherche à la fois par ville et canal ; au plus deux en parallèle sur le serveur. */
const inflight = new Map<string, Promise<unknown>>();
const MAX_PARALLEL = 2;

/**
 * Lance une recherche de prix (web, Facebook ou Instagram) et publie tout de suite les résultats :
 * le simulateur les utilise sans attendre de validation. Chaque nouveau prix remplace l’ancien
 * pour la même ligne, la même ville et le même canal. Un Super Admin peut ensuite corriger ou retirer un prix.
 */
export async function researchMarketPrices(input: { city: string; slots: string[]; guestHint?: number; actorId?: string | null; channel?: ResearchChannel }) {
  const channel = parseResearchChannel(input.channel);
  const slots = parseMarketSlots(input.slots).slice(0, MAX_SLOTS_PER_RUN);
  if (!slots.length) fail(400, 'Choisissez au moins une ligne à rechercher.');
  if (!getGeminiApiKey() && !getOpenAiApiKey()) {
    fail(503, 'Aucune IA configurée sur le serveur (GEMINI_API_KEY ou OPENAI_API_KEY).');
  }
  const key = `${input.city}|${channel}`;
  if (inflight.has(key) || inflight.size >= MAX_PARALLEL) {
    fail(409, 'Une recherche est déjà en cours. Réessayez dans une minute.');
  }
  const run = (async () => {
    const settings = loadPlatformSettings();
    const usdRate = Number(settings.usdExchangeRateCdf) > 0 ? Number(settings.usdExchangeRateCdf) : 2800;
    const guestHint = Math.min(2000, Math.max(20, Math.round(Number(input.guestHint) || 150)));
    const { proposals, model } = await searchPrices(input.city, slots, usdRate, guestHint, channel, settings.aiStudioModels?.priceResearchModel);

    const now = new Date();
    const source = channelSource(channel);
    const created = [];
    for (const proposal of proposals) {
      const [, row] = await prisma.$transaction([
        prisma.marketPriceReference.updateMany({
          where: { slot: proposal.slot, city: input.city, source, status: 'APPROVED' },
          data: { status: 'REPLACED' },
        }),
        prisma.marketPriceReference.create({
          data: {
            slot: proposal.slot,
            city: input.city,
            unit: proposal.unit,
            lowFc: proposal.lowFc,
            typicalFc: proposal.typicalFc,
            highFc: proposal.highFc,
            status: 'APPROVED',
            source,
            sources: proposal.sources,
            rationale: proposal.rationale || null,
            model: proposal.model || model,
            searchQueries: proposal.queries || [],
            proposedById: input.actorId || null,
            reviewedAt: now,
          },
        }),
      ]);
      created.push(row);
    }
    if (created.length) invalidateMarketPriceCache();
    const found = new Set(proposals.map((proposal) => proposal.slot));
    return {
      proposals: created,
      notFound: slots.filter((slot) => !found.has(slot)),
      model,
      channel,
    };
  })();
  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}

/** Une ligne cherchée sans succès n’est pas recherchée à nouveau avant ce délai. */
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
const LIVE_TIMEOUT_MS = 45_000;
const lastAttempt = new Map<string, number>();

/**
 * Recherche en direct, depuis le simulateur, des lignes qui n’ont encore aucun prix pour ce canal.
 * Ne lève jamais d’erreur : au pire le simulateur affiche la ligne comme non chiffrée.
 * Renvoie le nombre de lignes nouvellement chiffrées.
 */
export async function researchMissingMarketPrices(input: {
  city: string;
  slots: string[];
  channel: ResearchChannel;
  guestHint?: number;
}): Promise<number> {
  if (!getGeminiApiKey() && !getOpenAiApiKey()) return 0;
  const now = Date.now();
  const slots = parseMarketSlots(input.slots).filter((slot) => {
    const at = lastAttempt.get(`${input.city}|${input.channel}|${slot}`);
    return !at || now - at > RETRY_AFTER_MS;
  });
  if (!slots.length) return 0;
  const key = `${input.city}|${input.channel}`;
  const pending = inflight.get(key);
  if (pending) {
    // Une autre recherche pour cette ville et ce canal tourne déjà : on l’attend au lieu d’en relancer une.
    await Promise.race([pending.catch(() => null), new Promise((resolve) => setTimeout(resolve, LIVE_TIMEOUT_MS))]);
    return 0;
  }
  for (const slot of slots) lastAttempt.set(`${input.city}|${input.channel}|${slot}`, now);
  try {
    const result = await Promise.race([
      researchMarketPrices({ city: input.city, slots, channel: input.channel, guestHint: input.guestHint }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LIVE_TIMEOUT_MS)),
    ]);
    return result ? result.proposals.length : 0;
  } catch (error) {
    console.warn('[marketPrices] recherche en direct impossible :', (error as Error)?.message);
    return 0;
  }
}
