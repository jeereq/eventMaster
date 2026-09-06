const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ACCOUNT_KIND_LABEL: Record<string, string> = {
  ORGANIZER: 'organisateur d’événements',
  VENDOR: 'salle / prestataire',
  BOTH: 'organisateur et prestataire',
  CLIENT: 'hôte / client',
};

const EVENT_KIND_LABEL: Record<string, string> = {
  WEDDING: 'mariage',
  BIRTHDAY: 'anniversaire',
  BAPTISM: 'baptême',
  CORPORATE: 'entreprise',
  CONFERENCE: 'conférence',
  GALA: 'gala',
  OTHER: 'autre',
};

const EVENT_KIND_LABEL_EN: Record<string, string> = {
  WEDDING: 'wedding',
  BIRTHDAY: 'birthday',
  BAPTISM: 'baptism',
  CORPORATE: 'corporate',
  CONFERENCE: 'conference',
  GALA: 'gala',
  OTHER: 'other',
};

export type InvitationComposeEventSummary = {
  title: string;
  kind: string;
  location: string;
  date: string;
  clientName: string | null;
};

export const INVITATION_CONTEXT_SOURCES = ['none', 'org', 'history'] as const;
export type InvitationContextSource = (typeof INVITATION_CONTEXT_SOURCES)[number];

export type InvitationComposeContext = {
  organizerName: string | null;
  organizationName: string | null;
  accountKind: string | null;
  accountKindLabel: string | null;
  vendorCity: string | null;
  recentEvents: InvitationComposeEventSummary[];
  recentPrompts: string[];
};

export function parseInvitationContextSource(raw: unknown): InvitationContextSource {
  return raw === 'org' || raw === 'history' || raw === 'none' ? raw : 'none';
}

export function selectComposeContext(
  context: InvitationComposeContext,
  source: InvitationContextSource,
): InvitationComposeContext {
  if (source === 'none') return emptyComposeContext();
  if (source === 'org') {
    return { ...context, recentPrompts: [] };
  }
  return {
    ...emptyComposeContext(),
    recentPrompts: context.recentPrompts,
  };
}

export function isPersistedUserId(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function clipContextText(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function uniquePriorPrompts(prompts: string[], currentPrompt: string, max = 5): string[] {
  const current = currentPrompt.replace(/\s+/g, ' ').trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of prompts) {
    const next = clipContextText(raw, 120);
    const key = next.toLowerCase();
    if (!next || key === current || seen.has(key)) continue;
    seen.add(key);
    out.push(next);
    if (out.length >= max) break;
  }
  return out;
}

export function emptyComposeContext(): InvitationComposeContext {
  return {
    organizerName: null,
    organizationName: null,
    accountKind: null,
    accountKindLabel: null,
    vendorCity: null,
    recentEvents: [],
    recentPrompts: [],
  };
}

export function hasUsableComposeContext(context: InvitationComposeContext): boolean {
  return Boolean(
    context.organizerName ||
      context.organizationName ||
      context.recentEvents.length ||
      context.recentPrompts.length,
  );
}

function visionHeading(source: InvitationContextSource): string {
  if (source === 'history') {
    return 'CONTEXTE HISTORIQUE DE RECHERCHES (briefs déjà demandés — décor seulement, JAMAIS un visage) :';
  }
  if (source === 'org') {
    return 'CONTEXTE ORGANISATION (nom, type de compte, événements — décor seulement, JAMAIS un visage) :';
  }
  return 'CONTEXTE PERSONNE CONNECTÉE / REQUÊTES (décor, langue, type d’événement, noms — JAMAIS un visage) :';
}

function imageHeading(source: InvitationContextSource): string {
  if (source === 'history') {
    return 'REQUEST HISTORY CONTEXT (prior invitation briefs — décor taste only, NEVER invent a face):';
  }
  if (source === 'org') {
    return 'ORGANIZATION CONTEXT (org name, account kind, recent events — décor only, NEVER invent a face):';
  }
  return 'ORGANIZER / REQUEST CONTEXT (décor, event type, names for typography — NEVER invent a face from this):';
}

/** Bloc FR pour l’analyse structurelle (brief + besoins). */
export function formatContextForVision(
  context: InvitationComposeContext,
  source: InvitationContextSource = 'none',
): string {
  if (!hasUsableComposeContext(context)) return '';
  const lines: string[] = [visionHeading(source)];
  if (context.organizerName) lines.push(`- Organisateur : ${context.organizerName}`);
  if (context.organizationName) {
    const kind = context.accountKindLabel ? ` (${context.accountKindLabel})` : '';
    const city = context.vendorCity ? `, ${context.vendorCity}` : '';
    lines.push(`- Organisation : ${context.organizationName}${kind}${city}`);
  }
  if (context.recentEvents.length) {
    const events = context.recentEvents
      .map((event) => {
        const kind = EVENT_KIND_LABEL[event.kind] || event.kind || 'événement';
        const who = event.clientName ? ` — ${event.clientName}` : '';
        const where = event.location ? `, ${event.location}` : '';
        return `${event.title} (${kind}${where}${event.date ? `, ${event.date}` : ''})${who}`;
      })
      .join(' ; ');
    lines.push(`- Événements récents : ${events}`);
  }
  if (context.recentPrompts.length) {
    lines.push(`- Briefs d’invitation déjà demandés : ${context.recentPrompts.join(' | ')}`);
  }
  lines.push(
    'Utilise ce contexte seulement si le brief actuel est incomplet (type d’événement, noms/date/lieu, goût décoratif). N’invente aucun visage à partir du nom, de l’avatar ou de l’organisation.',
  );
  return lines.join('\n');
}

/** Bloc EN pour Nano Banana / image models (contexte + intention, reco Gemini). */
export function formatContextForImage(
  context: InvitationComposeContext,
  source: InvitationContextSource = 'none',
): string {
  if (!hasUsableComposeContext(context)) return '';
  const bits: string[] = [];
  if (context.organizerName) bits.push(`organizer ${context.organizerName}`);
  if (context.organizationName) {
    const kind = context.accountKind ? ` (${context.accountKind})` : '';
    bits.push(`organization ${context.organizationName}${kind}`);
  }
  if (context.vendorCity) bits.push(`city ${context.vendorCity}`);
  if (context.recentEvents.length) {
    const events = context.recentEvents
      .map((event) => {
        const kind = EVENT_KIND_LABEL_EN[event.kind] || event.kind || 'event';
        return `${event.title} (${kind}${event.location ? `, ${event.location}` : ''})`;
      })
      .join('; ');
    bits.push(`recent events: ${events}`);
  }
  if (context.recentPrompts.length) {
    bits.push(`prior invitation briefs: ${context.recentPrompts.join(' | ')}`);
  }
  return [
    imageHeading(source),
    bits.join('. '),
    'If the current brief is thin, reuse the usual event kind and décor taste. Do not portrait the organizer unless their photo is attached.',
  ].join('\n');
}
