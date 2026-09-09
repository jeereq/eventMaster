"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVITATION_CONTEXT_SOURCES = exports.ACCOUNT_KIND_LABEL = void 0;
exports.parseInvitationContextSource = parseInvitationContextSource;
exports.selectComposeContext = selectComposeContext;
exports.isPersistedUserId = isPersistedUserId;
exports.clipContextText = clipContextText;
exports.uniquePriorPrompts = uniquePriorPrompts;
exports.emptyComposeContext = emptyComposeContext;
exports.hasUsableComposeContext = hasUsableComposeContext;
exports.formatContextForVision = formatContextForVision;
exports.formatContextForImage = formatContextForImage;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
exports.ACCOUNT_KIND_LABEL = {
    ORGANIZER: 'organisateur d’événements',
    VENDOR: 'salle / prestataire',
    BOTH: 'organisateur et prestataire',
    CLIENT: 'hôte / client',
};
const EVENT_KIND_LABEL = {
    WEDDING: 'mariage',
    BIRTHDAY: 'anniversaire',
    BAPTISM: 'baptême',
    CORPORATE: 'entreprise',
    CONFERENCE: 'conférence',
    GALA: 'gala',
    OTHER: 'autre',
};
const EVENT_KIND_LABEL_EN = {
    WEDDING: 'wedding',
    BIRTHDAY: 'birthday',
    BAPTISM: 'baptism',
    CORPORATE: 'corporate',
    CONFERENCE: 'conference',
    GALA: 'gala',
    OTHER: 'other',
};
exports.INVITATION_CONTEXT_SOURCES = ['none', 'org', 'history'];
function parseInvitationContextSource(raw) {
    return raw === 'org' || raw === 'history' || raw === 'none' ? raw : 'none';
}
function selectComposeContext(context, source) {
    if (source === 'none')
        return emptyComposeContext();
    if (source === 'org') {
        return { ...context, recentPrompts: [] };
    }
    return {
        ...emptyComposeContext(),
        recentPrompts: context.recentPrompts,
    };
}
function isPersistedUserId(value) {
    return Boolean(value && UUID_RE.test(value.trim()));
}
function clipContextText(value, max) {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= max)
        return trimmed;
    return `${trimmed.slice(0, max - 1).trim()}…`;
}
function uniquePriorPrompts(prompts, currentPrompt, max = 5) {
    const current = currentPrompt.replace(/\s+/g, ' ').trim().toLowerCase();
    const seen = new Set();
    const out = [];
    for (const raw of prompts) {
        const next = clipContextText(raw, 120);
        const key = next.toLowerCase();
        if (!next || key === current || seen.has(key))
            continue;
        seen.add(key);
        out.push(next);
        if (out.length >= max)
            break;
    }
    return out;
}
function emptyComposeContext() {
    return {
        organizerName: null,
        organizationName: null,
        accountKind: null,
        accountKindLabel: null,
        vendorCity: null,
        recentEvents: [],
        recentPrompts: [],
    };
}
function hasUsableComposeContext(context) {
    return Boolean(context.organizerName ||
        context.organizationName ||
        context.recentEvents.length ||
        context.recentPrompts.length);
}
function visionHeading(source) {
    if (source === 'history') {
        return 'CONTEXTE HISTORIQUE DE RECHERCHES (briefs déjà demandés — décor seulement, JAMAIS un visage) :';
    }
    if (source === 'org') {
        return 'CONTEXTE ORGANISATION (nom, type de compte, événements — décor seulement, JAMAIS un visage) :';
    }
    return 'CONTEXTE PERSONNE CONNECTÉE / REQUÊTES (décor, langue, type d’événement, noms — JAMAIS un visage) :';
}
function imageHeading(source) {
    if (source === 'history') {
        return 'REQUEST HISTORY CONTEXT (prior invitation briefs — décor taste only, NEVER invent a face):';
    }
    if (source === 'org') {
        return 'ORGANIZATION CONTEXT (org name, account kind, recent events — décor only, NEVER invent a face):';
    }
    return 'ORGANIZER / REQUEST CONTEXT (décor, event type, names for typography — NEVER invent a face from this):';
}
/** Bloc FR pour l’analyse structurelle (brief + besoins). */
function formatContextForVision(context, source = 'none') {
    if (!hasUsableComposeContext(context))
        return '';
    const lines = [visionHeading(source)];
    if (context.organizerName)
        lines.push(`- Organisateur : ${context.organizerName}`);
    if (context.organizationName) {
        const kind = context.accountKindLabel ? ` (${context.accountKindLabel})` : '';
        const city = context.vendorCity ? `, ${context.vendorCity}` : '';
        lines.push(`- Organisation : ${context.organizationName}${kind}${city}`);
    }
    if (context.recentEvents.length) {
        const events = context.recentEvents
            .map((event) => {
            const kind = EVENT_KIND_LABEL[event.kind] || event.kind || 'événement';
            const who = event.clientName ? ` — ${event.clientName}` : '';
            const where = event.location ? `, ${event.location}` : '';
            return `${event.title} (${kind}${where}${event.date ? `, ${event.date}` : ''})${who}`;
        })
            .join(' ; ');
        lines.push(`- Événements récents : ${events}`);
    }
    if (context.recentPrompts.length) {
        lines.push(`- Briefs d’invitation déjà demandés : ${context.recentPrompts.join(' | ')}`);
    }
    lines.push('Utilise ce contexte seulement si le brief actuel est incomplet (type d’événement, noms/date/lieu, goût décoratif). N’invente aucun visage à partir du nom, de l’avatar ou de l’organisation.');
    return lines.join('\n');
}
/** Bloc EN pour Nano Banana / image models (contexte + intention, reco Gemini). */
function formatContextForImage(context, source = 'none') {
    if (!hasUsableComposeContext(context))
        return '';
    const bits = [];
    if (context.organizerName)
        bits.push(`organizer ${context.organizerName}`);
    if (context.organizationName) {
        const kind = context.accountKind ? ` (${context.accountKind})` : '';
        bits.push(`organization ${context.organizationName}${kind}`);
    }
    if (context.vendorCity)
        bits.push(`city ${context.vendorCity}`);
    if (context.recentEvents.length) {
        const events = context.recentEvents
            .map((event) => {
            const kind = EVENT_KIND_LABEL_EN[event.kind] || event.kind || 'event';
            return `${event.title} (${kind}${event.location ? `, ${event.location}` : ''})`;
        })
            .join('; ');
        bits.push(`recent events: ${events}`);
    }
    if (context.recentPrompts.length) {
        bits.push(`prior invitation briefs: ${context.recentPrompts.join(' | ')}`);
    }
    return [
        imageHeading(source),
        bits.join('. '),
        'If the current brief is thin, reuse the usual event kind and décor taste. Do not portrait the organizer unless their photo is attached.',
    ].join('\n');
}
