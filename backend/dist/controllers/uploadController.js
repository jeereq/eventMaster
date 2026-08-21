"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadTemplateImage = uploadTemplateImage;
exports.uploadMarketplaceMedia = uploadMarketplaceMedia;
exports.uploadAvatar = uploadAvatar;
const db_1 = require("../db");
const cloudinaryConfig_1 = require("../config/cloudinaryConfig");
const cloudinaryService_1 = require("../services/cloudinaryService");
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
]);
const ALLOWED_VIDEO_MIME = new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
    'video/3gpp',
]);
function isAllowedImageFile(file) {
    if (ALLOWED_IMAGE_MIME.has(file.mimetype))
        return true;
    return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.originalname || '');
}
function isAllowedVideoFile(file) {
    if (ALLOWED_VIDEO_MIME.has(file.mimetype) || file.mimetype.startsWith('video/')) {
        return /\.(mp4|webm|mov|m4v|3gp)$/i.test(file.originalname || '') || ALLOWED_VIDEO_MIME.has(file.mimetype);
    }
    return /\.(mp4|webm|mov|m4v)$/i.test(file.originalname || '');
}
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
            if (!isAllowedImageFile(req.file)) {
                return res.status(400).json({ error: 'Format image non supporté (JPEG, PNG, WebP, HEIC).' });
            }
            if (req.file.size > MAX_IMAGE_BYTES) {
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
            if (approxBytes > MAX_IMAGE_BYTES) {
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
async function uploadMarketplaceMedia(req, res) {
    try {
        if (!(0, cloudinaryConfig_1.isCloudinaryConfigured)()) {
            return res.status(503).json({
                error: 'Stockage Cloudinary non configuré sur le serveur.',
            });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Fichier photo ou vidéo requis.' });
        }
        const asVideo = isAllowedVideoFile(req.file);
        const asImage = isAllowedImageFile(req.file);
        if (!asVideo && !asImage) {
            return res.status(400).json({ error: 'Format non supporté. Photos : JPEG, PNG, WebP, HEIC. Vidéos : MP4, WebM, MOV.' });
        }
        if (asVideo) {
            if (req.file.size > MAX_VIDEO_BYTES) {
                return res.status(400).json({ error: 'Vidéo trop volumineuse (max 80 Mo).' });
            }
            const result = await (0, cloudinaryService_1.uploadVideoBuffer)(req.file.buffer, (0, cloudinaryConfig_1.getVenueMediaFolder)(req.user?.tenantId), req.file.originalname);
            return res.json({
                url: result.url,
                publicId: result.publicId,
                width: result.width,
                height: result.height,
                kind: 'video',
            });
        }
        if (req.file.size > MAX_IMAGE_BYTES) {
            return res.status(400).json({ error: 'Image trop volumineuse (max 10 Mo).' });
        }
        const result = await (0, cloudinaryService_1.uploadImageBuffer)(req.file.buffer, (0, cloudinaryConfig_1.getVenueMediaFolder)(req.user?.tenantId), req.file.originalname);
        return res.json({
            url: result.url,
            publicId: result.publicId,
            width: result.width,
            height: result.height,
            kind: 'image',
        });
    }
    catch (error) {
        console.error('Erreur upload média Cloudinary:', error);
        return res.status(500).json({ error: error.message || 'Échec de l\'upload.' });
    }
}
async function uploadAvatar(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        if (!(0, cloudinaryConfig_1.isCloudinaryConfigured)()) {
            return res.status(503).json({ error: 'Stockage Cloudinary non configuré sur le serveur.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Fichier image requis.' });
        }
        if (!isAllowedImageFile(req.file)) {
            return res.status(400).json({ error: 'Format image non supporté (JPEG, PNG, WebP, HEIC).' });
        }
        if (req.file.size > MAX_IMAGE_BYTES) {
            return res.status(400).json({ error: 'Image trop volumineuse (max 10 Mo).' });
        }
        const result = await (0, cloudinaryService_1.uploadImageBuffer)(req.file.buffer, (0, cloudinaryConfig_1.getAvatarUploadFolder)(req.user.id), req.file.originalname);
        const user = await db_1.prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl: result.url },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                phoneCountryCode: true,
                avatarUrl: true,
                role: true,
                orgRole: true,
            },
        });
        return res.json({
            url: result.url,
            publicId: result.publicId,
            user,
        });
    }
    catch (error) {
        console.error('Erreur upload avatar Cloudinary:', error);
        return res.status(500).json({ error: error.message || 'Échec de l\'upload de la photo.' });
    }
}
