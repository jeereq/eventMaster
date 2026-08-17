import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig, isCloudinaryConfigured } from '../config/cloudinaryConfig';

let configured = false;

function ensureConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary non configuré. Définissez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET.',
    );
  }
  if (!configured) {
    cloudinary.config(getCloudinaryConfig());
    configured = true;
  }
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
}

function uniquePublicId(filename?: string): string | undefined {
  if (!filename) return undefined;
  const base = filename
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return base ? `${base}-${stamp}` : stamp;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string,
  filename?: string,
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: uniquePublicId(filename),
        overwrite: false,
      },
      (error, result) => {
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
      },
    );
    stream.end(buffer);
  });
}

export async function uploadPdfBuffer(
  buffer: Buffer,
  folder: string,
  publicId?: string,
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
        public_id: publicId,
        overwrite: true,
        format: 'pdf',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Échec upload PDF Cloudinary'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function uploadVideoBuffer(
  buffer: Buffer,
  folder: string,
  filename?: string,
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        public_id: uniquePublicId(filename),
        overwrite: false,
      },
      (error, result) => {
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
      },
    );
    stream.end(buffer);
  });
}

export async function uploadDataUrl(dataUrl: string, folder: string): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  const result = await cloudinary.uploader.upload(dataUrl, {
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
