import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getTemplateUploadFolder, isCloudinaryConfigured } from '../config/cloudinaryConfig';
import { uploadDataUrl, uploadImageBuffer } from '../services/cloudinaryService';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function uploadTemplateImage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: 'Stockage Cloudinary non configuré sur le serveur.',
      });
    }

    const tenantId = req.user?.tenantId;
    const folder = getTemplateUploadFolder(tenantId);

    if (req.file) {
      if (!ALLOWED_MIME.has(req.file.mimetype)) {
        return res.status(400).json({ error: 'Format image non supporté (JPEG, PNG, WebP, GIF).' });
      }
      if (req.file.size > MAX_BYTES) {
        return res.status(400).json({ error: 'Image trop volumineuse (max 10 Mo).' });
      }

      const result = await uploadImageBuffer(req.file.buffer, folder, req.file.originalname);
      return res.json({
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      });
    }

    const { dataUrl } = req.body ?? {};
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
      if (approxBytes > MAX_BYTES) {
        return res.status(400).json({ error: 'Image trop volumineuse (max 10 Mo).' });
      }

      const result = await uploadDataUrl(dataUrl, folder);
      return res.json({
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      });
    }

    return res.status(400).json({ error: 'Fichier image ou dataUrl requis.' });
  } catch (error: any) {
    console.error('Erreur upload Cloudinary:', error);
    return res.status(500).json({ error: error.message || 'Échec de l\'upload image.' });
  }
}
