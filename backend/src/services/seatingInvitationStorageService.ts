import { prisma } from '../db';
import { buildGuestInvitationPdfWithFallback } from './guestInvitationPdfService';
import { uploadPdfBuffer } from './cloudinaryService';
import {
  getSeatingInvitationUploadFolder,
  isCloudinaryConfigured,
} from '../config/cloudinaryConfig';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export type SeatingInvitationPdfInput = {
  guestId: string;
  eventId: string;
  guest: { firstName: string; lastName: string };
  event: {
    title: string;
    description?: string | null;
    date?: Date | string | null;
    location?: string | null;
  };
  assignedSeat: { tableName: string; seatIndex: number };
  tableMates: Array<{ firstName: string; lastName: string }>;
  dressCode?: string | null;
};

export type StoredSeatingInvitationPdf = {
  url: string | null;
  publicId: string | null;
  buffer: Buffer;
};

/** Génère le PDF, l'envoie sur Cloudinary et enregistre l'URL sur l'invité. */
export async function generateAndStoreSeatingInvitationPdf(
  input: SeatingInvitationPdfInput,
): Promise<StoredSeatingInvitationPdf> {
  const buffer = await buildGuestInvitationPdfWithFallback(input.guestId, {
    guestFirstName: input.guest.firstName,
    guestLastName: input.guest.lastName,
    eventTitle: input.event.title,
    eventDate: input.event.date,
    eventLocation: input.event.location,
    eventDescription: input.event.description,
    tableName: input.assignedSeat.tableName,
    seatNumber: input.assignedSeat.seatIndex + 1,
    tableMates: input.tableMates,
    rsvpUrl: `${FRONTEND_URL}/rsvp/${input.guestId}`,
    dressCode: input.dressCode,
  });

  if (!isCloudinaryConfigured()) {
    console.warn('[Seating PDF] Cloudinary non configuré — PDF généré localement sans stockage distant.');
    return { url: null, publicId: null, buffer };
  }

  const folder = getSeatingInvitationUploadFolder(input.eventId, input.guestId);
  const publicId = 'invitation';

  try {
    const uploaded = await uploadPdfBuffer(buffer, folder, publicId);

    await prisma.guest.update({
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
  } catch (error) {
    console.error('[Seating PDF] Échec upload Cloudinary:', error);
    return { url: null, publicId: null, buffer };
  }
}

/** Retourne l'URL Cloudinary stockée ou régénère et stocke si absente. */
export async function resolveSeatingInvitationPdf(
  input: SeatingInvitationPdfInput,
  existingUrl?: string | null,
): Promise<StoredSeatingInvitationPdf> {
  if (existingUrl?.trim()) {
    return {
      url: existingUrl,
      publicId: null,
      buffer: Buffer.alloc(0),
    };
  }
  return generateAndStoreSeatingInvitationPdf(input);
}
