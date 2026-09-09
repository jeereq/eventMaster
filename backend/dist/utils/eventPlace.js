"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEventPlace = formatEventPlace;
function formatEventPlace(parts) {
    const venue = String(parts.location || '').trim();
    const geo = [parts.neighborhood, parts.commune, parts.city]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .filter((part, index, list) => part.toLowerCase() !== list[index - 1]?.toLowerCase());
    const geoLine = geo.join(', ');
    if (venue && geoLine)
        return `${venue} — ${geoLine}`;
    return venue || geoLine;
}
