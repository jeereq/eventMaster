"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTemplateVariables = applyTemplateVariables;
exports.ensureDefaultGuestMessageTemplates = ensureDefaultGuestMessageTemplates;
exports.getGuestMessageTemplate = getGuestMessageTemplate;
exports.renderGuestMessage = renderGuestMessage;
exports.polishWhatsAppBody = polishWhatsAppBody;
const db_1 = require("../db");
const defaultGuestMessageTemplates_1 = require("../config/defaultGuestMessageTemplates");
function applyTemplateVariables(text, vars) {
    let result = text;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replaceAll(`{{${key}}}`, value ?? '');
    }
    return result.trim();
}
async function ensureDefaultGuestMessageTemplates() {
    for (const template of defaultGuestMessageTemplates_1.DEFAULT_GUEST_MESSAGE_TEMPLATES) {
        await db_1.prisma.guestMessageTemplate.upsert({
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
            update: {},
        });
    }
}
async function getGuestMessageTemplate(type) {
    await ensureDefaultGuestMessageTemplates();
    const fromDb = await db_1.prisma.guestMessageTemplate.findUnique({
        where: { type },
    });
    if (fromDb && fromDb.isActive) {
        return fromDb;
    }
    const fallback = defaultGuestMessageTemplates_1.DEFAULT_GUEST_MESSAGE_TEMPLATES.find((t) => t.type === type);
    if (!fallback) {
        throw new Error(`Modèle de message inconnu : ${type}`);
    }
    return fallback;
}
async function renderGuestMessage(type, vars, overrides) {
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
function polishWhatsAppBody(body) {
    return body
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
