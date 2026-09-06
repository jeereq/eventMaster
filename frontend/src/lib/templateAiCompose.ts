import { api } from '@/lib/api';
import type { InvitationContextSource } from '@/lib/invitationContextSource';
import {
  applyServerAllowance,
  getOrCreateDeviceId,
  type AiAllowance,
} from '@/lib/aiTokens';
import {
  ensureMandatoryRsvpFieldsOnElements,
  type CanvasSizePreset,
  CANVAS_SIZE_PRESETS,
} from '@/lib/rsvpFormFields';
import type { TemplatePalette } from '@/lib/imagePalette';

export const AI_TEMPLATE_DRAFT_KEY = 'em_ai_template_draft';

export type TemplateAiComposeContent = {
  global?: Record<string, unknown>;
  elements?: unknown[];
};

export type TemplateAiComposeResult = {
  content: TemplateAiComposeContent;
  stage: {
    structureReady: boolean;
    backgroundReady: boolean;
    imageMode?: 'edit' | 'generate' | null;
  };
  historyId?: string | null;
  remaining?: number;
  allowance?: Partial<AiAllowance>;
};

export type AiTemplateDraft = {
  content: TemplateAiComposeContent;
  prompt?: string;
  savedAt: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire l’image.'));
    reader.readAsDataURL(file);
  });
}

/** Studio authentifié (feature customTemplates). */
export async function composeTemplateWithAi(input: {
  prompt: string;
  imageUrls: string[];
  generateBackground?: boolean;
  embedText?: boolean;
  contextSource?: InvitationContextSource;
}): Promise<TemplateAiComposeResult> {
  const deviceId = getOrCreateDeviceId();
  const data = await api.post('/templates/ai/compose', {
    deviceId,
    prompt: input.prompt,
    imageUrls: input.imageUrls,
    generateBackground: input.generateBackground !== false,
    embedText: Boolean(input.embedText),
    contextSource: input.contextSource || 'none',
  });
  if (data?.allowance) {
    applyServerAllowance(data.allowance);
  }
  return data as TemplateAiComposeResult;
}

/**
 * Landing /modeles — route publique (jetons device).
 * Envoie des data URLs pour éviter l’upload authentifié.
 */
export async function composeTemplateWithAiPublic(input: {
  prompt: string;
  files: File[];
  generateBackground?: boolean;
  embedText?: boolean;
  contextSource?: InvitationContextSource;
}): Promise<TemplateAiComposeResult> {
  const deviceId = getOrCreateDeviceId();
  const imageDataUrls: string[] = [];
  for (const file of input.files.slice(0, 4)) {
    imageDataUrls.push(await fileToDataUrl(file));
  }
  const data = await api.post('/public/templates/ai/compose', {
    deviceId,
    prompt: input.prompt,
    imageDataUrls,
    generateBackground: input.generateBackground !== false,
    embedText: Boolean(input.embedText),
    contextSource: input.contextSource || 'none',
  });
  if (data?.allowance) {
    applyServerAllowance(data.allowance);
  }
  return data as TemplateAiComposeResult;
}

export function saveAiTemplateDraft(content: TemplateAiComposeContent, prompt?: string) {
  if (typeof window === 'undefined') return;
  const draft: AiTemplateDraft = {
    content,
    prompt,
    savedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(AI_TEMPLATE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function loadAiTemplateDraft(): AiTemplateDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AI_TEMPLATE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiTemplateDraft;
    if (!parsed?.content) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function generatedImageUrlFromContent(content: TemplateAiComposeContent | null | undefined): string | null {
  const url = content?.global && typeof content.global === 'object'
    ? (content.global as Record<string, unknown>).bgImageUrl
    : null;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

/** Télécharge l’image générée (blob) ; ouvre un onglet si le navigateur bloque le fetch. */
export async function downloadAiGeneratedImage(
  url: string,
  filename = `invitation-ia-${new Date().toISOString().slice(0, 10)}.png`,
): Promise<void> {
  const src = url.trim();
  if (!src || typeof document === 'undefined') return;

  const trigger = (href: string, revoke?: boolean) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) {
      window.setTimeout(() => URL.revokeObjectURL(href), 2000);
    }
  };

  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error('download-fetch-failed');
    const blob = await res.blob();
    trigger(URL.createObjectURL(blob), true);
  } catch {
    try {
      trigger(src);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }
}

export function clearAiTemplateDraft() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AI_TEMPLATE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export type AiComposeEditorSetters = {
  setCanvasElements: (elements: any[]) => void;
  setBgType: (v: 'color' | 'image' | 'pattern') => void;
  setBgColor: (v: string) => void;
  setBgImageUrl: (v: string) => void;
  setBgPattern: (v: any) => void;
  setFrameType: (v: any) => void;
  setFontTheme: (v: string) => void;
  setFloralColor: (v: string) => void;
  setFloralType: (v: any) => void;
  setFloralDensity: (v: number) => void;
  setImportedPalette: (v: TemplatePalette | null) => void;
  setColorThemeId: (v: string) => void;
  setLayoutMode: (v: 'flow' | 'free') => void;
  setCanvasSizePreset: (v: CanvasSizePreset) => void;
  setCanvasWidth: (v: number) => void;
  setCanvasHeight: (v: number) => void;
  setSelectedElementId: (v: string | null) => void;
};

/** Applique le payload IA dans l’éditeur canvas (même esprit que l’import maquette). */
export function applyAiComposeToEditor(
  content: TemplateAiComposeContent,
  setters: AiComposeEditorSetters,
) {
  const global = content.global || {};
  const elements = ensureMandatoryRsvpFieldsOnElements(
    Array.isArray(content.elements) ? (content.elements as any[]) : [],
  );

  setters.setCanvasElements(elements);

  const bgType =
    global.bgType === 'image' || global.bgType === 'pattern' || global.bgType === 'color'
      ? global.bgType
      : 'color';
  setters.setBgType(bgType);
  setters.setBgColor(typeof global.bgColor === 'string' ? global.bgColor : '#faf8f5');
  setters.setBgImageUrl(typeof global.bgImageUrl === 'string' ? global.bgImageUrl : '');
  setters.setBgPattern(typeof global.bgPattern === 'string' ? global.bgPattern : 'paper');
  setters.setFrameType(typeof global.frameType === 'string' ? global.frameType : 'double-border');
  setters.setFontTheme(typeof global.fontTheme === 'string' ? global.fontTheme : 'classic');
  setters.setFloralColor(typeof global.floralColor === 'string' ? global.floralColor : '#b91c1c');
  setters.setFloralType(typeof global.floralType === 'string' ? global.floralType : 'roses');
  setters.setFloralDensity(
    typeof global.floralDensity === 'number' ? global.floralDensity : 40,
  );

  const palette =
    global.palette && typeof global.palette === 'object' && !Array.isArray(global.palette)
      ? (global.palette as TemplatePalette)
      : null;
  setters.setImportedPalette(palette);
  setters.setColorThemeId('');
  setters.setLayoutMode(global.layoutMode === 'free' ? 'free' : 'flow');

  const preset =
    typeof global.canvasSizePreset === 'string' ? global.canvasSizePreset : 'standard';
  const sizePreset = (preset in CANVAS_SIZE_PRESETS
    ? preset
    : 'standard') as CanvasSizePreset;
  setters.setCanvasSizePreset(sizePreset);
  const dims =
    sizePreset !== 'custom'
      ? CANVAS_SIZE_PRESETS[sizePreset as Exclude<CanvasSizePreset, 'custom'>]
      : null;
  setters.setCanvasWidth(
    typeof global.canvasWidth === 'number'
      ? global.canvasWidth
      : dims?.width || CANVAS_SIZE_PRESETS.standard.width,
  );
  setters.setCanvasHeight(
    typeof global.canvasHeight === 'number'
      ? global.canvasHeight
      : dims?.height || CANVAS_SIZE_PRESETS.standard.height,
  );
  setters.setSelectedElementId(null);
}
