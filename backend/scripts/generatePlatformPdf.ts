/**
 * Génère le PDF des fonctionnalités EventMaster (design plateforme).
 * Usage: npm run generate:platform-pdf
 */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const REPO_ROOT = path.resolve(__dirname, '../..');
const HTML_PATH = path.join(REPO_ROOT, 'docs/templates/plateforme-fonctionnalites.html');
const OUTPUT_PATH = path.join(REPO_ROOT, 'docs/EventMaster-Plateforme-Fonctionnalites.pdf');

async function main() {
  if (!fs.existsSync(HTML_PATH)) {
    console.error(`❌ Template introuvable : ${HTML_PATH}`);
    process.exit(1);
  }

  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  console.log('📄 Génération du PDF EventMaster…');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, pdf);

    const sizeKb = Math.round(pdf.length / 1024);
    console.log(`✅ PDF généré : ${OUTPUT_PATH}`);
    console.log(`   Taille : ${sizeKb} Ko · 8 pages A4`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Échec génération PDF:', err.message || err);
  process.exit(1);
});
