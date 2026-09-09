export interface DonationMeta {
  kind?: string;
  donationNote?: string | null;
  isAnonymous?: boolean;
  donorAttendancePass?: boolean;
}

export function parseDonationMeta(selectedSeats: unknown): DonationMeta {
  if (selectedSeats && typeof selectedSeats === 'object' && !Array.isArray(selectedSeats)) {
    const raw = selectedSeats as Record<string, unknown>;
    return {
      kind: typeof raw.kind === 'string' ? raw.kind : undefined,
      donationNote: typeof raw.donationNote === 'string' && raw.donationNote.trim() ? raw.donationNote.trim() : null,
      isAnonymous: Boolean(raw.isAnonymous),
      donorAttendancePass: raw.donorAttendancePass !== false,
    };
  }
  return { donorAttendancePass: true };
}

export function resolveChannelLabel(channel: string | null | undefined, provider: string | null | undefined): string {
  const ch = String(channel || '').toLowerCase().trim();
  const prov = String(provider || '').toLowerCase().trim();

  if (ch.includes('mpesa') || ch.includes('voda')) return 'M-Pesa (Vodacom)';
  if (ch.includes('orange')) return 'Orange Money';
  if (ch.includes('airtel')) return 'Airtel Money';
  if (ch.includes('afri')) return 'Afrimoney';
  if (ch.includes('card') || prov === 'flexpay_card') return 'Carte Bancaire (FlexPay)';
  if (prov === 'stripe') return 'Carte Bancaire (Stripe)';
  if (ch) return ch.toUpperCase();
  if (prov) return prov.toUpperCase();
  return 'Mobile Money / En ligne';
}

export function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const s = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
  return `"${s}"`;
}
