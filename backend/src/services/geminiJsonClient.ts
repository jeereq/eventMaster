type HttpError = Error & { status?: number };

const GEMINI_TEXT_MODEL_DEFAULT = 'gemini-3.1-pro-preview';
const GEMINI_RETIRED_TEXT_MODELS = new Set([
  'gemini-2.5-pro',
  'gemini-2.5-pro-preview',
  'gemini-2.0-pro',
  'gemini-1.5-pro',
]);
const GEMINI_IMAGE_FETCH_MAX_BYTES = 8 * 1024 * 1024;

function fail(status: number, message: string): never {
  const error: HttpError = new Error(message);
  error.status = status;
  throw error;
}

export function getGeminiApiKey(): string | null {
  const key = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.NANO_BANANA_API_KEY ||
    ''
  ).trim();
  return key || null;
}

export function requireGeminiApiKey(): string {
  const key = getGeminiApiKey();
  if (!key) {
    fail(503, 'L’IA n’est pas configurée sur ce serveur (GEMINI_API_KEY manquante).');
  }
  return key;
}

export function getGeminiTextModel(): string {
  const raw = (
    process.env.GEMINI_PLAN_MODEL ||
    process.env.GEMINI_TEXT_MODEL ||
    process.env.GEMINI_MODEL ||
    GEMINI_TEXT_MODEL_DEFAULT
  ).trim();
  const model = raw.replace(/^models\//, '');
  if (!model || GEMINI_RETIRED_TEXT_MODELS.has(model)) return GEMINI_TEXT_MODEL_DEFAULT;
  return model;
}

export function parseGeminiJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced?.[1] || trimmed).trim();
  return JSON.parse(jsonText);
}

function parseDataImage(url: string): { mimeType: string; base64: string } | null {
  const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match?.[1] || !match[2]) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function loadGeminiInlineImage(
  imageUrl: string,
  failMessage = 'Impossible de télécharger l’image pour l’analyse.',
): Promise<{ inline_data: { mime_type: string; data: string } }> {
  const embedded = parseDataImage(imageUrl);
  if (embedded) {
    return { inline_data: { mime_type: embedded.mimeType, data: embedded.base64 } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) fail(502, failMessage);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 80) fail(502, 'L’image est invalide ou trop petite.');
    if (buffer.byteLength > GEMINI_IMAGE_FETCH_MAX_BYTES) {
      fail(413, 'L’image est trop lourde pour Gemini (max 8 Mo).');
    }
    const header = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const mimeType = header.startsWith('image/') ? header : 'image/jpeg';
    return { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestGeminiJson(input: {
  system: string;
  userText: string;
  imageUrls?: string[];
  temperature?: number;
  timeoutMs?: number;
  failMessage?: string;
}): Promise<unknown> {
  const key = requireGeminiApiKey();
  const model = getGeminiTextModel();
  const failMessage = input.failMessage || 'L’IA Gemini n’a pas renvoyé de JSON utilisable.';
  const parts: Array<Record<string, unknown>> = [{ text: input.userText }];
  for (const url of (input.imageUrls || []).slice(0, 4)) {
    try {
      parts.unshift(await loadGeminiInlineImage(url));
    } catch (error) {
      console.warn('[geminiJson] skip image:', (error as Error)?.message);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 90_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: input.temperature ?? 0.3,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    if (!response.ok) {
      fail(502, payload.error?.message || failMessage);
    }
    const raw = (payload.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('')
      .trim();
    if (!raw) fail(502, failMessage);
    try {
      return parseGeminiJson(raw);
    } catch {
      fail(502, failMessage);
    }
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || failMessage);
  } finally {
    clearTimeout(timer);
  }
}
