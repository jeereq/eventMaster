"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpCode = generateOtpCode;
exports.hashOtpCode = hashOtpCode;
exports.verifyOtpCode = verifyOtpCode;
exports.getOtpExpiryDate = getOtpExpiryDate;
exports.isOtpExpired = isOtpExpired;
exports.canResendOtp = canResendOtp;
exports.sendRegistrationOtp = sendRegistrationOtp;
exports.maskEmail = maskEmail;
exports.maskPhone = maskPhone;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const notificationService_1 = require("./notificationService");
const brandedMessaging_1 = require("../utils/brandedMessaging");
const brandingUtils_1 = require("../utils/brandingUtils");
const platformSettingsService_1 = require("./platformSettingsService");
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
function generateOtpCode() {
    return crypto_1.default.randomInt(100000, 1000000).toString();
}
async function hashOtpCode(code) {
    return bcryptjs_1.default.hash(code, 10);
}
async function verifyOtpCode(code, hash) {
    if (!hash || !code)
        return false;
    return bcryptjs_1.default.compare(code, hash);
}
function getOtpExpiryDate() {
    return new Date(Date.now() + OTP_TTL_MS);
}
function isOtpExpired(expiresAt) {
    if (!expiresAt)
        return true;
    return expiresAt.getTime() < Date.now();
}
function canResendOtp(updatedAt, otpExpiresAt) {
    const lastSentApprox = otpExpiresAt
        ? new Date(otpExpiresAt.getTime() - OTP_TTL_MS)
        : updatedAt;
    return Date.now() - lastSentApprox.getTime() >= RESEND_COOLDOWN_MS;
}
async function sendRegistrationOtp(params) {
    const { name, email, phone, code, method, invitedToTeam, invitedByCommercial } = params;
    const expiryMinutes = OTP_TTL_MS / 60000;
    const loginHint = invitedToTeam || invitedByCommercial
        ? '\n\nUne fois le code validé, connectez-vous sur EventMaster avec votre e-mail et le mot de passe communiqué par votre interlocuteur.'
        : '';
    const inviteIntroWhatsapp = invitedByCommercial
        ? 'Votre commercial EventMaster a créé votre organisation et votre compte manager.\n\n'
        : invitedToTeam
            ? 'Votre organisation vous a ajouté sur *EventMaster*.\n\n'
            : '';
    if (method === 'WHATSAPP' && phone) {
        const body = `Bonjour *${name}*,\n\n${inviteIntroWhatsapp}Votre code de validation *EventMaster* est :\n\n🔐 *${code}*\n\nCe code expire dans ${expiryMinutes} minutes.\n\nNe partagez ce code avec personne.${loginHint}\n\nL'équipe EventMaster ✨`;
        await (0, notificationService_1.sendRealWhatsApp)(phone, body);
        return { sentVia: 'WHATSAPP' };
    }
    const subject = invitedByCommercial
        ? 'Activez votre compte manager EventMaster'
        : invitedToTeam
            ? 'Activez votre compte EventMaster (invitation équipe)'
            : 'Votre code de validation EventMaster';
    const intro = invitedByCommercial
        ? 'Votre commercial EventMaster a créé votre organisation et votre compte manager.'
        : invitedToTeam
            ? 'Votre organisation vous a créé un compte sur EventMaster.'
            : 'Utilisez le code ci-dessous pour activer votre compte EventMaster :';
    const text = `Bonjour ${name},\n\n${intro}\n\nVotre code de validation : ${code}\n\nCe code expire dans ${expiryMinutes} minutes.\n\nNe partagez ce code avec personne.${loginHint}\n\nL'équipe EventMaster`;
    const postCodeHint = invitedByCommercial
        ? '<p style="font-size: 0.875rem; color: #6b7280;">Après validation, connectez-vous avec votre e-mail et le mot de passe fourni par votre commercial.</p>'
        : invitedToTeam
            ? '<p style="font-size: 0.875rem; color: #6b7280;">Après validation, connectez-vous avec votre e-mail et le mot de passe fourni par votre organisation.</p>'
            : '';
    const htmlTitle = invitedByCommercial
        ? 'Votre organisation EventMaster'
        : invitedToTeam
            ? 'Invitation équipe EventMaster'
            : 'Validation de votre compte';
    const brand = (0, brandingUtils_1.getPlatformBrand)();
    const { platformName } = (0, platformSettingsService_1.getContactDestinations)();
    const tint = (0, brandingUtils_1.mixHexWithWhite)(brand.primary, 0.88);
    const html = (0, brandedMessaging_1.wrapBrandedEmail)({
        branding: brand,
        orgName: platformName,
        title: htmlTitle,
        eyebrow: 'Sécurité',
        headerEmoji: '🔐',
        innerHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Bonjour <strong>${(0, brandingUtils_1.escapeHtml)(name)}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${(0, brandingUtils_1.escapeHtml)(intro)}</p>
      <div style="text-align:center;margin:8px 0 20px;">
        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:${brand.primary};background:${tint};padding:16px 24px;border-radius:14px;display:inline-block;">${(0, brandingUtils_1.escapeHtml)(code)}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;text-align:center;">Ce code expire dans ${expiryMinutes} minutes.</p>
      ${postCodeHint}
    `,
        footerNote: 'Si vous n’attendiez pas ce message, ignorez-le.',
    });
    await (0, notificationService_1.sendRealEmail)(email, subject, text, html);
    return { sentVia: 'EMAIL' };
}
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain)
        return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}
function maskPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4)
        return phone;
    return `${phone.slice(0, 4)}${'*'.repeat(digits.length - 6)}${phone.slice(-2)}`;
}
