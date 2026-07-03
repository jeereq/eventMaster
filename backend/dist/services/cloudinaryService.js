"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageBuffer = uploadImageBuffer;
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
async function uploadImageBuffer(buffer, folder, filename) {
    ensureConfigured();
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'image',
            public_id: filename ? filename.replace(/\.[^.]+$/, '') : undefined,
            overwrite: true,
            transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
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
