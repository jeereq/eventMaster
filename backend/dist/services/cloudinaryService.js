"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageBuffer = uploadImageBuffer;
exports.uploadPdfBuffer = uploadPdfBuffer;
exports.uploadVideoBuffer = uploadVideoBuffer;
exports.uploadDataUrl = uploadDataUrl;
const cloudinary_1 = require("cloudinary");
const cloudinaryConfig_1 = require("../config/cloudinaryConfig");
let configured = false;
function ensureConfigured() {
    if (!(0, cloudinaryConfig_1.isCloudinaryConfigured)()) {
        throw new Error('Cloudinary non configuré. Définissez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET.');
    }
    if (!configured) {
        cloudinary_1.v2.config((0, cloudinaryConfig_1.getCloudinaryConfig)());
        configured = true;
    }
}
function uniquePublicId(filename) {
    if (!filename)
        return undefined;
    const base = filename
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .replace(/[^\w]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return base ? `${base}-${stamp}` : stamp;
}
async function uploadImageBuffer(buffer, folder, filename) {
    ensureConfigured();
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'image',
            public_id: uniquePublicId(filename),
            overwrite: false,
        }, (error, result) => {
            if (error || !result) {
                reject(error || new Error('Échec upload Cloudinary'));
                return;
            }
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
            });
        });
        stream.end(buffer);
    });
}
async function uploadPdfBuffer(buffer, folder, publicId) {
    ensureConfigured();
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'raw',
            public_id: publicId,
            overwrite: true,
            format: 'pdf',
        }, (error, result) => {
            if (error || !result) {
                reject(error || new Error('Échec upload PDF Cloudinary'));
                return;
            }
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                bytes: result.bytes,
            });
        });
        stream.end(buffer);
    });
}
async function uploadVideoBuffer(buffer, folder, filename) {
    ensureConfigured();
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'video',
            public_id: uniquePublicId(filename),
            overwrite: false,
        }, (error, result) => {
            if (error || !result) {
                reject(error || new Error('Échec upload vidéo Cloudinary'));
                return;
            }
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
            });
        });
        stream.end(buffer);
    });
}
async function uploadDataUrl(dataUrl, folder) {
    ensureConfigured();
    const result = await cloudinary_1.v2.uploader.upload(dataUrl, {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
    };
}
