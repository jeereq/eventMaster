"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndStoreGuestInvitationPdf = generateAndStoreGuestInvitationPdf;
exports.generateAndStoreSeatingInvitationPdf = generateAndStoreSeatingInvitationPdf;
exports.resolveGuestInvitationPdf = resolveGuestInvitationPdf;
const db_1 = require("../db");
const guestInvitationPdfService_1 = require("./guestInvitationPdfService");
const cloudinaryService_1 = require("./cloudinaryService");
const cloudinaryConfig_1 = require("../config/cloudinaryConfig");
const tablePlanPdfSummary_1 = require("../utils/tablePlanPdfSummary");
const brandedMessaging_1 = require("../utils/brandedMessaging");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
function buildFallbackInput(input, tablePlan, brand) {
    const summary = (0, tablePlanPdfSummary_1.extractTablePlanSummaryForPdf)(tablePlan, input.guestId);
    return {
        guestFirstName: input.guest.firstName,
        guestLastName: input.guest.lastName,
        eventTitle: input.event.title,
        eventDate: input.event.date,
        eventLocation: input.event.location,
        eventDescription: input.event.description,
        tableName: input.assignedSeat?.tableName ?? null,
        seatNumber: input.assignedSeat ? input.assignedSeat.seatIndex + 1 : null,
        tableMates: input.tableMates ?? [],
        rsvpUrl: `${FRONTEND_URL}/rsvp/${input.guestId}`,
        dressCode: input.dressCode,
        tablePlanTables: summary?.tables,
        includeQrCode: true,
        orgName: brand?.orgName,
        branding: brand?.branding,
    };
}
/** Génère le PDF (page print invité), l'envoie sur Cloudinary et enregistre l'URL sur l'invité. */
async function generateAndStoreGuestInvitationPdf(input) {
    const eventRecord = await db_1.prisma.event.findUnique({
        where: { id: input.eventId },
        select: { tablePlan: true, tenant: { select: { name: true, branding: true } } },
    });
    const brand = (0, brandedMessaging_1.orgBrandFromTenant)(eventRecord?.tenant);
    const buffer = await (0, guestInvitationPdfService_1.buildGuestInvitationPdfWithFallback)(input.guestId, buildFallbackInput(input, eventRecord?.tablePlan, brand));
    if (!(0, cloudinaryConfig_1.isCloudinaryConfigured)()) {
        console.warn('[Guest PDF] Cloudinary non configuré — PDF généré localement sans stockage distant.');
        return { url: null, publicId: null, buffer };
    }
    const folder = (0, cloudinaryConfig_1.getSeatingInvitationUploadFolder)(input.eventId, input.guestId);
    const publicId = 'invitation';
    try {
        const uploaded = await (0, cloudinaryService_1.uploadPdfBuffer)(buffer, folder, publicId);
        await db_1.prisma.guest.update({
            where: { id: input.guestId },
            data: {
                seatingInvitationPdfUrl: uploaded.url,
                seatingInvitationPdfPublicId: uploaded.publicId,
            },
        });
        return {
            url: uploaded.url,
            publicId: uploaded.publicId,
            buffer,
        };
    }
    catch (error) {
        console.error('[Guest PDF] Échec upload Cloudinary:', error);
        return { url: null, publicId: null, buffer };
    }
}
/** Alias pour la notification de placement à table. */
async function generateAndStoreSeatingInvitationPdf(input) {
    return generateAndStoreGuestInvitationPdf(input);
}
/** Retourne l'URL Cloudinary stockée ou régénère et stocke si absente. */
async function resolveGuestInvitationPdf(input, existingUrl) {
    if (existingUrl?.trim()) {
        return {
            url: existingUrl,
            publicId: null,
            buffer: Buffer.alloc(0),
        };
    }
    return generateAndStoreGuestInvitationPdf(input);
}
