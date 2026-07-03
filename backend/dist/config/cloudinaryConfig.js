"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCloudinaryConfigured = isCloudinaryConfigured;
exports.getCloudinaryConfig = getCloudinaryConfig;
exports.getTemplateUploadFolder = getTemplateUploadFolder;
function isCloudinaryConfigured() {
    return Boolean(process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET);
}
function getCloudinaryConfig() {
    return {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
        api_key: process.env.CLOUDINARY_API_KEY || '',
        api_secret: process.env.CLOUDINARY_API_SECRET || '',
    };
}
function getTemplateUploadFolder(tenantId) {
    const scope = tenantId || 'global';
    return `eventmaster/templates/${scope}`;
}
