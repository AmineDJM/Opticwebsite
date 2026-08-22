/** Shared pagination shape for repositories and list endpoints. */

export interface PageParams {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function paginate<T>(items: T[], total: number, params: PageParams): Paginated<T> {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export function pageToRange(params: PageParams): { skip: number; take: number } {
  return { skip: (params.page - 1) * params.pageSize, take: params.pageSize };
}

export function clampPageParams(
  page: unknown,
  pageSize: unknown,
  { defaultPageSize = 24, maxPageSize = 100 } = {},
): PageParams {
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const raw = Math.floor(Number(pageSize)) || defaultPageSize;
  const size = Math.min(Math.max(1, raw), maxPageSize);
  return { page: p, pageSize: size };
}
