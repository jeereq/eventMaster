import { AuthenticatedRequest } from '../middleware/auth';

export function adminPager(req: AuthenticatedRequest, defaultSize = 20) {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || defaultSize), 10) || defaultSize, 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function adminSearch(req: AuthenticatedRequest) {
  return typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
}

export function adminQueryString(req: AuthenticatedRequest, key: string) {
  const raw = req.query[key];
  return typeof raw === 'string' && raw.trim() && raw !== 'ALL' ? raw.trim() : undefined;
}

export function listPayload<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

/** Empile des clauses AND sans écraser un OR déjà posé (recherche + filtre licence / GPS). */
export function prismaAnd(where: Record<string, unknown>, clause: unknown) {
  const prev = where.AND;
  const list = Array.isArray(prev) ? [...prev] : prev ? [prev] : [];
  list.push(clause);
  where.AND = list;
}
