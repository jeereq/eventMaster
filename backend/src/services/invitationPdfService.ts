import PDFDocument from 'pdfkit';
import { normalizeInvoiceText } from '../utils/invoiceText';
import type { TablePlanPdfRow } from '../utils/tablePlanPdfSummary';

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
  tablePlanTables?: TablePlanPdfRow[];
  includeQrCode?: boolean;
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

function buildQrCodeUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=4f-46e5&bgcolor=ffffff&qzone=2`;
}

async function fetchQrPng(rsvpUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(buildQrCodeUrl(rsvpUrl, 200));
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function buildSeatingInvitationPdf(input: SeatingInvitationPdfInput): Promise<Buffer> {
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
    tablePlanTables,
    includeQrCode = true,
  } = input;

  const qrBuffer = includeQrCode ? await fetchQrPng(rsvpUrl) : null;

  const guestName = normalizeInvoiceText(`${guestFirstName} ${guestLastName}`.trim());
  const title = normalizeInvoiceText(eventTitle);
  const location = eventLocation ? normalizeInvoiceText(eventLocation) : '';
  const description = eventDescription ? normalizeInvoiceText(eventDescription) : '';
  const table = tableName ? normalizeInvoiceText(tableName) : '';
  const formattedDate = eventDate ? normalizeInvoiceText(formatFrenchDate(eventDate)) : '';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    const pageW = doc.page.width - 100;

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Bandeau indigo/violet (aligné plateforme)
    const headerH = 68;
    const grad = doc.linearGradient(50, 0, 50 + pageW, 0);
    grad.stop(0, '#4f46e5').stop(1, '#7c3aed');
    doc.save();
    doc.rect(50, 40, pageW, headerH).fill(grad);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('EventMaster', 50, 52, {
      width: pageW,
      align: 'center',
    });
    doc.fontSize(9).font('Helvetica').fillColor('#e0e7ff').text('Invitation & placement', 50, 76, {
      width: pageW,
      align: 'center',
    });
    doc.restore();
    doc.y = 40 + headerH + 24;

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text(title, { align: 'center', width: pageW });
    doc.moveDown(0.6);

    doc.fontSize(12).font('Helvetica').fillColor('#334155').text(`Cher/Chère ${guestName},`, { align: 'left' });
    doc.moveDown(0.35);
    doc.fontSize(11).fillColor('#475569').text(
      'Nous avons le plaisir de vous adresser votre invitation personnalisée avec votre placement de table.',
    );
    doc.moveDown(1);

    if (formattedDate || location) {
      doc.roundedRect(50, doc.y, pageW, formattedDate && location ? 52 : 36, 10).fill('#f8fafc');
      const infoY = doc.y + 12;
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('DÉTAILS DE L\'ÉVÉNEMENT', 62, infoY);
      doc.fillColor('#334155').fontSize(10).font('Helvetica');
      let lineY = infoY + 14;
      if (formattedDate) {
        doc.text(`Date : ${formattedDate}`, 62, lineY, { width: pageW - 24 });
        lineY += 14;
      }
      if (location) doc.text(`Lieu : ${location}`, 62, lineY, { width: pageW - 24 });
      doc.y = infoY + (formattedDate && location ? 52 : 38);
      doc.moveDown(0.8);
    }

    if (table?.trim()) {
      const boxY = doc.y;
      doc.roundedRect(50, boxY, pageW, 88, 12).fill('#eef2ff');
      doc.fillColor('#4338ca').fontSize(9).font('Helvetica-Bold').text('VOTRE PLACEMENT', 62, boxY + 14, {
        width: pageW - 24,
        align: 'center',
      });
      doc.fillColor('#1e1b4b').fontSize(17).font('Helvetica-Bold').text(table, 62, boxY + 30, {
        width: pageW - 24,
        align: 'center',
      });
      if (seatNumber) {
        doc.fillColor('#4f46e5').fontSize(12).font('Helvetica').text(`Siège n°${seatNumber}`, 62, boxY + 54, {
          width: pageW - 24,
          align: 'center',
        });
      }
      doc.y = boxY + 96;
      doc.moveDown(0.5);
    }

    if (tableMates && tableMates.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('À votre table :');
      doc.moveDown(0.35);
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      for (const mate of tableMates) {
        doc.text(`  • ${normalizeInvoiceText(`${mate.firstName} ${mate.lastName}`.trim())}`);
      }
      doc.moveDown(0.6);
    }

    if (tablePlanTables && tablePlanTables.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Plan de la salle');
      doc.moveDown(0.35);
      for (const row of tablePlanTables) {
        const label = `${row.name}  (${row.occupiedCount}/${row.capacity} places)${row.isGuestTable ? '  ← votre table' : ''}`;
        if (row.isGuestTable) {
          doc.font('Helvetica-Bold').fillColor('#4f46e5');
        } else {
          doc.font('Helvetica').fillColor('#475569');
        }
        doc.fontSize(9).text(`  • ${normalizeInvoiceText(label)}`);
      }
      doc.moveDown(0.6);
    }

    if (dressCode?.trim()) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Tenue vestimentaire');
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(normalizeInvoiceText(dressCode.trim()));
      doc.moveDown(0.6);
    }

    if (description) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Message');
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(description, { width: pageW });
      doc.moveDown(0.6);
    }

    if (qrBuffer) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#4f46e5').text('Badge QR — confirmation de présence', {
        align: 'center',
        width: pageW,
      });
      doc.moveDown(0.4);
      const qrSize = 120;
      const qrX = 50 + (pageW - qrSize) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
      doc.y += qrSize + 8;
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
        'Présentez ce QR code à l\'entrée de l\'événement.',
        { align: 'center', width: pageW },
      );
      doc.moveDown(0.8);
    }

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#4f46e5').text('Portail invité :');
    doc.fontSize(9).font('Helvetica').fillColor('#334155').text(rsvpUrl, { link: rsvpUrl, underline: true, width: pageW });
    doc.moveDown(1.2);

    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(
      'Document généré par EventMaster — Merci de conserver cette invitation.',
      { align: 'center', width: pageW },
    );

    doc.end();
  });
}
