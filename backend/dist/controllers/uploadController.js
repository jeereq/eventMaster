"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadTemplateImage = uploadTemplateImage;
const cloudinaryConfig_1 = require("../config/cloudinaryConfig");
const cloudinaryService_1 = require("../services/cloudinaryService");
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
async function uploadTemplateImage(req, res) {
    try {
        if (!(0, cloudinaryConfig_1.isCloudinaryConfigured)()) {
            return res.status(503).json({
                error: 'Stockage Cloudinary non configuré sur le serveur.',
            });
        }
        const tenantId = req.user?.tenantId;
        const folder = (0, cloudinaryConfig_1.getTemplateUploadFolder)(tenantId);
        if (req.file) {
            if (!ALLOWED_MIME.has(req.file.mimetype)) {
                return res.status(400).json({ error: 'Format image non supporté (JPEG, PNG, WebP, GIF).' });
            }
            if (req.file.size > MAX_BYTES) {
                return res.status(400).json({ error: 'Image trop volumineuse (max 10 Mo).' });
            }
            const result = await (0, cloudinaryService_1.uploadImageBuffer)(req.file.buffer, folder, req.file.originalname);
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
            const result = await (0, cloudinaryService_1.uploadDataUrl)(dataUrl, folder);
            return res.json({
                url: result.url,
                publicId: result.publicId,
                width: result.width,
                height: result.height,
            });
        }
        return res.status(400).json({ error: 'Fichier image ou dataUrl requis.' });
    }
    catch (error) {
        console.error('Erreur upload Cloudinary:', error);
        return res.status(500).json({ error: error.message || 'Échec de l\'upload image.' });
    }
}
