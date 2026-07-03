/**
 * Migre les images base64 embarquées dans les modèles (Template.content) vers Cloudinary.
 *
 * Usage:
 *   npx ts-node scripts/migrateTemplateImagesToCloudinary.ts --dry-run
 *   npx ts-node scripts/migrateTemplateImagesToCloudinary.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { isCloudinaryConfigured, getTemplateUploadFolder } from '../src/config/cloudinaryConfig';
import { uploadDataUrl } from '../src/services/cloudinaryService';

const dryRun = process.argv.includes('--dry-run');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? undefined
    : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DATA_URL_PREFIX = 'data:image/';

function collectDataUrls(value: unknown, found: Set<string>): void {
  if (typeof value === 'string') {
    if (value.startsWith(DATA_URL_PREFIX)) {
      found.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectDataUrls(item, found));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectDataUrls(v, found));
  }
}

function replaceDataUrls(value: unknown, map: Map<string, string>): unknown {
  if (typeof value === 'string') {
    if (value.startsWith(DATA_URL_PREFIX) && map.has(value)) {
      return map.get(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceDataUrls(item, map));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = replaceDataUrls(v, map);
    }
    return out;
  }
  return value;
}

async function main() {
  if (!isCloudinaryConfigured()) {
    console.error('Cloudinary non configuré. Ajoutez CLOUDINARY_* dans backend/.env');
    process.exit(1);
  }

  console.log(dryRun ? '=== MODE DRY-RUN (aucune écriture) ===' : '=== MIGRATION BASE64 → CLOUDINARY ===');

  const templates = await prisma.template.findMany({
    select: { id: true, name: true, tenantId: true, content: true },
  });

  let templatesWithBase64 = 0;
  let totalImages = 0;
  let uploaded = 0;
  let updated = 0;

  for (const template of templates) {
    const dataUrls = new Set<string>();
    collectDataUrls(template.content, dataUrls);

    if (dataUrls.size === 0) continue;

    templatesWithBase64 += 1;
    totalImages += dataUrls.size;
    console.log(`\n📄 ${template.name} (${template.id}) — ${dataUrls.size} image(s) base64`);

    const urlMap = new Map<string, string>();
    const folder = getTemplateUploadFolder(template.tenantId);

    for (const dataUrl of dataUrls) {
      const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
      if (dryRun) {
        console.log(`   [dry-run] Upload ~${sizeKb} Ko → ${folder}/`);
        urlMap.set(dataUrl, `https://res.cloudinary.com/DRY-RUN/image/upload/v1/${folder}/placeholder`);
        continue;
      }

      try {
        const result = await uploadDataUrl(dataUrl, folder);
        urlMap.set(dataUrl, result.url);
        uploaded += 1;
        console.log(`   ✓ Upload OK (${sizeKb} Ko) → ${result.url.slice(0, 80)}…`);
      } catch (err: any) {
        console.error(`   ✗ Échec upload: ${err.message || err}`);
      }
    }

    if (dryRun) continue;

    const newContent = replaceDataUrls(template.content, urlMap);
    const replacedCount = [...urlMap.keys()].filter((k) => urlMap.get(k)?.includes('cloudinary')).length;

    if (replacedCount > 0) {
      await prisma.template.update({
        where: { id: template.id },
        data: { content: newContent as object },
      });
      updated += 1;
      console.log(`   → Modèle mis à jour (${replacedCount} URL(s) Cloudinary)`);
    }
  }

  console.log('\n--- Résumé ---');
  console.log(`Modèles analysés      : ${templates.length}`);
  console.log(`Modèles avec base64   : ${templatesWithBase64}`);
  console.log(`Images base64 trouvées: ${totalImages}`);
  if (!dryRun) {
    console.log(`Images uploadées      : ${uploaded}`);
    console.log(`Modèles mis à jour    : ${updated}`);
  } else {
    console.log('Relancez sans --dry-run pour appliquer la migration.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
