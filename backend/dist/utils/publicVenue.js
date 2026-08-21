"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKETPLACE_MAX_VIDEOS = void 0;
exports.parsePriceUnit = parsePriceUnit;
exports.parseServiceCategory = parseServiceCategory;
exports.isServiceRentalCategory = isServiceRentalCategory;
exports.parseServiceGroup = parseServiceGroup;
exports.serviceGroupPrismaFilter = serviceGroupPrismaFilter;
exports.serviceCategoryLabel = serviceCategoryLabel;
exports.sanitizeLayoutBlueprint = sanitizeLayoutBlueprint;
exports.parsePhotoUrls = parsePhotoUrls;
exports.isVideoUrl = isVideoUrl;
exports.mediaPosterUrl = mediaPosterUrl;
exports.coverFromMedia = coverFromMedia;
exports.priceUnitLabel = priceUnitLabel;
const PRICE_UNITS = ['EVENT', 'DAY', 'HOUR', 'MINUTE', 'PERSON', 'QUOTA'];
function parsePriceUnit(value) {
    if (typeof value === 'string' && PRICE_UNITS.includes(value)) {
        return value;
    }
    return 'EVENT';
}
const SERVICE_CATEGORIES = [
    'CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION',
    'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'OTHER',
    'RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_CHILD',
    'RENTAL_CAR', 'RENTAL_MOTO', 'RENTAL_EQUIPMENT',
];
const RENTAL_CATEGORIES = [
    'RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_CHILD',
    'RENTAL_CAR', 'RENTAL_MOTO', 'RENTAL_EQUIPMENT',
];
function parseServiceCategory(value) {
    if (typeof value === 'string' && SERVICE_CATEGORIES.includes(value)) {
        return value;
    }
    return undefined;
}
function isServiceRentalCategory(category) {
    return Boolean(category && RENTAL_CATEGORIES.includes(category));
}
function parseServiceGroup(value) {
    return value === 'trade' || value === 'rental' ? value : null;
}
function serviceGroupPrismaFilter(group) {
    if (group === 'rental')
        return { category: { in: RENTAL_CATEGORIES } };
    if (group === 'trade')
        return { category: { notIn: RENTAL_CATEGORIES } };
    return {};
}
function serviceCategoryLabel(category) {
    const labels = {
        CATERING: 'Traiteur',
        PHOTOGRAPHY: 'Photographie',
        VIDEO: 'Vidéo',
        DJ: 'DJ / sonorisation',
        DECORATION: 'Décoration',
        SECURITY: 'Sécurité',
        FLORIST: 'Fleuriste',
        TRANSPORT: 'Transport',
        MC: 'Maître de cérémonie',
        OTHER: 'Autre prestation',
        RENTAL_CLOTHING_MEN: 'Location habits homme',
        RENTAL_CLOTHING_WOMEN: 'Location habits femme',
        RENTAL_CLOTHING_CHILD: 'Location habits enfant',
        RENTAL_CAR: 'Location voiture',
        RENTAL_MOTO: 'Location moto',
        RENTAL_EQUIPMENT: 'Location matériel',
    };
    return labels[category] || String(category);
}
function sanitizeLayoutBlueprint(blueprint) {
    if (!blueprint || typeof blueprint !== 'object')
        return null;
    let clone;
    try {
        clone = JSON.parse(JSON.stringify(blueprint));
    }
    catch {
        return null;
    }
    const strip = (node) => {
        if (!node || typeof node !== 'object')
            return;
        const rec = node;
        delete rec.guestId;
        delete rec.guest;
        delete rec.email;
        delete rec.firstName;
        delete rec.lastName;
        delete rec.assignedGuestId;
        if (Array.isArray(rec.seats)) {
            rec.seats = rec.seats.map((seat) => {
                if (!seat || typeof seat !== 'object')
                    return seat;
                const next = { ...seat };
                delete next.guestId;
                delete next.guest;
                delete next.email;
                delete next.firstName;
                delete next.lastName;
                next.occupied = false;
                return next;
            });
        }
        for (const value of Object.values(rec)) {
            if (Array.isArray(value))
                value.forEach(strip);
            else if (value && typeof value === 'object')
                strip(value);
        }
    };
    strip(clone);
    return clone;
}
function parsePhotoUrls(input) {
    if (!Array.isArray(input))
        return [];
    const urls = [];
    for (const item of input) {
        const url = typeof item === 'string' ? item : item && typeof item === 'object' && 'url' in item
            ? String(item.url || '')
            : '';
        if (!url || url.length > 1200)
            continue;
        if (!/^https?:\/\//i.test(url))
            continue;
        urls.push(url);
        if (urls.length >= 24)
            break;
    }
    return urls;
}
function isVideoUrl(url) {
    if (!url)
        return false;
    if (/\/video\/upload\//i.test(url))
        return true;
    return /\.(mp4|webm|mov|m4v|qt)(\?|#|$)/i.test(url);
}
function mediaPosterUrl(url) {
    if (!isVideoUrl(url))
        return url;
    if (/\/video\/upload\//i.test(url)) {
        const withTransform = /\/video\/upload\/[^/]*so_/i.test(url)
            ? url
            : url.replace('/video/upload/', '/video/upload/so_1,f_jpg/');
        return withTransform.replace(/\.(mp4|webm|mov|m4v|qt)(\?.*)?$/i, '.jpg$2');
    }
    return url;
}
function coverFromMedia(urls) {
    const image = urls.find((item) => !isVideoUrl(item));
    if (image)
        return image;
    return urls[0] ? mediaPosterUrl(urls[0]) : null;
}
exports.MARKETPLACE_MAX_VIDEOS = 8;
function priceUnitLabel(unit) {
    if (unit === 'DAY')
        return 'par jour';
    if (unit === 'HOUR')
        return 'par heure';
    if (unit === 'MINUTE')
        return 'par minute';
    if (unit === 'PERSON')
        return 'par personne';
    if (unit === 'QUOTA')
        return 'par quota d’invités';
    return 'par événement';
}
