"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatInvitationIdentityDate = formatInvitationIdentityDate;
exports.resolveInvitationIdentity = resolveInvitationIdentity;
exports.hasInvitationIdentity = hasInvitationIdentity;
exports.applyInvitationIdentityToContent = applyInvitationIdentityToContent;
function textOf(element) {
    if (!element || typeof element !== 'object')
        return '';
    const text = element.text;
    return typeof text === 'string' ? text : '';
}
function fontSizeOf(element) {
    if (!element || typeof element !== 'object')
        return 16;
    return parseInt(String(element.fontSize || '16'), 10) || 16;
}
function formatInvitationIdentityDate(value) {
    const raw = String(value || '').trim();
    if (!raw)
        return '';
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw))
        return raw;
    const parsed = new Date(`${raw.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime()))
        return raw;
    return parsed.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
function resolveInvitationIdentity(identity) {
    const title = String(identity.title || '').trim();
    const honorees = String(identity.honorees || '').trim() || title;
    return {
        title: title || honorees,
        honorees,
        date: formatInvitationIdentityDate(identity.date),
    };
}
function hasInvitationIdentity(identity) {
    return Boolean(String(identity.title || '').trim()
        || String(identity.honorees || '').trim()
        || String(identity.date || '').trim()
        || String(identity.description || '').trim());
}
function applyInvitationIdentityToContent(content, identity) {
    const resolved = resolveInvitationIdentity(identity);
    const source = content && typeof content === 'object' ? content : {};
    const elements = Array.isArray(source.elements) ? source.elements.map((el) => (el && typeof el === 'object' ? { ...el } : el)) : [];
    const explicitHonorees = String(identity.honorees || '').trim();
    const explicitTitle = String(identity.title || '').trim();
    const explicitDescription = String(identity.description || '').trim();
    const nextElements = elements.map((el) => {
        if (!el || typeof el !== 'object')
            return el;
        const row = el;
        if (typeof row.text !== 'string')
            return row;
        let text = row.text;
        if (explicitHonorees) {
            text = text.replaceAll('{{title}}', explicitHonorees).replaceAll('{{honorees}}', explicitHonorees);
        }
        if (resolved.title)
            text = text.replaceAll('{{eventTitle}}', resolved.title);
        if (resolved.date)
            text = text.replaceAll('{{date}}', resolved.date);
        if (explicitDescription) {
            text = text.replaceAll('{{location}}', explicitDescription).replaceAll('{{description}}', explicitDescription);
        }
        return { ...row, text };
    });
    const hasHonorees = Boolean(explicitHonorees) && nextElements.some((el) => {
        const txt = textOf(el);
        return txt.includes('{{title}}') || txt.includes('{{honorees}}') || txt.includes(explicitHonorees);
    });
    const hasDate = Boolean(resolved.date) && nextElements.some((el) => {
        const txt = textOf(el);
        return txt.includes('{{date}}') || txt.includes(resolved.date);
    });
    const hasDescription = Boolean(explicitDescription) && nextElements.some((el) => {
        const txt = textOf(el);
        return txt.includes('{{location}}') || txt.includes('{{description}}') || txt.includes(explicitDescription);
    });
    if (explicitHonorees && !hasHonorees) {
        const textEls = nextElements.filter((el) => el && typeof el === 'object' && el.type === 'text' && textOf(el));
        const main = [...textEls].sort((a, b) => fontSizeOf(b) - fontSizeOf(a))[0];
        if (main)
            main.text = explicitHonorees;
    }
    if (identity.applyTitleToCard && explicitTitle && explicitTitle !== explicitHonorees) {
        const kicker = nextElements.find((el) => {
            if (!el || typeof el !== 'object')
                return false;
            const row = el;
            const txt = textOf(el);
            if (!txt || txt === explicitHonorees || txt === resolved.date)
                return false;
            if (txt.includes('{{'))
                return false;
            const size = fontSizeOf(el);
            const tracking = String(row.letterSpacing || '');
            return size <= 16 && (Boolean(tracking) || txt === txt.toUpperCase());
        });
        if (kicker)
            kicker.text = explicitTitle;
    }
    if (resolved.date && !hasDate) {
        const dateEl = nextElements.find((el) => {
            const txt = textOf(el);
            return /\b(202\d|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|date)\b/i.test(txt);
        });
        if (dateEl) {
            dateEl.text = resolved.date;
        }
    }
    if (explicitDescription && !hasDescription) {
        const locEl = nextElements.find((el) => {
            const txt = textOf(el);
            if (txt === explicitHonorees || txt === resolved.date || txt === explicitTitle)
                return false;
            return /\b(salle|hôtel|hotel|palais|domaine|espace|salon|centre|kinshasa|lubumbashi|goma|avenue|boulevard|paris|lieu|adresse|villa|terrasse|rooftop)\b/i.test(txt);
        });
        if (locEl) {
            locEl.text = explicitDescription;
        }
    }
    const global = source.global && typeof source.global === 'object'
        ? { ...source.global }
        : {};
    return {
        ...source,
        global: {
            ...global,
            identity: {
                title: resolved.title,
                honorees: explicitHonorees,
                date: String(identity.date || '').trim(),
                description: explicitDescription,
            },
        },
        elements: nextElements,
    };
}
