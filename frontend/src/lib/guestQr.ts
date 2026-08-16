/** URL du QR invité auto-hébergé par l’API EventMaster. */
export function getGuestQrImageUrl(guestId: string, size = 180): string {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');
  return `${apiBase}/rsvp/${guestId}/qr.png?size=${size}`;
}
