export interface AdminListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function unwrapAdminList<T>(data: unknown): AdminListResponse<T> {
  if (Array.isArray(data)) {
    return {
      items: data as T[],
      total: data.length,
      page: 1,
      pageSize: data.length || 20,
      hasMore: false,
    };
  }
  const d = (data || {}) as Partial<AdminListResponse<T>>;
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    items,
    total: typeof d.total === 'number' ? d.total : items.length,
    page: d.page || 1,
    pageSize: d.pageSize || items.length || 20,
    hasMore: Boolean(d.hasMore),
  };
}

export function adminListParams(opts: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(opts)) {
    if (value === undefined || value === null || value === '' || value === 'ALL') continue;
    params.set(key, String(value));
  }
  return params.toString();
}
