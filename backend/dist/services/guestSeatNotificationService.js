"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyGuestTableAssignment = notifyGuestTableAssignment;
exports.notifyGuestSeatConfirmed = notifyGuestSeatConfirmed;
const notificationService_1 = require("./notificationService");
const seatingInvitationStorageService_1 = require("./seatingInvitationStorageService");
const guestIdentity_1 = require("../utils/guestIdentity");
const notificationChannels_1 = require("../utils/notificationChannels");
const guestGuidelines_1 = require("../utils/guestGuidelines");
const db_1 = require("../db");
const brandedMessaging_1 = require("../utils/brandedMessaging");
const brandingUtils_1 = require("../utils/brandingUtils");
const guestMessageCopy_1 = require("../utils/guestMessageCopy");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
function formatFrenchDate(date) {
    if (!date)
        return '';
    return new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function formatTableMatesList(mates) {
    if (mates.length === 0)
        return 'Aucun autre invité assigné pour le moment.';
    return mates.map((m) => `• ${m.firstName} ${m.lastName}`.trim()).join('\n');
}
function formatTableMatesInline(mates) {
    if (mates.length === 0)
        return '';
    return mates.map((m) => `${m.firstName} ${m.lastName}`.trim()).join(', ');
}
function applyPlacementVariables(text, vars, guestGuidelines) {
    let result = text
        .replaceAll('{{firstName}}', vars.firstName)
        .replaceAll('{{lastName}}', vars.lastName)
        .replaceAll('{{title}}', vars.title)
        .replaceAll('{{description}}', vars.description)
        .replaceAll('{{location}}', vars.location)
        .replaceAll('{{date}}', vars.date)
        .replaceAll('{{rsvpLink}}', vars.rsvpLink)
        .replaceAll('{{tableName}}', vars.tableName)
        .replaceAll('{{seatNumber}}', vars.seatNumber)
        .replaceAll('{{tableMates}}', vars.tableMates)
        .replaceAll('{{tableMatesInline}}', vars.tableMatesInline);
    return (0, guestGuidelines_1.applyInvitationGuidelineVariables)(result, guestGuidelines);
}
/** Notification lors de l'assignation au plan de table (canaux de l'invitation + PDF). */
async function notifyGuestTableAssignment(params) {
    const { guest, eventId, event, assignedSeat, tableMates, invitation, dressCode, delivery = 'full' } = params;
    const isAnnouncement = delivery === 'announcement';
    const channels = [];
    const errors = [];
    const eventMeta = await db_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { tenantId: true },
    });
    const orgBrand = await (0, brandedMessaging_1.loadOrgBrand)(eventMeta?.tenantId);
    const email = (0, guestIdentity_1.extractGuestEmail)(guest);
    const phone = (0, guestIdentity_1.extractGuestPhone)(guest);
    const rsvpUrl = `${FRONTEND_URL}/rsvp/${guest.id}`;
    const seatNumber = String(assignedSeat.seatIndex + 1);
    const formattedDate = formatFrenchDate(event.date);
    const tableMatesText = formatTableMatesList(tableMates);
    const tableMatesInline = formatTableMatesInline(tableMates);
    const vars = {
        firstName: guest.firstName || '',
        lastName: guest.lastName || '',
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        date: formattedDate,
        rsvpLink: rsvpUrl,
        tableName: assignedSeat.tableName,
        seatNumber,
        tableMates: tableMatesText,
        tableMatesInline,
    };
    const defaultSubject = isAnnouncement
        ? `Votre table — ${event.title}`
        : `Votre placement — ${event.title}`;
    const defaultBody = isAnnouncement
        ? [
            `Bonjour ${guest.firstName},`,
            '',
            `Votre placement pour « ${event.title} » vient d'être confirmé par l'organisateur.`,
            '',
            `Table : ${assignedSeat.tableName}`,
            `Siège : n°${seatNumber}`,
            '',
            tableMates.length > 0 ? 'Vous serez accompagné(e) de :' : 'Aucun autre invité n\'est encore assigné à votre table.',
            tableMatesText,
            '',
            formattedDate ? `Date : ${formattedDate}` : '',
            event.location ? `Lieu : ${event.location}` : '',
            '',
            `Consultez les détails sur votre portail : ${rsvpUrl}`,
            '',
            guestMessageCopy_1.GUEST_COPY.tableAnnouncement,
        ]
            .filter(Boolean)
            .join('\n')
        : [
            `Bonjour ${guest.firstName},`,
            '',
            `Votre place est confirmée pour « ${event.title} ».`,
            '',
            `Table : ${assignedSeat.tableName}`,
            `Siège : n°${seatNumber}`,
            '',
            'Vous serez accompagné(e) de :',
            tableMatesText,
            '',
            formattedDate ? `Date : ${formattedDate}` : '',
            event.location ? `Lieu : ${event.location}` : '',
            '',
            `Consultez votre invitation et plan de table : ${rsvpUrl}`,
            '',
            'Votre invitation PDF est jointe à cet e-mail.',
        ]
            .filter(Boolean)
            .join('\n');
    const subject = applyPlacementVariables(invitation?.subject?.trim() || defaultSubject, vars, event.guestGuidelines);
    const textBody = applyPlacementVariables(invitation?.body?.trim() || defaultBody, vars, event.guestGuidelines);
    let pdfBuffer = null;
    let storedPdfUrl = null;
    if (!isAnnouncement) {
        const storedPdf = await (0, seatingInvitationStorageService_1.generateAndStoreSeatingInvitationPdf)({
            guestId: guest.id,
            eventId,
            guest: { firstName: guest.firstName, lastName: guest.lastName },
            event,
            assignedSeat,
            tableMates,
            dressCode,
        });
        pdfBuffer = storedPdf.buffer;
        storedPdfUrl = storedPdf.url;
        if (!storedPdf.url) {
            errors.push('Cloudinary: PDF non stocké (configuration manquante ou erreur d\'upload).');
        }
    }
    const seatTint = orgBrand.branding.primary;
    const htmlBody = (0, brandedMessaging_1.wrapBrandedEmail)({
        branding: orgBrand.branding,
        orgName: orgBrand.orgName,
        title: isAnnouncement ? 'Votre table est assignée' : 'Votre placement est confirmé',
        eyebrow: event.title || 'Placement',
        headerEmoji: '🪑',
        innerHtml: `
      <p style="text-align:center;color:${seatTint};font-weight:700;margin:0 0 16px;">Bonjour ${(0, brandingUtils_1.escapeHtml)(guest.firstName || '')} !</p>
      ${isAnnouncement ? '' : `<div style="font-size:15px;line-height:1.7;color:#475569;margin-bottom:20px;white-space:pre-line;">${(0, brandingUtils_1.escapeHtml)(textBody.replace(rsvpUrl, '').trim())}</div>`}
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:8px 0 20px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:${seatTint};text-transform:uppercase;letter-spacing:0.05em;">Votre place</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#1e1b4b;">${(0, brandingUtils_1.escapeHtml)(assignedSeat.tableName)}</p>
        <p style="margin:8px 0 0;font-size:16px;color:${seatTint};">Siège n°${(0, brandingUtils_1.escapeHtml)(seatNumber)}</p>
      </div>
      <div style="background-color:#f8fafc;border-radius:12px;padding:16px;margin-bottom:8px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f172a;">${tableMates.length > 0 ? 'Vous serez accompagné(e) de :' : 'Votre table'}</p>
        <p style="margin:0;font-size:14px;color:#334155;white-space:pre-line;">${(0, brandingUtils_1.escapeHtml)(tableMatesText)}</p>
      </div>
      ${(0, brandedMessaging_1.brandedEventDetailsHtml)(orgBrand.branding, [
            { label: 'Date', value: formattedDate },
            { label: 'Lieu', value: event.location || '' },
        ])}
    `,
        cta: {
            href: rsvpUrl,
            label: isAnnouncement ? 'Voir mon portail RSVP' : 'Voir mon invitation',
        },
        footerNote: isAnnouncement
            ? guestMessageCopy_1.GUEST_COPY.tableAnnouncement
            : `Votre invitation PDF est jointe à cet e-mail${storedPdfUrl ? ' et disponible en ligne.' : '.'}`,
    });
    const whatsappBody = (0, brandedMessaging_1.wrapBrandedWhatsApp)((isAnnouncement
        ? [
            `Bonjour ${guest.firstName} 👋`,
            '',
            `Votre table pour *${event.title}* vient d'être assignée ✅`,
            '',
            `🪑 *${assignedSeat.tableName}* — Siège n°${seatNumber}`,
            tableMates.length > 0 ? '\n👥 *Vous serez avec :*' : '',
            ...tableMates.map((m) => `• ${m.firstName} ${m.lastName}`.trim()),
            tableMates.length === 0 ? '\n_Aucun autre invité assigné pour le moment._' : '',
            formattedDate ? `\n📅 ${formattedDate}` : '',
            event.location ? `\n📍 ${event.location}` : '',
            '',
            `🔗 Portail RSVP : ${rsvpUrl}`,
            '',
            `_${guestMessageCopy_1.GUEST_COPY.tableAnnouncement}_`,
            '',
            `— ${orgBrand.orgName}`,
        ]
        : [
            `Bonjour ${guest.firstName} 👋`,
            '',
            `Votre placement pour *${event.title}* est confirmé ✅`,
            '',
            `🪑 *${assignedSeat.tableName}* — Siège n°${seatNumber}`,
            tableMatesInline ? `\n👥 Avec : ${tableMatesInline}` : '',
            event.location ? `\n📍 ${event.location}` : '',
            formattedDate ? `\n📅 ${formattedDate}` : '',
            '',
            `📄 Invitation PDF : ${storedPdfUrl || 'voir pièce jointe'}`,
            `\n🔗 Plan de table : ${rsvpUrl}`,
            '',
            `— ${orgBrand.orgName}`,
        ])
        .filter((line) => line !== '')
        .join('\n'), orgBrand.orgName, { guidelinesBlock: (0, guestGuidelines_1.guestGuidelinesInvitationText)(event.guestGuidelines) });
    const channelsToSend = (0, notificationChannels_1.resolveDeliveryChannels)(invitation?.channel);
    const tasks = [];
    if (channelsToSend.includes('EMAIL') && email) {
        const attachments = pdfBuffer && !isAnnouncement
            ? [
                {
                    filename: `invitation-${guest.lastName || 'invite'}.pdf`,
                    content: pdfBuffer,
                    type: 'application/pdf',
                },
            ]
            : undefined;
        tasks.push((0, notificationService_1.sendRealEmail)(email, subject, textBody, htmlBody, attachments).then((r) => {
            if (r.success)
                channels.push(r.simulated ? 'email (simulation)' : 'email');
            else if (r.error)
                errors.push(`email: ${r.error}`);
        }));
    }
    else if (channelsToSend.includes('EMAIL') && !email) {
        errors.push('email: adresse e-mail invalide');
    }
    if (channelsToSend.includes('WHATSAPP') && phone) {
        tasks.push((0, notificationService_1.sendRealWhatsApp)(phone, whatsappBody).then(async (r) => {
            if (r.success) {
                channels.push(r.simulated ? 'WhatsApp (simulation)' : 'WhatsApp');
                if (!isAnnouncement && !r.simulated && storedPdfUrl) {
                    const docResult = await (0, notificationService_1.sendRealWhatsAppDocument)(phone, storedPdfUrl, `invitation-${guest.lastName || 'invite'}.pdf`, 'Votre invitation PDF');
                    if (!docResult.success && docResult.error) {
                        errors.push(`WhatsApp PDF: ${docResult.error}`);
                    }
                }
                if (!isAnnouncement &&
                    event.latitude != null &&
                    event.longitude != null &&
                    Number.isFinite(event.latitude) &&
                    Number.isFinite(event.longitude)) {
                    const locResult = await (0, notificationService_1.sendRealWhatsAppLocation)(phone, event.location || "Lieu de l'événement", event.latitude, event.longitude);
                    if (!locResult.success && locResult.error) {
                        errors.push(`WhatsApp localisation: ${locResult.error}`);
                    }
                }
            }
            else if (r.error) {
                errors.push(`WhatsApp: ${r.error}`);
            }
        }));
    }
    else if (channelsToSend.includes('WHATSAPP') && !phone) {
        errors.push('WhatsApp: numéro de téléphone manquant');
    }
    if (tasks.length === 0) {
        if (errors.length === 0) {
            errors.push('Aucun canal de livraison disponible pour cet invité.');
        }
        return { sent: false, channels, errors };
    }
    await Promise.all(tasks);
    return {
        sent: channels.length > 0,
        channels,
        errors,
    };
}
/** Notification protocole (siège vérifié sur place). */
async function notifyGuestSeatConfirmed(params) {
    return notifyGuestTableAssignment({
        guest: params.guest,
        eventId: params.eventId,
        event: params.event,
        assignedSeat: params.assignedSeat,
        tableMates: [],
        invitation: { channel: 'EMAIL_AND_WHATSAPP' },
    });
}
