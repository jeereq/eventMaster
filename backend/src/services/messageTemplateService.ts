import { prisma } from '../db';
import {
  DEFAULT_GUEST_MESSAGE_TEMPLATES,
  type GuestMessageTemplateType,
} from '../config/defaultGuestMessageTemplates';

export function applyTemplateVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result.trim();
}

export async function ensureDefaultGuestMessageTemplates(): Promise<void> {
  const syncBodies = new Set([
    'INVITATION_WHATSAPP',
    'REMINDER_WHATSAPP',
    'RSVP_CONFIRMATION_WHATSAPP',
  ]);

  for (const template of DEFAULT_GUEST_MESSAGE_TEMPLATES) {
    await prisma.guestMessageTemplate.upsert({
      where: { type: template.type },
      create: {
        type: template.type,
        name: template.name,
        description: template.description,
        channel: template.channel,
        subject: template.subject || null,
        body: template.body,
        isActive: true,
      },
      update: syncBodies.has(template.type)
        ? {
            name: template.name,
            description: template.description,
            channel: template.channel,
            subject: template.subject || null,
            body: template.body,
            isActive: true,
          }
        : {},
    });
  }
}

export async function getGuestMessageTemplate(type: GuestMessageTemplateType | string) {
  await ensureDefaultGuestMessageTemplates();

  const fromDb = await prisma.guestMessageTemplate.findUnique({
    where: { type },
  });

  if (fromDb && fromDb.isActive) {
    return fromDb;
  }

  const fallback = DEFAULT_GUEST_MESSAGE_TEMPLATES.find((t) => t.type === type);
  if (!fallback) {
    throw new Error(`Modèle de message inconnu : ${type}`);
  }

  return fallback;
}

export async function renderGuestMessage(
  type: GuestMessageTemplateType | string,
  vars: Record<string, string>,
  overrides?: { subject?: string; body?: string }
) {
  const template = await getGuestMessageTemplate(type);
  const bodySource = overrides?.body?.trim() ? overrides.body : template.body;
  const subjectSource = overrides?.subject?.trim() ? overrides.subject : (template.subject || '');

  return {
    subject: applyTemplateVariables(subjectSource, vars),
    body: applyTemplateVariables(bodySource, vars),
    channel: template.channel,
    type: template.type,
    name: template.name,
  };
}

/** Enveloppe un corps personnalisé dans un format WhatsApp soigné si nécessaire. */
export function polishWhatsAppBody(body: string): string {
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
