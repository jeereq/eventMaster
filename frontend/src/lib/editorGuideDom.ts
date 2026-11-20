/**
 * Retrouve dans la page l'élément désigné par un repère de guide (`tour:`, `btn:`, `field:`,
 * `label:`, `css:`, enchaînés par ` >> `). Voir `roomEditorGuide.ts` pour la syntaxe.
 * Seuls les éléments visibles comptent : l'éditeur existe en double (ordinateur / téléphone).
 */

/** Racine de l'interface du guide lui-même : jamais prise pour une cible. */
export const GUIDE_UI_ATTR = 'data-em-guide';

const CLICKABLE = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="menuitem"], [role="option"], [role="switch"], summary, label';
const CONTROLS = 'input:not([type="hidden"]), select, textarea';

export function normalizeUiText(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGuideVisible(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest(`[${GUIDE_UI_ATTR}]`)) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** Texte d'un élément sans celui des listes et champs qu'il contient (étiquettes de formulaire). */
function ownText(el: Element): string {
  let out = '';
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) out += ` ${child.textContent ?? ''}`;
      else if (child instanceof Element && !child.matches('select, option, textarea, input, [aria-hidden="true"]')) walk(child);
    }
  };
  walk(el);
  return normalizeUiText(out);
}

function nameOf(el: Element): string[] {
  return [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('placeholder')].filter(Boolean).map((s) => normalizeUiText(s));
}

function labelTextsOf(control: HTMLElement): string[] {
  const out: string[] = [];
  const wrap = control.closest('label');
  if (wrap) out.push(ownText(wrap));
  const id = control.getAttribute('id');
  if (id) {
    for (const l of Array.from(document.querySelectorAll(`label[for="${CSS.escape(id)}"]`))) out.push(ownText(l));
  }
  const by = control.getAttribute('aria-labelledby');
  if (by) for (const ref of by.split(/\s+/)) out.push(ownText(document.getElementById(ref) ?? document.createElement('span')));
  return out.filter(Boolean);
}

/** Zone à éclairer pour un champ : son étiquette englobante, sinon le champ et son étiquette. */
function fieldBox(control: HTMLElement): HTMLElement {
  const wrap = control.closest('label');
  if (wrap instanceof HTMLElement && isGuideVisible(wrap)) return wrap;
  const id = control.getAttribute('id');
  const outer = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
  if (outer && control.parentElement && outer.parentElement === control.parentElement && isGuideVisible(control.parentElement)) return control.parentElement;
  return control;
}

type Tiered = { el: HTMLElement; tier: number; order: number };

function rank(found: Tiered[]): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  return found
    .sort((a, b) => a.tier - b.tier || a.order - b.order)
    .map((f) => f.el)
    .filter((el) => (seen.has(el) ? false : (seen.add(el), true)));
}

function textTier(texts: string[], want: string, exact: number, prefix: number): number | null {
  if (texts.some((t) => t === want)) return exact;
  if (texts.some((t) => t.startsWith(want))) return prefix;
  return null;
}

function resolvePart(part: string, scope: ParentNode): HTMLElement[] {
  const idx = part.indexOf(':');
  const kind = idx > 0 ? part.slice(0, idx) : 'css';
  const value = idx > 0 ? part.slice(idx + 1).trim() : part.trim();
  const want = normalizeUiText(value);
  const found: Tiered[] = [];
  const all = (sel: string) => Array.from(scope.querySelectorAll(sel));

  if (kind === 'tour') {
    return all(`[data-tour="${CSS.escape(value)}"]`).filter(isGuideVisible);
  }
  if (kind === 'css') {
    try {
      return all(value).filter(isGuideVisible);
    } catch {
      return [];
    }
  }
  if (kind === 'btn') {
    all(CLICKABLE).forEach((el, order) => {
      if (!isGuideVisible(el)) return;
      const tier = textTier([ownText(el)], want, 0, 2) ?? textTier(nameOf(el), want, 1, 3);
      if (tier !== null) found.push({ el, tier, order });
    });
    return rank(found);
  }
  if (kind === 'field') {
    all(CONTROLS).forEach((control, order) => {
      if (!(control instanceof HTMLElement)) return;
      const box = fieldBox(control);
      if (!isGuideVisible(box) && !isGuideVisible(control)) return;
      const tier = textTier(nameOf(control), want, 0, 2) ?? textTier(labelTextsOf(control), want, 1, 3);
      if (tier !== null) found.push({ el: isGuideVisible(box) ? box : control, tier, order });
    });
    return rank(found);
  }
  if (kind === 'label') {
    all('[aria-label], [title]').forEach((el, order) => {
      if (!isGuideVisible(el)) return;
      const tier = textTier(nameOf(el), want, 0, 1);
      if (tier !== null) found.push({ el, tier, order });
    });
    return rank(found);
  }
  if (kind === 'text') {
    all('h1, h2, h3, h4, h5, p, span, div, li').forEach((el, order) => {
      if (!isGuideVisible(el) || el.children.length > 3) return;
      const tier = textTier([ownText(el)], want, 0, 1);
      if (tier !== null) found.push({ el, tier, order });
    });
    return rank(found);
  }
  return [];
}

/** Premier élément visible correspondant au repère (chaîne `A >> B` comprise). */
export function resolveGuideLocator(locator: string, root: ParentNode = document): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const parts = locator.split(' >> ').map((p) => p.trim()).filter(Boolean);
  let scopes: ParentNode[] = [root];
  for (let i = 0; i < parts.length; i += 1) {
    const next: HTMLElement[] = [];
    for (const scope of scopes) next.push(...resolvePart(parts[i], scope));
    if (!next.length) return null;
    if (i === parts.length - 1) return next[0];
    scopes = next;
  }
  return null;
}

export function resolveGuideTargets(locators: string[]): HTMLElement | null {
  for (const loc of locators) {
    const el = resolveGuideLocator(loc);
    if (el) return el;
  }
  return null;
}

/** Libellé lisible d'un bouton pour « Ouvrez d'abord … ». */
export function uiLabelOf(el: HTMLElement): string {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text && text.length <= 40) return text;
  return el.getAttribute('aria-label') ?? el.getAttribute('title') ?? text.slice(0, 40);
}

/** Élément déjà ouvert (menu déplié, section ouverte, onglet actif) ? */
export function isUiExpanded(el: HTMLElement): boolean {
  if (el.getAttribute('aria-expanded') === 'true') return true;
  if (el.getAttribute('aria-current') === 'page' || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true') return true;
  if (el.tagName === 'SUMMARY' && el.parentElement instanceof HTMLDetailsElement) return el.parentElement.open;
  return false;
}

const KEY_ALIASES: Record<string, string> = { esc: 'escape', del: 'delete', suppr: 'delete', space: ' ' };

/** Le raccourci (« Mod+D », « Shift+R », « ArrowRight ») correspond-il à cette frappe ? */
export function keyMatches(combo: string, e: KeyboardEvent): boolean {
  const parts = combo.toLowerCase().split('+');
  const keyName = parts.pop() ?? '';
  const want = KEY_ALIASES[keyName] ?? keyName;
  const mod = parts.includes('mod') || parts.includes('ctrl');
  if (mod !== (e.ctrlKey || e.metaKey)) return false;
  if (parts.includes('shift') && !e.shiftKey) return false;
  if (parts.includes('alt') && !e.altKey) return false;
  const k = e.key.toLowerCase();
  if (want.startsWith('arrow')) return k.startsWith('arrow');
  return k === want;
}
