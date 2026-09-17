type HttpError = Error & { status?: number };

function fail(status: number, message: string): never {
  const error: HttpError = new Error(message);
  error.status = status;
  throw error;
}

export function getOpenAiApiKey(): string {
  return String(process.env.OPENAI_API_KEY || '').trim();
}

export function getOpenAiJsonModel(preferred?: string | null): string {
  const custom = String(preferred || '').trim();
  if (custom && (custom.startsWith('gpt-') || custom.includes('luna') || custom.includes('astra'))) {
    return custom;
  }
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

/**
 * Modèles qui acceptent encore une température ≠ 1.
 * gpt-5 / o-series / luna / astra / gpt-4.1+ n’acceptent que la valeur par défaut (1) :
 * on omet alors le champ `temperature` plutôt que d’envoyer 0.2.
 */
export function openAiSupportsCustomTemperature(model: string): boolean {
  const id = model.trim().toLowerCase();
  if (
    id.startsWith('gpt-5') ||
    id.startsWith('gpt-6') ||
    id.startsWith('o1') ||
    id.startsWith('o3') ||
    id.startsWith('o4') ||
    id.includes('luna') ||
    id.includes('astra')
  ) {
    return false;
  }
  return (
    id.startsWith('gpt-4o') ||
    id.startsWith('gpt-4-turbo') ||
    id.startsWith('gpt-3.5') ||
    id === 'gpt-4' ||
    /^gpt-4-\d{4}/.test(id) // ex. gpt-4-0613
  );
}

/** @deprecated Préférer openAiSupportsCustomTemperature (logique inversée plus sûre). */
export function openAiLocksSampling(model: string): boolean {
  return !openAiSupportsCustomTemperature(model);
}

function isTemperatureUnsupportedError(message: string): boolean {
  return /temperature/i.test(message) && /unsupported|does not support|only the default/i.test(message);
}

function openAiChatBody(params: {
  model: string;
  system: string;
  userContent: unknown;
  temperature?: number;
  includeTemperature: boolean;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.userContent },
    ],
  };
  if (params.includeTemperature && params.temperature !== undefined) {
    body.temperature = params.temperature;
  }
  return body;
}

export async function requestOpenAiJson(input: {
  system: string;
  userText: string;
  imageUrls?: string[];
  temperature?: number;
  timeoutMs?: number;
  failMessage?: string;
  model?: string;
}): Promise<unknown> {
  const key = getOpenAiApiKey();
  if (!key) {
    fail(503, 'La génération IA n’est pas configurée (OPENAI_API_KEY).');
  }

  const failMessage = input.failMessage || 'OpenAI n’a pas renvoyé de JSON utilisable.';
  const model = getOpenAiJsonModel(input.model);
  const temperature = input.temperature ?? 0.3;
  const userContent: Array<Record<string, unknown>> = [
    { type: 'text', text: input.userText },
    ...(input.imageUrls || []).slice(0, 4).map((url) => ({
      type: 'image_url',
      image_url: { url, detail: 'high' as const },
    })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 90_000);

  const post = async (includeTemperature: boolean) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        openAiChatBody({
          model,
          system: input.system,
          userContent,
          temperature,
          includeTemperature,
        }),
      ),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      fail(502, payload.error?.message || failMessage);
    }
    const raw = payload.choices?.[0]?.message?.content || '';
    if (!raw.trim()) fail(502, failMessage);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') fail(502, failMessage);
    return parsed;
  };

  try {
    return await post(openAiSupportsCustomTemperature(model));
  } catch (error) {
    const message = (error as Error)?.message || '';
    // Toujours retenter sans temperature si l’API la refuse (nouveaux modèles non listés).
    if (isTemperatureUnsupportedError(message)) {
      try {
        return await post(false);
      } catch (retryError) {
        if ((retryError as HttpError)?.status) throw retryError;
        fail(502, (retryError as Error)?.message || failMessage);
      }
    }
    if ((error as HttpError)?.status) throw error;
    fail(502, message || failMessage);
  } finally {
    clearTimeout(timer);
  }
}
