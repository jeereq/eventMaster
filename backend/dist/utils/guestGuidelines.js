"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGuestGuidelines = normalizeGuestGuidelines;
exports.formatDressCodeText = formatDressCodeText;
exports.formatGuestGuidelinesBlock = formatGuestGuidelinesBlock;
exports.guestGuidelinesInvitationText = guestGuidelinesInvitationText;
exports.applyInvitationGuidelineVariables = applyInvitationGuidelineVariables;
const DRESS_CODE_PRESETS = {
    cocktail: { label: 'Cocktail chic', defaultText: 'Tenue cocktail chic — robe ou costume élégant.' },
    black_tie: { label: 'Black tie', defaultText: 'Black tie — smoking ou robe longue.' },
    white_tie: { label: 'White tie', defaultText: 'White tie — tenue très formelle.' },
    smart_casual: { label: 'Smart casual', defaultText: 'Smart casual — élégant mais confortable.' },
    traditional: { label: 'Traditionnel', defaultText: 'Tenue traditionnelle souhaitée.' },
    theme_color: { label: 'Couleurs imposées', defaultText: 'Merci de porter les couleurs indiquées.' },
    outdoor: { label: 'Extérieur / Jardin', defaultText: 'Événement en extérieur — chaussures confortables.' },
};
const RECOMMENDATION_LABELS = {
    perks: 'Avantages & extras',
    parking: 'Parking & accès',
    gifts: 'Cadeaux',
    cash_gift: 'Enveloppe / Cotisation',
    weather: 'Météo / Saison',
    schedule: 'Horaires clés',
    children: 'Enfants',
    photos: 'Photos & réseaux',
    transport: 'Transport',
    accessibility: 'Accessibilité',
    custom: 'Autre',
};
function parseImageUrls(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .filter((item) => typeof item === 'string' && /^https?:\/\//i.test(item.trim()))
        .map((item) => item.trim())
        .slice(0, 4);
}
function normalizeGuestGuidelines(raw) {
    if (!raw || typeof raw !== 'object') {
        return {
            dressCode: { enabled: false },
            recommendations: [],
            showOnRsvp: true,
            showOnInvitation: true,
        };
    }
    const g = raw;
    return {
        dressCode: {
            enabled: g.dressCode?.enabled ?? false,
            presetId: g.dressCode?.presetId,
            themeColor: g.dressCode?.themeColor,
            themeColorLabel: g.dressCode?.themeColorLabel,
            customText: g.dressCode?.customText,
            examples: g.dressCode?.examples ?? [],
            imageUrls: parseImageUrls(g.dressCode?.imageUrls),
        },
        recommendations: Array.isArray(g.recommendations)
            ? g.recommendations.map((r) => ({
                ...r,
                imageUrls: parseImageUrls(r.imageUrls),
            }))
            : [],
        additionalNotes: g.additionalNotes || '',
        showOnRsvp: g.showOnRsvp !== false,
        showOnInvitation: g.showOnInvitation !== false,
    };
}
function formatDressCodeText(guidelines) {
    const dc = guidelines.dressCode;
    if (!dc.enabled)
        return '';
    const parts = [];
    if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
        parts.push(DRESS_CODE_PRESETS[dc.presetId].label);
    }
    if (dc.presetId === 'theme_color' && dc.themeColorLabel) {
        parts.push(`Couleurs : ${dc.themeColorLabel}`);
    }
    if (dc.customText?.trim()) {
        parts.push(dc.customText.trim());
    }
    else if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
        parts.push(DRESS_CODE_PRESETS[dc.presetId].defaultText);
    }
    if (dc.examples?.length) {
        parts.push(`Exemples : ${dc.examples.join(', ')}`);
    }
    return parts.filter(Boolean).join(' · ');
}
function getDressCodeShortLabel(guidelines) {
    const dc = guidelines.dressCode;
    if (!dc.enabled)
        return '';
    if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
        return DRESS_CODE_PRESETS[dc.presetId].label;
    }
    return 'Tenue';
}
function formatRecommendationsText(guidelines) {
    return guidelines.recommendations
        .filter((r) => r.enabled && r.content.trim())
        .map((r) => {
        const label = r.title || RECOMMENDATION_LABELS[r.type] || r.type;
        return `• ${label} : ${r.content.trim()}`;
    })
        .join('\n');
}
function formatGuestGuidelinesBlock(guidelines) {
    if (!guidelines.showOnInvitation)
        return '';
    const parts = [];
    const dress = formatDressCodeText(guidelines);
    if (dress)
        parts.push(`Tenue : ${dress}`);
    const recs = formatRecommendationsText(guidelines);
    if (recs)
        parts.push(recs);
    if (guidelines.additionalNotes?.trim())
        parts.push(guidelines.additionalNotes.trim());
    return parts.join('\n\n');
}
/** Bloc infos invités prêt pour WhatsApp / e-mail, ou chaîne vide. */
function guestGuidelinesInvitationText(raw) {
    return formatGuestGuidelinesBlock(normalizeGuestGuidelines(raw));
}
function applyInvitationGuidelineVariables(text, guidelinesRaw) {
    const g = normalizeGuestGuidelines(guidelinesRaw);
    const dressCode = g.showOnInvitation ? formatDressCodeText(g) : '';
    const dressCodeShort = g.showOnInvitation ? getDressCodeShortLabel(g) : '';
    const recommendations = g.showOnInvitation ? formatRecommendationsText(g) : '';
    const guestNotes = g.showOnInvitation ? (g.additionalNotes?.trim() || '') : '';
    const guestGuidelines = g.showOnInvitation ? formatGuestGuidelinesBlock(g) : '';
    return text
        .replaceAll('{{dressCode}}', dressCode)
        .replaceAll('{{dressCodeShort}}', dressCodeShort)
        .replaceAll('{{recommendations}}', recommendations)
        .replaceAll('{{guestNotes}}', guestNotes)
        .replaceAll('{{guestGuidelines}}', guestGuidelines);
}
