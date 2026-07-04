import puppeteer, { type Browser } from 'puppeteer';
import { buildSeatingInvitationPdf, type SeatingInvitationPdfInput } from './invitationPdfService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance;

  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  return browserInstance;
}

/** Génère un PDF à partir de la page d'invitation imprimable du portail invité. */
export async function buildGuestInvitationPdfFromPrintPage(guestId: string): Promise<Buffer> {
  const printUrl = `${FRONTEND_URL}/rsvp/${guestId}/print`;
  let page;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1280, deviceScaleFactor: 2 });
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 45000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    return Buffer.from(pdf);
  } catch (error) {
    console.error('[Guest PDF] Échec génération via page print:', error);
    throw error;
  } finally {
    await page?.close().catch(() => undefined);
  }
}

export async function buildGuestInvitationPdfWithFallback(
  guestId: string,
  fallbackInput: SeatingInvitationPdfInput,
): Promise<Buffer> {
  try {
    return await buildGuestInvitationPdfFromPrintPage(guestId);
  } catch (error) {
    console.warn('[Guest PDF] Fallback PDFKit après échec Puppeteer:', error);
    return buildSeatingInvitationPdf(fallbackInput);
  }
}

export async function closeGuestInvitationPdfBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => undefined);
    browserInstance = null;
  }
}
