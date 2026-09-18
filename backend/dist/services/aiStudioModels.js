"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_ROOM_PLAN_MODELS = exports.AVAILABLE_INVITATION_MODELS = exports.DEFAULT_AI_STUDIO_MODELS = void 0;
exports.isOpenAiStudioModel = isOpenAiStudioModel;
exports.sanitizeAiStudioModels = sanitizeAiStudioModels;
exports.DEFAULT_AI_STUDIO_MODELS = {
    invitationModel: 'gemini-3-pro-image',
    roomPlanModel: 'gemini-3.1-pro-preview',
};
exports.AVAILABLE_INVITATION_MODELS = [
    { id: 'gemini-3-pro-image', label: 'Gemini 3 Pro Image (Nano Banana Pro · Haute Fidélité 2K)', badge: '2K Pro', provider: 'google' },
    { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image (Nano Banana Flash · Rendu rapide)', badge: 'Ultra-rapide', provider: 'google' },
    { id: 'imagen-3.0-generate-002', label: 'Google Imagen 3.0 (Photoréaliste standard)', badge: 'Photoréaliste', provider: 'google' },
    { id: 'imagen-3.0-fast-generate-001', label: 'Google Imagen 3.0 Fast (Économique & rapide)', badge: 'Éco rapide', provider: 'google' },
    { id: 'gpt-6-astra', label: 'GPT-6 Astra (OpenAI · Agent image + raisonnement)', badge: 'OpenAI', provider: 'openai' },
    { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (OpenAI · Agent image + références)', badge: 'OpenAI', provider: 'openai' },
    { id: 'gpt-image-2', label: 'GPT Image 2 (OpenAI · Images API photoréaliste)', badge: 'OpenAI', provider: 'openai' },
];
exports.AVAILABLE_ROOM_PLAN_MODELS = [
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Raisonnement spatial & agencement coté)', badge: 'Spatial Pro', provider: 'google' },
    { id: 'gemini-3-flash', label: 'Gemini 3 Flash (Génération agile & rapide)', badge: 'Agile & Rapide', provider: 'google' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Haute précision textuelle)', badge: 'Précision', provider: 'google' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Standard stable)', badge: 'Stable', provider: 'google' },
    { id: 'gpt-6-astra', label: 'GPT-6 Astra (OpenAI · Raisonnement spatial avancé)', badge: 'OpenAI', provider: 'openai' },
    { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (OpenAI · Raisonnement spatial)', badge: 'OpenAI', provider: 'openai' },
    { id: 'gpt-4o', label: 'GPT-4o (OpenAI · Vision & plans de salle)', badge: 'OpenAI', provider: 'openai' },
];
function isOpenAiStudioModel(model) {
    const id = String(model || '').trim().toLowerCase();
    if (!id)
        return false;
    return id.startsWith('gpt-') || id.includes('openai') || id.includes('luna') || id.includes('astra');
}
function sanitizeAiStudioModels(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const validInv = exports.AVAILABLE_INVITATION_MODELS.map((m) => m.id);
    const validRoom = exports.AVAILABLE_ROOM_PLAN_MODELS.map((m) => m.id);
    const inv = typeof src.invitationModel === 'string' && validInv.includes(src.invitationModel)
        ? src.invitationModel
        : exports.DEFAULT_AI_STUDIO_MODELS.invitationModel;
    const room = typeof src.roomPlanModel === 'string' && validRoom.includes(src.roomPlanModel)
        ? src.roomPlanModel
        : exports.DEFAULT_AI_STUDIO_MODELS.roomPlanModel;
    return { invitationModel: inv, roomPlanModel: room };
}
