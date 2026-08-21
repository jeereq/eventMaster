"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInquiryOperatorNotify = buildInquiryOperatorNotify;
const brandingUtils_1 = require("./brandingUtils");
const notificationTemplates_1 = require("./notificationTemplates");
function buildInquiryOperatorNotify(params) {
    const dateLabel = params.inquiry.eventDate
        ? params.inquiry.eventDate.toLocaleDateString('fr-FR')
        : null;
    const extraHtml = `
    <p style="margin:0 0 8px;"><strong>Nom :</strong> ${(0, brandingUtils_1.escapeHtml)(params.inquiry.fromName)}</p>
    <p style="margin:0 0 8px;"><strong>E-mail :</strong> <a href="mailto:${(0, brandingUtils_1.escapeHtml)(params.inquiry.fromEmail)}">${(0, brandingUtils_1.escapeHtml)(params.inquiry.fromEmail)}</a></p>
    ${params.inquiry.fromPhone ? `<p style="margin:0 0 8px;"><strong>Téléphone :</strong> ${(0, brandingUtils_1.escapeHtml)(params.inquiry.fromPhone)}</p>` : ''}
    ${dateLabel ? `<p style="margin:0 0 8px;"><strong>Date :</strong> ${(0, brandingUtils_1.escapeHtml)(dateLabel)}</p>` : ''}
    ${params.inquiry.guestCount ? `<p style="margin:0 0 8px;"><strong>Invités :</strong> ${params.inquiry.guestCount}</p>` : ''}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;white-space:pre-line;">${(0, brandingUtils_1.escapeHtml)(params.inquiry.message)}</div>
    <p style="margin:0;"><a href="${(0, brandingUtils_1.escapeHtml)(params.publicUrl)}">Voir la fiche publique</a></p>
  `;
    const rendered = (0, notificationTemplates_1.renderOperatorNotificationEmail)({
        title: `Devis — ${params.subjectTitle}`,
        message: `Nouvelle demande pour « ${params.subjectTitle} » (${params.ownerOrgName}).`,
        href: params.dashboardHref,
        extraHtml,
        familyLabel: 'Catalogue',
    });
    const text = [
        `Nouvelle demande pour « ${params.subjectTitle} » (${params.ownerOrgName}).`,
        '',
        `Nom : ${params.inquiry.fromName}`,
        `E-mail : ${params.inquiry.fromEmail}`,
        params.inquiry.fromPhone ? `Téléphone : ${params.inquiry.fromPhone}` : null,
        dateLabel ? `Date souhaitée : ${dateLabel}` : null,
        params.inquiry.guestCount ? `Invités estimés : ${params.inquiry.guestCount}` : null,
        '',
        params.inquiry.message,
        '',
        `Fiche : ${params.publicUrl}`,
        `Espace : ${params.dashboardHref}`,
    ]
        .filter(Boolean)
        .join('\n');
    const waLines = [
        `Nouvelle demande pour « ${params.subjectTitle} ».`,
        `De : ${params.inquiry.fromName} (${params.inquiry.fromEmail})`,
        params.inquiry.fromPhone ? `Tél. : ${params.inquiry.fromPhone}` : null,
        dateLabel ? `Date : ${dateLabel}` : null,
        params.inquiry.message.slice(0, 280),
        params.dashboardHref,
    ]
        .filter(Boolean)
        .join('\n');
    return {
        email: { ...rendered, text },
        whatsapp: waLines,
    };
}
