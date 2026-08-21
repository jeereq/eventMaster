"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRateInput = parseRateInput;
exports.rateToPercent = rateToPercent;
/** Fraction 0–1. Si la valeur est > 1, elle est traitée comme un pourcentage (8 → 0.08). */
function parseRateInput(value, fallback, min = 0, max = 1) {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    if (!Number.isFinite(n))
        return fallback;
    const rate = n > 1 ? n / 100 : n;
    const clamped = Math.min(max, Math.max(min, rate));
    return Math.round(clamped * 10000) / 10000;
}
function rateToPercent(rate) {
    return Math.round(rate * 1000) / 10;
}
