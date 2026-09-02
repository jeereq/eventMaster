"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGuestInvitationPdfFromPrintPage = buildGuestInvitationPdfFromPrintPage;
exports.buildGuestInvitationPdfWithFallback = buildGuestInvitationPdfWithFallback;
exports.closeGuestInvitationPdfBrowser = closeGuestInvitationPdfBrowser;
const puppeteer_1 = __importDefault(require("puppeteer"));
const invitationPdfService_1 = require("./invitationPdfService");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
let browserInstance = null;
async function getBrowser() {
    if (browserInstance?.connected)
        return browserInstance;
    browserInstance = await puppeteer_1.default.launch({
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
async function buildGuestInvitationPdfFromPrintPage(guestId) {
    const printUrl = `${FRONTEND_URL}/rsvp/${guestId}/print`;
    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        await page.setViewport({ width: 900, height: 1280, deviceScaleFactor: 2 });
        await page.goto(printUrl, { waitUntil: 'load', timeout: 120000 });
        await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 90000 });
        await page.waitForFunction(
        // Exécuté dans le navigateur (Puppeteer) — pas dans le runtime Node.
        `(() => {
        const plan = document.querySelector('[data-plan-capture]');
        if (!plan) return true;
        const state = plan.getAttribute('data-plan-capture');
        return state === 'ready' || state === 'skipped';
      })()`, { timeout: 90000 });
        await new Promise((r) => setTimeout(r, 800));
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
        return Buffer.from(pdf);
    }
    catch (error) {
        console.error('[Guest PDF] Échec génération via page print:', error);
        throw error;
    }
    finally {
        await page?.close().catch(() => undefined);
    }
}
async function buildGuestInvitationPdfWithFallback(guestId, fallbackInput) {
    try {
        return await buildGuestInvitationPdfFromPrintPage(guestId);
    }
    catch (error) {
        console.warn('[Guest PDF] Fallback PDFKit après échec Puppeteer:', error);
        return (0, invitationPdfService_1.buildSeatingInvitationPdf)(fallbackInput);
    }
}
async function closeGuestInvitationPdfBrowser() {
    if (browserInstance) {
        await browserInstance.close().catch(() => undefined);
        browserInstance = null;
    }
}
