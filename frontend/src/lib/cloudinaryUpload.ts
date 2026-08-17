import { api } from '@/lib/api';

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export async function uploadImageFile(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/uploads/image', formData);
}

export async function uploadVideoFile(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/uploads/video', formData);
}

export async function uploadMarketplaceMedia(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/uploads/media', formData);
}

export async function uploadDataUrlImage(dataUrl: string): Promise<UploadedImage> {
  return api.post('/uploads/image', { dataUrl });
}

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com/');
}

/** Convertit une data URL base64 en File pour ré-upload après rognage. */
export function dataUrlToFile(dataUrl: string, filename = 'cropped.jpg'): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}
