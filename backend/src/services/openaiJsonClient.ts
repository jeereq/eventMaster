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
  if (custom && (custom.startsWith('gpt-') || custom.includes('luna'))) {
    return custom;
  }
  return process.env.OPENAI_MODEL || 'gpt-4o';
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
  const userContent: Array<Record<string, unknown>> = [
    { type: 'text', text: input.userText },
    ...(input.imageUrls || []).slice(0, 4).map((url) => ({
      type: 'image_url',
      image_url: { url, detail: 'high' as const },
    })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 90_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getOpenAiJsonModel(input.model),
        temperature: input.temperature ?? 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: userContent },
        ],
      }),
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
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || failMessage);
  } finally {
    clearTimeout(timer);
  }
}
