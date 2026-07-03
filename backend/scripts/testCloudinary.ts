/**
 * Vérifie la connexion Cloudinary (upload test minimal).
 * Usage: npx ts-node scripts/testCloudinary.ts
 */
import 'dotenv/config';
import { isCloudinaryConfigured } from '../src/config/cloudinaryConfig';
import { uploadDataUrl } from '../src/services/cloudinaryService';

async function main() {
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary non configuré (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)');
    process.exit(1);
  }

  // PNG 1x1 transparent
  const tinyPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  console.log('Upload test vers Cloudinary…');
  const result = await uploadDataUrl(tinyPng, 'eventmaster/_healthcheck');
  console.log('✅ Cloudinary OK');
  console.log(`   URL      : ${result.url}`);
  console.log(`   publicId : ${result.publicId}`);
}

main().catch((err) => {
  console.error('❌ Cloudinary échec:', err.message || err);
  process.exit(1);
});
