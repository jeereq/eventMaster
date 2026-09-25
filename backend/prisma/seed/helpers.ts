import { ensureMandatoryRsvpFieldsOnContent } from '../../src/utils/mandatoryRsvpFields';

type TemplateElement = Record<string, unknown>;

export function buildTemplateContent(
  elements: TemplateElement[],
  global: Record<string, unknown> = {},
) {
  return ensureMandatoryRsvpFieldsOnContent({
    customDesign: true,
    elements,
    global: {
      bgType: 'pattern',
      bgColor: '#faf8f5',
      bgPattern: 'paper',
      frameType: 'double-border',
      fontTheme: 'classic',
      floralColor: '#b91c1c',
      floralType: 'roses',
      floralDensity: 35,
      canvasSizePreset: 'standard',
      canvasWidth: 480,
      canvasHeight: 720,
      landingCategory: 'private',
      ...global,
    },
  });
}

export { GLOBAL_CATALOG_TEMPLATES } from './invitationTemplates';
