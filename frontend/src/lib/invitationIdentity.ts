export type InvitationIdentity = {
  title?: string;
  honorees?: string;
  date?: string;
  applyTitleToCard?: boolean;
};

function textOf(element: unknown): string {
  if (!element || typeof element !== 'object') return '';
  const text = (element as { text?: unknown }).text;
  return typeof text === 'string' ? text : '';
}

function fontSizeOf(element: unknown): number {
  if (!element || typeof element !== 'object') return 16;
  return parseInt(String((element as { fontSize?: unknown }).fontSize || '16'), 10) || 16;
}

export function formatInvitationIdentityDate(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  const parsed = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function resolveInvitationIdentity(identity: InvitationIdentity): {
  title: string;
  honorees: string;
  date: string;
} {
  const title = String(identity.title || '').trim();
  const honorees = String(identity.honorees || '').trim() || title;
  return {
    title: title || honorees,
    honorees,
    date: formatInvitationIdentityDate(identity.date),
  };
}

export function identityFromTemplateContent(content: unknown): InvitationIdentity {
  const global = content && typeof content === 'object'
    ? (content as { global?: { identity?: InvitationIdentity } }).global
    : undefined;
  const stored = global?.identity;
  if (!stored || typeof stored !== 'object') return {};
  return {
    title: typeof stored.title === 'string' ? stored.title : '',
    honorees: typeof stored.honorees === 'string' ? stored.honorees : '',
    date: typeof stored.date === 'string' ? stored.date : '',
  };
}

export function applyInvitationIdentityToContent<T>(
  content: T,
  identity: InvitationIdentity,
): T {
  const resolved = resolveInvitationIdentity(identity);
  if (!resolved.title && !resolved.honorees && !resolved.date) return content;
  const source = content && typeof content === 'object' ? (content as Record<string, unknown>) : {};
  const elements = Array.isArray(source.elements)
    ? source.elements.map((el) => (el && typeof el === 'object' ? { ...(el as Record<string, unknown>) } : el))
    : [];

  const explicitHonorees = String(identity.honorees || '').trim();
  const explicitTitle = String(identity.title || '').trim();

  const nextElements = elements.map((el) => {
    if (!el || typeof el !== 'object') return el;
    const row = el as Record<string, unknown>;
    if (typeof row.text !== 'string') return row;
    let text = row.text;
    if (explicitHonorees) text = text.replaceAll('{{title}}', explicitHonorees);
    if (resolved.title) text = text.replaceAll('{{eventTitle}}', resolved.title);
    if (resolved.date) text = text.replaceAll('{{date}}', resolved.date);
    return { ...row, text };
  });

  const hasHonorees = Boolean(explicitHonorees) && nextElements.some((el) => {
    const txt = textOf(el);
    return txt.includes('{{title}}') || txt.includes(explicitHonorees);
  });
  const hasDate = Boolean(resolved.date) && nextElements.some((el) => {
    const txt = textOf(el);
    return txt.includes('{{date}}') || txt.includes(resolved.date);
  });

  if (explicitHonorees && !hasHonorees) {
    const textEls = nextElements.filter((el) => el && typeof el === 'object' && (el as { type?: string }).type === 'text' && textOf(el));
    const main = [...textEls].sort((a, b) => fontSizeOf(b) - fontSizeOf(a))[0] as Record<string, unknown> | undefined;
    if (main) main.text = explicitHonorees;
  }

  if (identity.applyTitleToCard && explicitTitle && explicitTitle !== explicitHonorees) {
    const kicker = nextElements.find((el) => {
      if (!el || typeof el !== 'object') return false;
      const row = el as Record<string, unknown>;
      const txt = textOf(el);
      if (!txt || txt === explicitHonorees || txt === resolved.date) return false;
      if (txt.includes('{{')) return false;
      const size = fontSizeOf(el);
      const tracking = String(row.letterSpacing || '');
      return size <= 16 && (Boolean(tracking) || txt === txt.toUpperCase());
    }) as Record<string, unknown> | undefined;
    if (kicker) kicker.text = explicitTitle;
  }

  if (resolved.date && !hasDate) {
    const dateEl = nextElements.find((el) => /\b(202\d|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|date)\b/i.test(textOf(el))) as Record<string, unknown> | undefined;
    if (dateEl) dateEl.text = resolved.date;
  }

  const global = source.global && typeof source.global === 'object'
    ? { ...(source.global as Record<string, unknown>) }
    : {};

  return {
    ...source,
    global: {
      ...global,
      identity: {
        title: resolved.title,
        honorees: explicitHonorees,
        date: String(identity.date || '').trim(),
      },
    },
    elements: nextElements,
  } as T;
}
