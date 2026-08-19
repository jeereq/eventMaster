import PDFDocument from 'pdfkit';
import { normalizeInvoiceText } from '../utils/invoiceText';
import type { TablePlanPdfRow } from '../utils/tablePlanPdfSummary';
import { generateQrPngBuffer } from '../utils/qrCode';
import { mixHexWithWhite, resolveBranding, type ResolvedBranding } from '../utils/brandingUtils';

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
  orgName?: string | null;
  branding?: ResolvedBranding | null;
};

const PAGE_BG = '#f8fafc';
const CARD_BG = '#ffffff';
const CARD_BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const MUTED = '#64748b';
const BODY = '#334155';
const MARGIN = 40;
const CARD_RADIUS = 16;
const CARD_PAD = 18;
const GAP = 14;

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

async function buildQrPng(rsvpUrl: string): Promise<Buffer | null> {
  try {
    return await generateQrPngBuffer(rsvpUrl, { size: 200 });
  } catch {
    return null;
  }
}

function fillPageBackground(doc: PDFKit.PDFDocument) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PAGE_BG);
  doc.restore();
}

function measureLines(
  doc: PDFKit.PDFDocument,
  lines: Array<{ text: string; font: string; size: number }>,
  width: number,
): number {
  return lines.reduce((sum, line) => {
    doc.font(line.font).fontSize(line.size);
    return sum + doc.heightOfString(line.text, { width }) + 6;
  }, 0);
}

function drawCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = CARD_BG,
  stroke = CARD_BORDER,
) {
  doc.save();
  doc.roundedRect(x, y, w, h, CARD_RADIUS).fill(fill);
  doc.roundedRect(x, y, w, h, CARD_RADIUS).lineWidth(0.8).strokeColor(stroke).stroke();
  doc.restore();
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
    orgName,
    branding: brandingInput,
  } = input;

  const branding = resolveBranding(brandingInput);
  const brandName = (orgName || '').trim() || 'Organisation';
  const tint = mixHexWithWhite(branding.primary, 0.9);
  const tintBorder = mixHexWithWhite(branding.primary, 0.72);

  const qrBuffer = includeQrCode ? await buildQrPng(rsvpUrl) : null;

  const guestFullName = normalizeInvoiceText(`${guestFirstName} ${guestLastName}`.trim());
  const firstName = normalizeInvoiceText(guestFirstName.trim() || guestFullName);
  const title = normalizeInvoiceText(eventTitle);
  const location = eventLocation ? normalizeInvoiceText(eventLocation) : '';
  const description = eventDescription ? normalizeInvoiceText(eventDescription) : '';
  const table = tableName ? normalizeInvoiceText(tableName) : '';
  const formattedDate = eventDate ? normalizeInvoiceText(formatFrenchDate(eventDate)) : '';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const contentW = pageW - MARGIN * 2;
    const innerW = contentW - CARD_PAD * 2;

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    fillPageBackground(doc);

    const headerH = 96;
    const grad = doc.linearGradient(0, 0, pageW, 0);
    grad.stop(0, branding.primary).stop(1, branding.accent);
    doc.save();
    doc.rect(0, 0, pageW, headerH).fill(grad);
    doc.restore();

    doc.fillColor('#ffffff').font('Helvetica').fontSize(10);
    doc.text(brandName.toUpperCase(), MARGIN, 28, {
      width: contentW,
      align: 'center',
      characterSpacing: 1.4,
    });
    doc.font('Helvetica-Bold').fontSize(22).text('Votre invitation', MARGIN, 48, {
      width: contentW,
      align: 'center',
    });

    let y = headerH + 24;

    const ensureSpace = (needed: number) => {
      if (y + needed < pageH - 56) return;
      doc.addPage();
      fillPageBackground(doc);
      y = MARGIN;
    };

    const greetingLines = [
      { text: title, font: 'Helvetica-Bold', size: 16, color: TEXT },
      { text: `Bonjour ${firstName},`, font: 'Helvetica-Bold', size: 13, color: TEXT },
      {
        text: 'Voici votre invitation, avec votre place si elle est déjà attribuée. Conservez ce document pour le jour J.',
        font: 'Helvetica',
        size: 11,
        color: BODY,
      },
    ];
    if (description) {
      greetingLines.push({ text: description, font: 'Helvetica', size: 10, color: MUTED });
    }
    const greetingH = CARD_PAD * 2 + measureLines(
      doc,
      greetingLines.map(({ text, font, size }) => ({ text, font, size })),
      innerW,
    );
    ensureSpace(greetingH + GAP);
    drawCard(doc, MARGIN, y, contentW, greetingH);
    let cy = y + CARD_PAD;
    for (const line of greetingLines) {
      doc.font(line.font).fontSize(line.size).fillColor(line.color);
      const h = doc.heightOfString(line.text, { width: innerW });
      doc.text(line.text, MARGIN + CARD_PAD, cy, { width: innerW });
      cy += h + 6;
    }
    y += greetingH + GAP;

    if (formattedDate || location) {
      const detailLines: string[] = [];
      if (formattedDate) detailLines.push(`Date  ·  ${formattedDate}`);
      if (location) detailLines.push(`Lieu  ·  ${location}`);
      const detailsH = CARD_PAD * 2 + 16 + detailLines.length * 16;
      ensureSpace(detailsH + GAP);
      drawCard(doc, MARGIN, y, contentW, detailsH);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(branding.primary);
      doc.text('DÉTAILS', MARGIN + CARD_PAD, y + CARD_PAD, { width: innerW });
      let dy = y + CARD_PAD + 18;
      doc.font('Helvetica').fontSize(11).fillColor(BODY);
      for (const line of detailLines) {
        doc.text(line, MARGIN + CARD_PAD, dy, { width: innerW });
        dy += 16;
      }
      y += detailsH + GAP;
    }

    if (table?.trim()) {
      const placementH = 96;
      ensureSpace(placementH + GAP);
      drawCard(doc, MARGIN, y, contentW, placementH, tint, tintBorder);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(branding.primary);
      doc.text('VOTRE PLACE', MARGIN + CARD_PAD, y + 16, { width: innerW, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(20).fillColor(TEXT);
      doc.text(table, MARGIN + CARD_PAD, y + 34, { width: innerW, align: 'center' });
      if (seatNumber) {
        doc.font('Helvetica').fontSize(12).fillColor(branding.primary);
        doc.text(`Siège n°${seatNumber}`, MARGIN + CARD_PAD, y + 62, { width: innerW, align: 'center' });
      }
      y += placementH + GAP;
    }

    if (tableMates && tableMates.length > 0) {
      const mateLines = tableMates.map((mate) =>
        `•  ${normalizeInvoiceText(`${mate.firstName} ${mate.lastName}`.trim())}`,
      );
      const matesH = CARD_PAD * 2 + 18 + mateLines.length * 15;
      ensureSpace(matesH + GAP);
      drawCard(doc, MARGIN, y, contentW, matesH);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(branding.primary);
      doc.text('À VOTRE TABLE', MARGIN + CARD_PAD, y + CARD_PAD, { width: innerW });
      let my = y + CARD_PAD + 18;
      doc.font('Helvetica').fontSize(10).fillColor(BODY);
      for (const line of mateLines) {
        doc.text(line, MARGIN + CARD_PAD, my, { width: innerW });
        my += 15;
      }
      y += matesH + GAP;
    }

    if (tablePlanTables && tablePlanTables.length > 0) {
      const planH = CARD_PAD * 2 + 18 + tablePlanTables.length * 14;
      ensureSpace(planH + GAP);
      drawCard(doc, MARGIN, y, contentW, planH);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(branding.primary);
      doc.text('PLAN DE LA SALLE', MARGIN + CARD_PAD, y + CARD_PAD, { width: innerW });
      let py = y + CARD_PAD + 18;
      for (const row of tablePlanTables) {
        const label = `${row.name}  (${row.occupiedCount}/${row.capacity})${row.isGuestTable ? '  ← vous êtes ici' : ''}`;
        doc.font(row.isGuestTable ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fillColor(row.isGuestTable ? branding.primary : MUTED);
        doc.text(`•  ${normalizeInvoiceText(label)}`, MARGIN + CARD_PAD, py, { width: innerW });
        py += 14;
      }
      y += planH + GAP;
    }

    if (dressCode?.trim()) {
      const dressText = normalizeInvoiceText(dressCode.trim());
      doc.font('Helvetica').fontSize(10);
      const dressBodyH = doc.heightOfString(dressText, { width: innerW });
      const dressH = CARD_PAD * 2 + 18 + dressBodyH;
      ensureSpace(dressH + GAP);
      drawCard(doc, MARGIN, y, contentW, dressH);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(branding.primary);
      doc.text('TENUE', MARGIN + CARD_PAD, y + CARD_PAD, { width: innerW });
      doc.font('Helvetica').fontSize(10).fillColor(BODY);
      doc.text(dressText, MARGIN + CARD_PAD, y + CARD_PAD + 18, { width: innerW });
      y += dressH + GAP;
    }

    if (qrBuffer) {
      const qrSize = 118;
      const qrH = 210;
      ensureSpace(qrH + GAP);
      drawCard(doc, MARGIN, y, contentW, qrH);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(branding.primary);
      doc.text('BADGE QR', MARGIN + CARD_PAD, y + 16, { width: innerW, align: 'center' });
      const qrX = MARGIN + (contentW - qrSize) / 2;
      doc.image(qrBuffer, qrX, y + 36, { width: qrSize, height: qrSize });
      doc.font('Helvetica').fontSize(9).fillColor(MUTED);
      doc.text('Présentez ce code à l’entrée.', MARGIN + CARD_PAD, y + 36 + qrSize + 12, {
        width: innerW,
        align: 'center',
      });
      y += qrH + GAP;
    }

    const linkH = CARD_PAD * 2 + 36;
    ensureSpace(linkH + 40);
    drawCard(doc, MARGIN, y, contentW, linkH);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(branding.primary);
    doc.text('PORTAIL INVITÉ', MARGIN + CARD_PAD, y + CARD_PAD, { width: innerW });
    doc.font('Helvetica').fontSize(9).fillColor(BODY);
    doc.text(rsvpUrl, MARGIN + CARD_PAD, y + CARD_PAD + 16, {
      width: innerW,
      link: rsvpUrl,
      underline: true,
    });
    y += linkH + 20;

    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8');
    doc.text(
      `Pour ${guestFullName}  ·  Envoyé par ${brandName}`,
      MARGIN,
      Math.max(y, pageH - 36),
      {
      width: contentW,
      align: 'center',
    });

    doc.end();
  });
}
