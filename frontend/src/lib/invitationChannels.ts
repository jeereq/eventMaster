export type InvitationDeliveryMethod = 'EMAIL' | 'WHATSAPP' | 'SMS';

const METHOD_ORDER: InvitationDeliveryMethod[] = ['EMAIL', 'WHATSAPP', 'SMS'];

export type InvitationChannelPreset = {
  id: string;
  label: string;
  methods: InvitationDeliveryMethod[];
};

export const INVITATION_CHANNEL_PRESETS: InvitationChannelPreset[] = [
  { id: 'ALL_CHANNELS', label: 'Les trois (E-mail, WhatsApp & SMS)', methods: ['EMAIL', 'WHATSAPP', 'SMS'] },
  { id: 'EMAIL_AND_WHATSAPP', label: 'E-mail & WhatsApp', methods: ['EMAIL', 'WHATSAPP'] },
  { id: 'EMAIL_AND_SMS', label: 'E-mail & SMS', methods: ['EMAIL', 'SMS'] },
  { id: 'WHATSAPP_AND_SMS', label: 'WhatsApp & SMS', methods: ['WHATSAPP', 'SMS'] },
  { id: 'EMAIL', label: 'E-mail seul', methods: ['EMAIL'] },
  { id: 'WHATSAPP', label: 'WhatsApp seul', methods: ['WHATSAPP'] },
  { id: 'SMS', label: 'SMS seul', methods: ['SMS'] },
];

export function invitationMethodsFromPlatform(
  channels: readonly string[] | null | undefined,
): InvitationDeliveryMethod[] {
  const enabled = new Set((channels || []).map((item) => String(item).trim().toUpperCase()));
  return METHOD_ORDER.filter((method) => enabled.has(method));
}

export function methodsOfInvitationChannel(channel: string | null | undefined): InvitationDeliveryMethod[] {
  const normalized = String(channel || '').trim().toUpperCase();
  if (normalized === 'EMAIL_AND_WHATSAPP' || normalized === 'WHATSAPP_AND_EMAIL') return ['EMAIL', 'WHATSAPP'];
  if (normalized === 'EMAIL_AND_SMS' || normalized === 'SMS_AND_EMAIL') return ['EMAIL', 'SMS'];
  if (normalized === 'WHATSAPP_AND_SMS' || normalized === 'SMS_AND_WHATSAPP') return ['WHATSAPP', 'SMS'];
  if (normalized === 'ALL_CHANNELS') return ['EMAIL', 'WHATSAPP', 'SMS'];
  if (normalized === 'EMAIL' || normalized === 'WHATSAPP' || normalized === 'SMS') return [normalized];
  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is InvitationDeliveryMethod => item === 'EMAIL' || item === 'WHATSAPP' || item === 'SMS');
}

export function invitationChannelUses(
  channel: string | null | undefined,
  method: InvitationDeliveryMethod,
): boolean {
  return methodsOfInvitationChannel(channel).includes(method);
}

export function encodeInvitationChannel(methods: readonly InvitationDeliveryMethod[]): string | null {
  const set = new Set(methods);
  const email = set.has('EMAIL');
  const whatsapp = set.has('WHATSAPP');
  const sms = set.has('SMS');
  if (email && whatsapp && sms) return 'ALL_CHANNELS';
  if (email && whatsapp) return 'EMAIL_AND_WHATSAPP';
  if (email && sms) return 'EMAIL_AND_SMS';
  if (whatsapp && sms) return 'WHATSAPP_AND_SMS';
  if (email) return 'EMAIL';
  if (whatsapp) return 'WHATSAPP';
  if (sms) return 'SMS';
  return null;
}

export function clampInvitationChannel(
  channel: string | null | undefined,
  allowed: readonly InvitationDeliveryMethod[],
): string | null {
  const permitted = new Set(allowed);
  const kept = methodsOfInvitationChannel(channel).filter((method) => permitted.has(method));
  return encodeInvitationChannel(kept);
}

export function defaultInvitationChannel(
  allowed: readonly InvitationDeliveryMethod[],
): string | null {
  if (allowed.includes('EMAIL') && allowed.includes('WHATSAPP')) return 'EMAIL_AND_WHATSAPP';
  return encodeInvitationChannel(allowed);
}

export function visibleInvitationChannelPresets(
  allowed: readonly InvitationDeliveryMethod[],
): InvitationChannelPreset[] {
  const permitted = new Set(allowed);
  return INVITATION_CHANNEL_PRESETS.filter(
    (preset) => preset.methods.length > 0 && preset.methods.every((method) => permitted.has(method)),
  );
}

export function invitationChannelLabel(channel: string | null | undefined): string {
  const normalized = String(channel || '').trim().toUpperCase();
  const preset = INVITATION_CHANNEL_PRESETS.find((item) => item.id === normalized);
  if (preset) return preset.label;
  if (normalized === 'WHATSAPP_AND_EMAIL') return 'E-mail & WhatsApp';
  if (normalized === 'SMS_AND_EMAIL') return 'E-mail & SMS';
  if (normalized === 'SMS_AND_WHATSAPP') return 'WhatsApp & SMS';
  return normalized || 'Canal';
}
