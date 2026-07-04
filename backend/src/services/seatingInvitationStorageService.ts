import { prisma } from '../db';
import { buildGuestInvitationPdfWithFallback } from './guestInvitationPdfService';
import { uploadPdfBuffer } from './cloudinaryService';
import {
  getSeatingInvitationUploadFolder,
  isCloudinaryConfigured,
} from '../config/cloudinaryConfig';
import type { SeatingInvitationPdfInput } from './invitationPdfService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export type GuestInvitationPdfStoreInput = {
  guestId: string;
  eventId: string;
  guest: { firstName: string; lastName: string };
  event: {
    title: string;
    description?: string | null;
    date?: Date | string | null;
    location?: string | null;
  };
  assignedSeat?: { tableName: string; seatIndex: number } | null;
  tableMates?: Array<{ firstName: string; lastName: string }>;
  dressCode?: string | null;
};

export type StoredGuestInvitationPdf = {
  url: string | null;
  publicId: string | null;
  buffer: Buffer;
};

function buildFallbackInput(input: GuestInvitationPdfStoreInput): SeatingInvitationPdfInput {
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
  };
}

/** Génère le PDF (page print invité), l'envoie sur Cloudinary et enregistre l'URL sur l'invité. */
export async function generateAndStoreGuestInvitationPdf(
  input: GuestInvitationPdfStoreInput,
): Promise<StoredGuestInvitationPdf> {
  const buffer = await buildGuestInvitationPdfWithFallback(
    input.guestId,
    buildFallbackInput(input),
  );

  if (!isCloudinaryConfigured()) {
    console.warn('[Guest PDF] Cloudinary non configuré — PDF généré localement sans stockage distant.');
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
    console.error('[Guest PDF] Échec upload Cloudinary:', error);
    return { url: null, publicId: null, buffer };
  }
}

/** Alias pour la notification de placement à table. */
export async function generateAndStoreSeatingInvitationPdf(
  input: GuestInvitationPdfStoreInput & {
    assignedSeat: { tableName: string; seatIndex: number };
  },
): Promise<StoredGuestInvitationPdf> {
  return generateAndStoreGuestInvitationPdf(input);
}

/** Retourne l'URL Cloudinary stockée ou régénère et stocke si absente. */
export async function resolveGuestInvitationPdf(
  input: GuestInvitationPdfStoreInput,
  existingUrl?: string | null,
): Promise<StoredGuestInvitationPdf> {
  if (existingUrl?.trim()) {
    return {
      url: existingUrl,
      publicId: null,
      buffer: Buffer.alloc(0),
    };
  }
  return generateAndStoreGuestInvitationPdf(input);
}
