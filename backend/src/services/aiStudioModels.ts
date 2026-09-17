export interface AiStudioModelsSettings {
  invitationModel: string;
  roomPlanModel: string;
}

export const DEFAULT_AI_STUDIO_MODELS: AiStudioModelsSettings = {
  invitationModel: 'gemini-3-pro-image',
  roomPlanModel: 'gemini-3.1-pro-preview',
};

export const AVAILABLE_INVITATION_MODELS = [
  { id: 'gemini-3-pro-image', label: 'Gemini 3 Pro Image (Nano Banana Pro · Haute Fidélité 2K)', badge: '2K Pro', provider: 'google' },
  { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image (Nano Banana Flash · Rendu rapide)', badge: 'Ultra-rapide', provider: 'google' },
  { id: 'imagen-3.0-generate-002', label: 'Google Imagen 3.0 (Photoréaliste standard)', badge: 'Photoréaliste', provider: 'google' },
  { id: 'imagen-3.0-fast-generate-001', label: 'Google Imagen 3.0 Fast (Économique & rapide)', badge: 'Éco rapide', provider: 'google' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (OpenAI · Agent image + références)', badge: 'OpenAI', provider: 'openai' },
  { id: 'gpt-image-2', label: 'GPT Image 2 (OpenAI · Images API photoréaliste)', badge: 'OpenAI', provider: 'openai' },
] as const;

export const AVAILABLE_ROOM_PLAN_MODELS = [
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Raisonnement spatial & agencement coté)', badge: 'Spatial Pro', provider: 'google' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash (Génération agile & rapide)', badge: 'Agile & Rapide', provider: 'google' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Haute précision textuelle)', badge: 'Précision', provider: 'google' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Standard stable)', badge: 'Stable', provider: 'google' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (OpenAI · Raisonnement spatial)', badge: 'OpenAI', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o (OpenAI · Vision & plans de salle)', badge: 'OpenAI', provider: 'openai' },
] as const;

export function isOpenAiStudioModel(model?: string | null): boolean {
  const id = String(model || '').trim().toLowerCase();
  if (!id) return false;
  return id.startsWith('gpt-') || id.includes('openai') || id.includes('luna');
}

export function sanitizeAiStudioModels(raw: unknown): AiStudioModelsSettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const validInv = AVAILABLE_INVITATION_MODELS.map((m) => m.id as string);
  const validRoom = AVAILABLE_ROOM_PLAN_MODELS.map((m) => m.id as string);

  const inv = typeof src.invitationModel === 'string' && validInv.includes(src.invitationModel)
    ? src.invitationModel
    : DEFAULT_AI_STUDIO_MODELS.invitationModel;

  const room = typeof src.roomPlanModel === 'string' && validRoom.includes(src.roomPlanModel)
    ? src.roomPlanModel
    : DEFAULT_AI_STUDIO_MODELS.roomPlanModel;

  return { invitationModel: inv, roomPlanModel: room };
}
