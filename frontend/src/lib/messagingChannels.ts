/**
 * Canaux de communication activés par le superadmin (réglage « Canaux de notification
 * plateforme autorisés »). Les textes de la plateforme passent par ces helpers pour ne
 * jamais mentionner un canal désactivé, avec des listes recomposées correctement en français.
 */

export type MessagingChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

/** Ordre « marketing » : du plus mis en avant au moins mis en avant. */
export const MARKETING_ORDER: readonly MessagingChannel[] = ['WHATSAPP', 'SMS', 'EMAIL'];
/** Ordre « technique » : celui des réglages et des formulaires. */
export const SETTINGS_ORDER: readonly MessagingChannel[] = ['EMAIL', 'WHATSAPP', 'SMS'];

export const CHANNEL_NAMES: Record<MessagingChannel, string> = {
  EMAIL: 'e-mail',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
};

export function enabledMessagingChannels(
  channels: readonly string[] | null | undefined,
): MessagingChannel[] {
  const set = new Set((channels || []).map((c) => String(c).trim().toUpperCase()));
  return SETTINGS_ORDER.filter((c) => set.has(c));
}

/** « a », « a et b », « a, b et c » (conjonction au choix). */
export function joinFr(items: readonly string[], conj: 'et' | 'ou' | '&' | '/' = 'et'): string {
  const list = items.filter(Boolean);
  if (list.length === 0) return '';
  if (conj === '/') return list.join(' / ');
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} ${conj} ${list[list.length - 1]}`;
}

export function capitalizeFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export type ChannelListOptions = {
  conj?: 'et' | 'ou' | '&' | '/';
  order?: readonly MessagingChannel[];
  /** Noms personnalisés (ex. « E-mail » en tête de libellé). */
  names?: Partial<Record<MessagingChannel, string>>;
  /** Ne garder que ces canaux (ex. canaux téléphone). */
  only?: readonly MessagingChannel[];
  capitalize?: boolean;
};

export function channelList(
  enabled: readonly MessagingChannel[],
  { conj = 'ou', order = MARKETING_ORDER, names, only, capitalize }: ChannelListOptions = {},
): string {
  const set = new Set(enabled);
  const keep = only ? new Set(only) : null;
  const items = order
    .filter((c) => set.has(c) && (!keep || keep.has(c)))
    .map((c) => names?.[c] ?? CHANNEL_NAMES[c]);
  const text = joinFr(items, conj);
  return capitalize ? capitalizeFirst(text) : text;
}

export type MessagingChannels = {
  channels: MessagingChannel[];
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  /** Au moins un canal téléphone (WhatsApp ou SMS). */
  phone: boolean;
  any: boolean;
  has: (channel: MessagingChannel) => boolean;
  /** Liste des canaux activés : « WhatsApp, SMS ou e-mail ». */
  list: (options?: ChannelListOptions) => string;
  /**
   * Complément « par … » : « par WhatsApp, SMS ou e-mail ».
   * Sans aucun canal activé : `fallback` (par défaut « par lien personnel »).
   */
  via: (options?: ChannelListOptions & { fallback?: string }) => string;
  /** Canaux téléphone seuls : « WhatsApp ou SMS ». */
  phoneList: (options?: ChannelListOptions) => string;
  /**
   * Adapte un texte libre aux canaux activés : énumérations recomposées
   * (`adaptChannelLists`) puis mentions isolées reformulées (`adaptSingleChannelMentions`).
   */
  adapt: (text: string) => string;
};

const TOKEN = '(?:[Ee]-mails?|WhatsApp|SMS|[Pp]ush)';
const SEP = '(?:\\s*(?:,|/|&)\\s*|\\s+(?:ou|et)\\s+)';
const LIST_RE = new RegExp(`(?<![\\p{L}-])${TOKEN}(?:${SEP}${TOKEN})+(?![\\p{L}])`, 'gu');

function tokenChannel(token: string): MessagingChannel | 'PUSH' {
  const t = token.toLowerCase();
  if (t.startsWith('e-mail')) return 'EMAIL';
  if (t === 'whatsapp') return 'WHATSAPP';
  if (t === 'sms') return 'SMS';
  return 'PUSH';
}

/**
 * Recompose les énumérations de canaux d’un texte (« e-mail ou WhatsApp »,
 * « WhatsApp, SMS et e-mail », « e-mail / WhatsApp / push »…) en ne gardant que
 * les canaux activés, avec une ponctuation correcte. Le push n’est pas concerné.
 * Si aucun canal de l’énumération n’est actif, le texte est laissé tel quel.
 */
export function adaptChannelLists(text: string, enabled: readonly MessagingChannel[]): string {
  if (!text) return text;
  const set = new Set<string>(enabled);
  return text.replace(LIST_RE, (match: string, offset: number, whole: string) => {
    const parts = match.split(new RegExp(`(${SEP})`, 'u'));
    const tokens = parts.filter((_, i) => i % 2 === 0);
    const seps = parts.filter((_, i) => i % 2 === 1);
    const kept = tokens.filter((t) => {
      const ch = tokenChannel(t);
      return ch === 'PUSH' || set.has(ch);
    });
    if (kept.length === tokens.length || kept.length === 0) return match;
    const lastSep = seps[seps.length - 1];
    const slashStyle = seps.every((sep) => sep.trim() === '/');
    if (slashStyle) return kept.join(lastSep);
    const result =
      kept.length === 1
        ? kept[0]
        : `${kept.slice(0, -1).join(', ')}${lastSep.trim() === ',' ? ' et ' : lastSep}${kept[kept.length - 1]}`;
    // Majuscule si l’énumération ouvre la phrase (« WhatsApp ou e-mail. » → « E-mail. »).
    const startsSentence = offset === 0 || /[.!?:\n(]\s*$/.test(whole.slice(0, offset)) || /^\s+$/.test(whole.slice(0, offset));
    return startsSentence && /^[A-Z]/.test(match) ? capitalizeFirst(result) : result;
  });
}

const SINGLE_NAMES: Record<MessagingChannel, string> = { EMAIL: '[Ee]-mail', WHATSAPP: 'WhatsApp', SMS: 'SMS' };

/**
 * Mentions isolées d’un canal désactivé (« invitations WhatsApp », « sur WhatsApp »,
 * « format 9:16 WhatsApp »…) : reformulées avec les canaux restants ou retirées.
 */
export function adaptSingleChannelMentions(text: string, enabled: readonly MessagingChannel[]): string {
  if (!text) return text;
  const set = new Set(enabled);
  const disabled = SETTINGS_ORDER.filter((c) => !set.has(c));
  if (disabled.length === 0) return text;
  // Libellé réduit au seul nom d’un canal désactivé (badge, puce) : remplacé par les canaux restants.
  if (disabled.some((ch) => text.trim() === CHANNEL_NAMES[ch] || text.trim().toLowerCase() === CHANNEL_NAMES[ch].toLowerCase())) {
    return channelList(enabled, { conj: '&', capitalize: true }) || 'En ligne';
  }
  const remaining = channelList(enabled, { conj: 'ou' });
  const via = remaining ? `par ${remaining}` : 'par lien personnel';
  let out = text;
  for (const ch of disabled) {
    const name = SINGLE_NAMES[ch];
    // Formats d’image pensés pour une messagerie : on garde le format seul.
    out = out
      .replace(new RegExp(`\\s*(?:pour|sur)\\s+${name}(?=\\s*[,.;)]|\\s*$)`, 'gu'), (m, offset: number, whole: string) =>
        /9:16|format|carte|partage|pensé/i.test(whole.slice(Math.max(0, offset - 40), offset)) ? '' : m,
      )
      .replace(new RegExp(`\\s*(?:&|,)\\s*[Cc]anal\\s+${name}\\b`, 'gu'), '')
      .replace(new RegExp(`\\b([Nn]uméro)\\s+(?:de\\s+téléphone\\s+)?${name}\\b`, 'gu'), '$1 de téléphone')
      .replace(new RegExp(`(\\p{L})\\s+${name}\\s+&\\s+`, 'gu'), '$1 & ')
      .replace(new RegExp(`(9:16)\\s+${name}\\b`, 'gu'), '$1 mobile')
      .replace(new RegExp(`\\b(format)\\s+${name}\\s+(9:16)`, 'giu'), '$1 $2')
      .replace(new RegExp(`\\b([Pp]artage)\\s+${name}\\b`, 'gu'), '$1 du lien')
      .replace(new RegExp(`\\b(?:sur|par|via)\\s+(?:le\\s+)?${name}\\b`, 'gu'), via)
      .replace(
        new RegExp(
          `\\b([Ff]aire-part|[Ii]nvitations?|[Ee]nvois?|[Mm]essages?)\\s+${name}\\s+(personnalisés|personnalisées|nominatifs|nominatives|individuels|interactives)\\b`,
          'gu',
        ),
        `$1 $2 ${via}`,
      )
      .replace(
        new RegExp(
          `\\b((?:[Ii]nvitations?|[Ff]aire-part|[Ee]nvois?|[Mm]essages?|[Aa]lertes?|[Rr]éponses?|[Rr]appels?|[Nn]otifications?)(?:\\s+(?:individuels|nominatifs|nominatives|personnalisés|interactives))?)\\s+${name}\\b`,
          'gu',
        ),
        `$1 ${via}`,
      );
  }
  return out;
}

export function buildMessagingChannels(channels: readonly string[] | null | undefined): MessagingChannels {
  const enabled = enabledMessagingChannels(channels);
  const set = new Set(enabled);
  const list = (options?: ChannelListOptions) => channelList(enabled, options);
  return {
    channels: enabled,
    email: set.has('EMAIL'),
    whatsapp: set.has('WHATSAPP'),
    sms: set.has('SMS'),
    phone: set.has('WHATSAPP') || set.has('SMS'),
    any: enabled.length > 0,
    has: (channel) => set.has(channel),
    list,
    via: (options) => {
      const text = list(options);
      return text ? `par ${text}` : (options?.fallback ?? 'par lien personnel');
    },
    phoneList: (options) => list({ ...options, only: ['WHATSAPP', 'SMS'] }),
    adapt: (text) => adaptSingleChannelMentions(adaptChannelLists(text, enabled), enabled),
  };
}
