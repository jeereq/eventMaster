"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenAiApiKey = getOpenAiApiKey;
exports.getOpenAiJsonModel = getOpenAiJsonModel;
exports.openAiSupportsCustomTemperature = openAiSupportsCustomTemperature;
exports.openAiLocksSampling = openAiLocksSampling;
exports.requestOpenAiJson = requestOpenAiJson;
function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
function getOpenAiApiKey() {
    return String(process.env.OPENAI_API_KEY || '').trim();
}
function getOpenAiJsonModel(preferred) {
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
function openAiSupportsCustomTemperature(model) {
    const id = model.trim().toLowerCase();
    if (id.startsWith('gpt-5') ||
        id.startsWith('gpt-6') ||
        id.startsWith('o1') ||
        id.startsWith('o3') ||
        id.startsWith('o4') ||
        id.includes('luna') ||
        id.includes('astra')) {
        return false;
    }
    return (id.startsWith('gpt-4o') ||
        id.startsWith('gpt-4-turbo') ||
        id.startsWith('gpt-3.5') ||
        id === 'gpt-4' ||
        /^gpt-4-\d{4}/.test(id) // ex. gpt-4-0613
    );
}
/** @deprecated Préférer openAiSupportsCustomTemperature (logique inversée plus sûre). */
function openAiLocksSampling(model) {
    return !openAiSupportsCustomTemperature(model);
}
function isTemperatureUnsupportedError(message) {
    return /temperature/i.test(message) && /unsupported|does not support|only the default/i.test(message);
}
function openAiChatBody(params) {
    const body = {
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
function optimizeCloudinaryUrl(url) {
    if (!url || typeof url !== 'string')
        return url;
    const trimmed = url.trim();
    if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
        if (!trimmed.includes('/image/upload/f_') &&
            !trimmed.includes('/image/upload/c_') &&
            !trimmed.includes('/image/upload/w_') &&
            !trimmed.includes('/image/upload/q_')) {
            return trimmed.replace('/image/upload/', '/image/upload/f_auto,q_auto:best,w_2048,c_limit/');
        }
    }
    return trimmed;
}
async function requestOpenAiJson(input) {
    const key = getOpenAiApiKey();
    if (!key) {
        fail(503, 'La génération IA n’est pas configurée (OPENAI_API_KEY).');
    }
    const failMessage = input.failMessage || 'OpenAI n’a pas renvoyé de JSON utilisable.';
    const model = getOpenAiJsonModel(input.model);
    const temperature = input.temperature ?? 0.3;
    const userContent = [
        { type: 'text', text: input.userText },
        ...(input.imageUrls || []).slice(0, 4).map((url) => ({
            type: 'image_url',
            image_url: { url: optimizeCloudinaryUrl(url), detail: 'high' },
        })),
    ];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 90_000);
    const post = async (includeTemperature) => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(openAiChatBody({
                model,
                system: input.system,
                userContent,
                temperature,
                includeTemperature,
            })),
        });
        const payload = (await response.json().catch(() => ({})));
        if (!response.ok) {
            fail(502, payload.error?.message || failMessage);
        }
        const raw = payload.choices?.[0]?.message?.content || '';
        if (!raw.trim())
            fail(502, failMessage);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            fail(502, failMessage);
        return parsed;
    };
    try {
        return await post(openAiSupportsCustomTemperature(model));
    }
    catch (error) {
        const message = error?.message || '';
        // Toujours retenter sans temperature si l’API la refuse (nouveaux modèles non listés).
        if (isTemperatureUnsupportedError(message)) {
            try {
                return await post(false);
            }
            catch (retryError) {
                if (retryError?.status)
                    throw retryError;
                fail(502, retryError?.message || failMessage);
            }
        }
        if (error?.status)
            throw error;
        fail(502, message || failMessage);
    }
    finally {
        clearTimeout(timer);
    }
}
