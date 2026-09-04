import { api } from '@/lib/api';
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
  remaining?: number;
  allowance?: Partial<AiAllowance>;
};

export async function composeTemplateWithAi(input: {
  prompt: string;
  imageUrls: string[];
  generateBackground?: boolean;
}): Promise<TemplateAiComposeResult> {
  const deviceId = getOrCreateDeviceId();
  const data = await api.post('/templates/ai/compose', {
    deviceId,
    prompt: input.prompt,
    imageUrls: input.imageUrls,
    generateBackground: input.generateBackground !== false,
  });
  if (data?.allowance) {
    applyServerAllowance(data.allowance);
  }
  return data as TemplateAiComposeResult;
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
