"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicApiBaseUrl = getPublicApiBaseUrl;
exports.buildGuestQrImageUrl = buildGuestQrImageUrl;
exports.generateQrPngBuffer = generateQrPngBuffer;
const qrcode_1 = __importDefault(require("qrcode"));
const DEFAULT_COLOR = '#4f46e5';
const DEFAULT_BG = '#ffffff';
/** Base URL publique de l’API (QR WhatsApp / e-mail doivent être joignables). */
function getPublicApiBaseUrl() {
    const explicit = process.env.PUBLIC_API_URL ||
        process.env.API_PUBLIC_URL ||
        process.env.BACKEND_PUBLIC_URL;
    if (explicit?.trim()) {
        return explicit.replace(/\/$/, '').replace(/\/api$/, '') + '/api';
    }
    const port = process.env.PORT || '5001';
    return `http://localhost:${port}/api`;
}
function buildGuestQrImageUrl(guestId, size = 300) {
    const base = getPublicApiBaseUrl();
    return `${base}/rsvp/${guestId}/qr.png?size=${size}`;
}
async function generateQrPngBuffer(data, options) {
    const size = options?.size ?? 300;
    const color = options?.color ?? DEFAULT_COLOR;
    const background = options?.background ?? DEFAULT_BG;
    return qrcode_1.default.toBuffer(data, {
        type: 'png',
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
            dark: color,
            light: background,
        },
    });
}
