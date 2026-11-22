import { ServiceCategory } from '@prisma/client';
import { prisma } from '../db';
import { getGeminiApiKey, getGeminiTextModel, parseGeminiJson } from './geminiJsonClient';
import { getOpenAiApiKey } from './openaiJsonClient';
import { loadPlatformSettings } from './platformSettingsService';
import { serviceCategoryLabel } from '../utils/publicVenue';
import { defaultMarketUnit } from './marketPriceStats.ts';
import { keepFacebookSources, sanitizeResearchProposals, sanitizeSources, type ResearchSource } from './marketPriceResearchParse.ts';

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

export type ResearchChannel = 'web' | 'facebook';

export function parseResearchChannel(value: unknown): ResearchChannel {
  return value === 'facebook' ? 'facebook' : 'web';
}

function researchPrompt(city: string, slots: string[], usdRate: number, guestHint: number, channel: ResearchChannel): { system: string; user: string } {
  const place = city ? `${city}, République démocratique du Congo` : 'République démocratique du Congo (Kinshasa en priorité)';
  const lines = slots.map((slot) => {
    const unit = defaultMarketUnit(slot) === 'PERSON' ? 'prix PAR INVITÉ' : 'prix FORFAITAIRE pour un événement';
    return `- ${slot} : ${marketSlotLabel(slot)} (${unit})`;
  });
  const where = channel === 'facebook'
    ? 'Tu cherches UNIQUEMENT sur des pages et publications Facebook publiques (requêtes du type site:facebook.com) : pages de traiteurs, salles, décorateurs, DJ, loueurs de matériel, groupes publics d’annonces. Chaque source doit être une URL facebook.com.'
    : 'Tu utilises la recherche web pour trouver des prix récents et publics : sites de prestataires, pages Facebook ou Instagram publiques, annonces, articles de presse, comparateurs.';
  const system = [
    'Tu es analyste des prix de l’événementiel en République démocratique du Congo.',
    where,
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
    '{"items":[{"slot":"CATERING","unit":"PERSON","currency":"FC","lowFc":0,"typicalFc":0,"highFc":0,"rationale":"phrase courte en français : ce que couvre le prix et la date des sources","sources":[{"title":"...","url":"https://..."}]}]}',
    'unit vaut "PERSON" pour un prix par invité, "EVENT" pour un forfait. Chaque ligne cite au moins une source avec son URL.',
  ].join('\n');
  return { system, user };
}

async function askGemini(system: string, user: string): Promise<{ raw: unknown; sources: ResearchSource[]; model: string }> {
  const key = getGeminiApiKey();
  if (!key) fail(503, 'GEMINI_API_KEY manquante.');
  const model = getGeminiTextModel();
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
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
      }>;
    };
    if (!response.ok) fail(502, payload.error?.message || 'Gemini n’a pas répondu.');
    const candidate = payload.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((part) => part.text || '').join('').trim();
    if (!text) fail(502, 'Gemini n’a renvoyé aucun prix.');
    const sources = sanitizeSources(
      (candidate?.groundingMetadata?.groundingChunks || []).map((chunk) => ({ url: chunk.web?.uri, title: chunk.web?.title })),
    );
    return { raw: parseGeminiJson(text), sources, model };
  } finally {
    clearTimeout(timer);
  }
}

async function askOpenAi(system: string, user: string): Promise<{ raw: unknown; sources: ResearchSource[]; model: string }> {
  const key = getOpenAiApiKey();
  if (!key) fail(503, 'OPENAI_API_KEY manquante.');
  const model = (process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-4o').trim();
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
        content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; url?: string; title?: string }> }>;
      }>;
    };
    if (!response.ok) fail(502, payload.error?.message || 'OpenAI n’a pas répondu.');
    let text = '';
    const cited: Array<{ url?: string; title?: string }> = [];
    for (const item of payload.output || []) {
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
    return { raw: parseGeminiJson(text), sources: sanitizeSources(cited), model };
  } finally {
    clearTimeout(timer);
  }
}

let running = false;

/**
 * Lance une recherche web de prix et enregistre les résultats comme propositions.
 * Rien n’est utilisé par le simulateur avant la validation d’un Super Admin.
 */
export async function researchMarketPrices(input: { city: string; slots: string[]; guestHint?: number; actorId: string; channel?: ResearchChannel }) {
  const channel = parseResearchChannel(input.channel);
  const slots = parseMarketSlots(input.slots).slice(0, MAX_SLOTS_PER_RUN);
  if (!slots.length) fail(400, 'Choisissez au moins une ligne à rechercher.');
  if (!getGeminiApiKey() && !getOpenAiApiKey()) {
    fail(503, 'Aucune IA configurée sur le serveur (GEMINI_API_KEY ou OPENAI_API_KEY).');
  }
  if (running) fail(409, 'Une recherche est déjà en cours. Réessayez dans une minute.');
  running = true;
  try {
    const settings = loadPlatformSettings();
    const usdRate = Number(settings.usdExchangeRateCdf) > 0 ? Number(settings.usdExchangeRateCdf) : 2800;
    const guestHint = Math.min(2000, Math.max(20, Math.round(Number(input.guestHint) || 150)));
    const { system, user } = researchPrompt(input.city, slots, usdRate, guestHint, channel);

    let answer: { raw: unknown; sources: ResearchSource[]; model: string } | null = null;
    let lastError: Error | null = null;
    if (getGeminiApiKey()) {
      try {
        answer = await askGemini(system, user);
      } catch (error) {
        lastError = error as Error;
        console.warn('[marketPrices] Gemini a échoué, essai OpenAI :', lastError.message);
      }
    }
    if (!answer && getOpenAiApiKey()) {
      try {
        answer = await askOpenAi(system, user);
      } catch (error) {
        lastError = error as Error;
      }
    }
    if (!answer) fail(502, lastError?.message || 'La recherche web n’a rien renvoyé.');

    const proposals = channel === 'facebook'
      ? sanitizeResearchProposals(answer.raw, slots, usdRate, keepFacebookSources(answer.sources))
        .map((proposal) => ({ ...proposal, sources: keepFacebookSources(proposal.sources) }))
        .filter((proposal) => proposal.sources.length > 0)
      : sanitizeResearchProposals(answer.raw, slots, usdRate, answer.sources);
    const created = [];
    for (const proposal of proposals) {
      created.push(await prisma.marketPriceReference.create({
        data: {
          slot: proposal.slot,
          city: input.city,
          unit: proposal.unit,
          lowFc: proposal.lowFc,
          typicalFc: proposal.typicalFc,
          highFc: proposal.highFc,
          status: 'PROPOSED',
          source: channel === 'facebook' ? 'ai_facebook' : 'ai_web',
          sources: proposal.sources,
          rationale: proposal.rationale || null,
          model: answer.model,
          proposedById: input.actorId,
        },
      }));
    }
    const found = new Set(proposals.map((proposal) => proposal.slot));
    return {
      proposals: created,
      notFound: slots.filter((slot) => !found.has(slot)),
      model: answer.model,
      channel,
    };
  } finally {
    running = false;
  }
}
