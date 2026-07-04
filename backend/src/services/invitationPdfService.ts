import PDFDocument from 'pdfkit';
import { normalizeInvoiceText } from '../utils/invoiceText';

export type SeatingInvitationPdfInput = {
  guestFirstName: string;
  guestLastName: string;
  eventTitle: string;
  eventDate?: Date | string | null;
  eventLocation?: string | null;
  eventDescription?: string | null;
  tableName?: string | null;
  seatNumber?: number | null;
  tableMates?: Array<{ firstName: string; lastName: string }>;
  rsvpUrl: string;
  dressCode?: string | null;
};

function formatFrenchDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildSeatingInvitationPdf(input: SeatingInvitationPdfInput): Promise<Buffer> {
  const {
    guestFirstName,
    guestLastName,
    eventTitle,
    eventDate,
    eventLocation,
    eventDescription,
    tableName,
    seatNumber,
    tableMates,
    rsvpUrl,
    dressCode,
  } = input;

  const guestName = normalizeInvoiceText(`${guestFirstName} ${guestLastName}`.trim());
  const title = normalizeInvoiceText(eventTitle);
  const location = eventLocation ? normalizeInvoiceText(eventLocation) : '';
  const description = eventDescription ? normalizeInvoiceText(eventDescription) : '';
  const table = tableName ? normalizeInvoiceText(tableName) : '';
  const formattedDate = eventDate ? normalizeInvoiceText(formatFrenchDate(eventDate)) : '';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#4f46e5').text('EventMaster', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#64748b').text('Invitation & placement', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text(title, { align: 'center' });
    doc.moveDown(0.8);

    doc.fontSize(12).font('Helvetica').fillColor('#334155').text(`Cher/Chere ${guestName},`, { align: 'left' });
    doc.moveDown(0.5);
    doc.text('Nous avons le plaisir de vous adresser votre invitation personnalisee.');
    doc.moveDown(1);

    if (formattedDate || location) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#4f46e5').text('Details de l\'evenement');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#334155');
      if (formattedDate) doc.text(`Date : ${formattedDate}`);
      if (location) doc.text(`Lieu : ${location}`);
      doc.moveDown(1);
    }

    if (table?.trim()) {
      doc.roundedRect(50, doc.y, 495, 90, 12).fill('#eef2ff');
      const boxY = doc.y + 18;
      doc.fillColor('#4338ca').fontSize(10).font('Helvetica-Bold').text('VOTRE PLACEMENT', 70, boxY, { width: 455, align: 'center' });
      doc.fillColor('#1e1b4b').fontSize(16).font('Helvetica-Bold').text(table, 70, boxY + 18, { width: 455, align: 'center' });
      if (seatNumber) {
        doc.fillColor('#4f46e5').fontSize(13).font('Helvetica').text(`Siege n°${seatNumber}`, 70, boxY + 42, { width: 455, align: 'center' });
      }
      doc.moveDown(5.5);
    }

    if (tableMates && tableMates.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Vous serez accompagne(e) de :');
      doc.moveDown(0.4);
      doc.fontSize(11).font('Helvetica').fillColor('#334155');
      for (const mate of tableMates) {
        doc.text(`  - ${normalizeInvoiceText(`${mate.firstName} ${mate.lastName}`.trim())}`);
      }
      doc.moveDown(0.8);
    }

    if (dressCode?.trim()) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Tenue vestimentaire');
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(normalizeInvoiceText(dressCode.trim()));
      doc.moveDown(0.8);
    }

    if (description) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Message');
      doc.fontSize(10).font('Helvetica').fillColor('#475569').text(description, { width: 495 });
      doc.moveDown(0.8);
    }

    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#4f46e5').text('Confirmez votre presence :');
    doc.fontSize(10).font('Helvetica').fillColor('#334155').text(rsvpUrl, { link: rsvpUrl, underline: true });
    doc.moveDown(2);

    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text(
      'Document genere par EventMaster. Merci de conserver cette invitation.',
      { align: 'center' },
    );

    doc.end();
  });
}
