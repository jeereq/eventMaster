"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeminiApiKey = getGeminiApiKey;
exports.requireGeminiApiKey = requireGeminiApiKey;
exports.getGeminiTextModel = getGeminiTextModel;
exports.parseGeminiJson = parseGeminiJson;
exports.loadGeminiInlineImage = loadGeminiInlineImage;
exports.requestGeminiJson = requestGeminiJson;
const GEMINI_TEXT_MODEL_DEFAULT = 'gemini-3.1-pro-preview';
const GEMINI_RETIRED_TEXT_MODELS = new Set([
    'gemini-2.5-pro',
    'gemini-2.5-pro-preview',
    'gemini-2.0-pro',
    'gemini-1.5-pro',
]);
const GEMINI_IMAGE_FETCH_MAX_BYTES = 8 * 1024 * 1024;
function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
function getGeminiApiKey() {
    const key = (process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        process.env.NANO_BANANA_API_KEY ||
        '').trim();
    return key || null;
}
function requireGeminiApiKey() {
    const key = getGeminiApiKey();
    if (!key) {
        fail(503, 'L’IA n’est pas configurée sur ce serveur (GEMINI_API_KEY manquante).');
    }
    return key;
}
function getGeminiTextModel() {
    const raw = (process.env.GEMINI_PLAN_MODEL ||
        process.env.GEMINI_TEXT_MODEL ||
        process.env.GEMINI_MODEL ||
        GEMINI_TEXT_MODEL_DEFAULT).trim();
    const model = raw.replace(/^models\//, '');
    if (!model || GEMINI_RETIRED_TEXT_MODELS.has(model))
        return GEMINI_TEXT_MODEL_DEFAULT;
    return model;
}
function parseGeminiJson(raw) {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = (fenced?.[1] || trimmed).trim();
    return JSON.parse(jsonText);
}
function parseDataImage(url) {
    const trimmed = url.trim();
    const match = trimmed.match(/^data:([^;,]+)(?:;[^,]+)*;base64,(.+)$/is);
    if (!match?.[1] || !match[2])
        return null;
    const rawMime = match[1].trim().toLowerCase();
    const mimeType = rawMime.startsWith('image/') ? rawMime : 'image/jpeg';
    const cleanBase64 = match[2].replace(/\s+/g, '');
    if (!cleanBase64)
        return null;
    return { mimeType, base64: cleanBase64 };
}
async function loadGeminiInlineImage(imageUrl, failMessage = 'Impossible de télécharger l’image pour l’analyse.') {
    const embedded = parseDataImage(imageUrl);
    if (embedded) {
        return { inline_data: { mime_type: embedded.mimeType, data: embedded.base64 } };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
        const response = await fetch(imageUrl, { signal: controller.signal });
        if (!response.ok)
            fail(502, failMessage);
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength < 80)
            fail(502, 'L’image est invalide ou trop petite.');
        if (buffer.byteLength > GEMINI_IMAGE_FETCH_MAX_BYTES) {
            fail(413, 'L’image est trop lourde pour Gemini (max 8 Mo).');
        }
        const header = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const mimeType = header.startsWith('image/') ? header : 'image/jpeg';
        return { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } };
    }
    finally {
        clearTimeout(timer);
    }
}
async function requestGeminiJson(input) {
    const key = requireGeminiApiKey();
    const model = getGeminiTextModel();
    const failMessage = input.failMessage || 'L’IA Gemini n’a pas renvoyé de JSON utilisable.';
    const parts = [{ text: input.userText }];
    const validImages = [];
    const imageUrls = (input.imageUrls || []).slice(0, 4);
    for (const url of imageUrls) {
        try {
            const img = await loadGeminiInlineImage(url);
            validImages.push(img);
        }
        catch (error) {
            console.warn('[geminiJson] skip image:', error?.message);
        }
    }
    if (imageUrls.length > 0 && validImages.length === 0) {
        fail(400, 'Impossible de charger l’image pour l’analyse IA. Vérifiez que le format est valide (JPEG, PNG, WebP) et réessayez.');
    }
    for (const img of validImages) {
        parts.unshift(img);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 90_000);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
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
        });
        const payload = (await response.json().catch(() => ({})));
        if (!response.ok) {
            fail(502, payload.error?.message || failMessage);
        }
        const raw = (payload.candidates?.[0]?.content?.parts || [])
            .map((part) => part.text || '')
            .join('')
            .trim();
        if (!raw)
            fail(502, failMessage);
        try {
            return parseGeminiJson(raw);
        }
        catch {
            fail(502, failMessage);
        }
    }
    catch (error) {
        if (error?.status)
            throw error;
        fail(502, error?.message || failMessage);
    }
    finally {
        clearTimeout(timer);
    }
}
