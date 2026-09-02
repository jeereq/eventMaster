"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAMILY_LABEL_FR = void 0;
exports.resolveNotificationHref = resolveNotificationHref;
exports.renderOperatorNotificationEmail = renderOperatorNotificationEmail;
exports.formatOperatorWhatsApp = formatOperatorWhatsApp;
exports.renderOperatorWhatsApp = renderOperatorWhatsApp;
exports.userWhatsAppNumber = userWhatsAppNumber;
const brandingUtils_1 = require("./brandingUtils");
const brandedMessaging_1 = require("./brandedMessaging");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MAX_WHATSAPP_CHARS = 900;
function resolveNotificationHref(metadata) {
    const raw = metadata?.href;
    if (typeof raw !== 'string' || !raw.trim())
        return null;
    const href = raw.trim();
    if (/^https?:\/\//i.test(href))
        return href;
    if (href.startsWith('/'))
        return `${FRONTEND_URL.replace(/\/$/, '')}${href}`;
    return `${FRONTEND_URL.replace(/\/$/, '')}/${href}`;
}
function messageToHtml(message) {
    const escaped = (0, brandingUtils_1.escapeHtml)(message).replace(/\n/g, '<br>');
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${escaped}</p>`;
}
function renderOperatorNotificationEmail(params) {
    const href = params.href || `${FRONTEND_URL}/dashboard/notifications`;
    const subject = `EventMaster — ${params.title}`.slice(0, 200);
    const text = [params.message, '', `Ouvrir : ${href}`, '', '— EventMaster'].join('\n');
    const html = (0, brandedMessaging_1.wrapBrandedEmail)({
        branding: brandingUtils_1.DEFAULT_TENANT_BRANDING,
        orgName: 'EventMaster',
        title: params.title,
        eyebrow: params.familyLabel || 'Notification',
        headerEmoji: '🔔',
        innerHtml: `${messageToHtml(params.message)}${params.extraHtml || ''}`,
        cta: { href, label: 'Ouvrir dans EventMaster' },
        footerNote: 'Vous pouvez modifier vos canaux (e-mail, WhatsApp, push) depuis Notifications.',
    });
    return { subject, text, html };
}
function formatOperatorWhatsApp(body) {
    return (0, brandedMessaging_1.wrapBrandedWhatsApp)(body.replace(/\n{3,}/g, '\n\n').trim(), 'EventMaster').slice(0, MAX_WHATSAPP_CHARS);
}
function renderOperatorWhatsApp(params) {
    const parts = [params.title.trim(), '', params.message.trim()];
    if (params.href)
        parts.push('', params.href);
    return formatOperatorWhatsApp(parts.join('\n'));
}
function userWhatsAppNumber(user) {
    const phone = user.phone?.trim();
    if (!phone)
        return null;
    if (phone.startsWith('+'))
        return phone;
    const cc = user.phoneCountryCode?.trim();
    if (cc) {
        const digits = phone.replace(/[^\d]/g, '').replace(/^0/, '');
        const ccDigits = cc.replace(/[^\d]/g, '');
        if (!digits)
            return null;
        return `+${ccDigits}${digits}`;
    }
    return phone;
}
exports.FAMILY_LABEL_FR = {
    billing: 'Facturation',
    commissions: 'Commissions',
    catalog: 'Catalogue',
    tasks: 'Tâches',
    account: 'Compte',
};
