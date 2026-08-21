"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseListingDetails = parseListingDetails;
const AMENITY_IDS = new Set([
    'wifi', 'parking', 'ac', 'generator', 'sound', 'kitchen', 'stage', 'cloakroom',
    'accessible', 'garden', 'security', 'projector', 'toilets', 'lighting', 'bar',
    'gear', 'assistant', 'urgent', 'install', 'trial', 'makeup', 'backup',
    'sizes', 'fitting', 'delivery', 'driver', 'fuel', 'helmet', 'childSeat',
]);
const EVENT_IDS = new Set([
    'wedding', 'birthday', 'corporate', 'gala', 'religious', 'private', 'shooting',
]);
function clip(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function clipNum(value, max = 8) {
    return value != null && value !== '' ? String(value).slice(0, max) : '';
}
function parseListingDetails(input) {
    const raw = input && typeof input === 'object' && !Array.isArray(input)
        ? input
        : {};
    const amenities = Array.isArray(raw.amenities)
        ? raw.amenities.filter((id) => typeof id === 'string' && AMENITY_IDS.has(id))
        : [];
    const eventTypes = Array.isArray(raw.eventTypes)
        ? raw.eventTypes.filter((id) => typeof id === 'string' && EVENT_IDS.has(id))
        : [];
    return {
        description: clip(raw.description, 4000),
        amenities,
        eventTypes,
        contactPhone: clip(raw.contactPhone, 40),
        contactWhatsapp: clip(raw.contactWhatsapp, 40),
        included: clip(raw.included, 2000),
        parking: Boolean(raw.parking),
        languages: clip(raw.languages, 120),
        minNoticeHours: clipNum(raw.minNoticeHours),
        openingHours: clip(raw.openingHours, 16),
        closingHours: clip(raw.closingHours, 16),
        surfaceM2: clipNum(raw.surfaceM2),
        teamSize: clipNum(raw.teamSize),
        experienceYears: clipNum(raw.experienceYears),
        houseRules: clip(raw.houseRules, 2000),
        cancellation: clip(raw.cancellation, 2000),
        extraFees: clip(raw.extraFees, 2000),
        depositPercent: clipNum(raw.depositPercent),
        accessNotes: clip(raw.accessNotes, 1000),
        instagram: clip(raw.instagram, 80),
        brand: clip(raw.brand, 100),
        modelName: clip(raw.modelName, 100),
        year: clipNum(raw.year, 4),
        condition: clip(raw.condition, 50),
        colors: clip(raw.colors, 200),
        dimensions: clip(raw.dimensions, 200),
        capacity: clipNum(raw.capacity, 50),
        securityDepositFc: clipNum(raw.securityDepositFc, 20),
        deliveryMode: clip(raw.deliveryMode, 50),
        accessories: clip(raw.accessories, 1000),
        returnRules: clip(raw.returnRules, 1000),
    };
}
