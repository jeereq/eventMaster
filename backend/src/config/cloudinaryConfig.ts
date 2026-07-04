export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export function getCloudinaryConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  };
}

export function getTemplateUploadFolder(tenantId: string | null | undefined): string {
  const scope = tenantId || 'global';
  return `eventmaster/templates/${scope}`;
}

export function getSeatingInvitationUploadFolder(eventId: string, guestId: string): string {
  return `eventmaster/seating-invitations/${eventId}/${guestId}`;
}
