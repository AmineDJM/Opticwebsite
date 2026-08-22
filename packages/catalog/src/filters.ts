import { clampPageParams, type PageParams } from "@optic/core";

/**
 * Catalogue filtering & sorting (§8). This module builds a normalised, URL-synced
 * filter state and translates it into a Prisma `where`/`orderBy` for the Product
 * model. Keeping it here (not in the app) makes it testable without a database and
 * shared between storefront and admin.
 */

export type SortKey = "relevance" | "newest" | "price_asc" | "price_desc" | "bestselling" | "name_asc";

export const SORT_KEYS: SortKey[] = ["relevance", "newest", "price_asc", "price_desc", "bestselling", "name_asc"];

export interface CatalogFilters {
  categorySlug?: string;
  brandSlugs: string[];
  genders: string[]; // MEN/WOMEN/UNISEX/KIDS
  frameShapes: string[];
  frameMaterials: string[];
  frameTypes: string[];
  colors: string[];
  sizes: string[];
  lensTypes: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
  inStockOnly: boolean;
  isNew?: boolean;
  onSale?: boolean;
  search?: string;
  sort: SortKey;
  page: PageParams;
}

const arrayParam = (v: string | string[] | undefined): string[] => {
  if (!v) return [];
  const raw = Array.isArray(v) ? v : v.split(",");
  return [...new Set(raw.map((s) => s.trim()).filter(Boolean))];
};

const intParam = (v: string | string[] | undefined): number | undefined => {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined;
};

/** Parse URL search params (as a plain record) into a normalised filter state. */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
  defaults: { categorySlug?: string } = {},
): CatalogFilters {
  const sortRaw = (Array.isArray(params.sort) ? params.sort[0] : params.sort) as SortKey | undefined;
  return {
    categorySlug: (Array.isArray(params.category) ? params.category[0] : params.category) ?? defaults.categorySlug,
    brandSlugs: arrayParam(params.brand),
    genders: arrayParam(params.gender),
    frameShapes: arrayParam(params.shape),
    frameMaterials: arrayParam(params.material),
    frameTypes: arrayParam(params.type),
    colors: arrayParam(params.color),
    sizes: arrayParam(params.size),
    lensTypes: arrayParam(params.lens),
    minPriceCents: intParam(params.min),
    maxPriceCents: intParam(params.max),
    inStockOnly: params.stock === "1" || params.stock === "true",
    isNew: params.new === "1" ? true : undefined,
    onSale: params.sale === "1" ? true : undefined,
    search: (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() || undefined,
    sort: sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : "relevance",
    page: clampPageParams(params.page, params.pageSize, { defaultPageSize: 24, maxPageSize: 60 }),
  };
}

/** Serialise filters back to a clean query string (for shareable/canonical URLs). */
export function filtersToQueryString(f: CatalogFilters): string {
  const p = new URLSearchParams();
  const setArr = (key: string, arr: string[]) => arr.length && p.set(key, arr.join(","));
  if (f.categorySlug) p.set("category", f.categorySlug);
  setArr("brand", f.brandSlugs);
  setArr("gender", f.genders);
  setArr("shape", f.frameShapes);
  setArr("material", f.frameMaterials);
  setArr("type", f.frameTypes);
  setArr("color", f.colors);
  setArr("size", f.sizes);
  setArr("lens", f.lensTypes);
  if (f.minPriceCents != null) p.set("min", String(f.minPriceCents));
  if (f.maxPriceCents != null) p.set("max", String(f.maxPriceCents));
  if (f.inStockOnly) p.set("stock", "1");
  if (f.isNew) p.set("new", "1");
  if (f.onSale) p.set("sale", "1");
  if (f.search) p.set("q", f.search);
  if (f.sort !== "relevance") p.set("sort", f.sort);
  if (f.page.page > 1) p.set("page", String(f.page.page));
  return p.toString();
}

export function hasActiveFilters(f: CatalogFilters): boolean {
  return (
    f.brandSlugs.length > 0 ||
    f.genders.length > 0 ||
    f.frameShapes.length > 0 ||
    f.frameMaterials.length > 0 ||
    f.frameTypes.length > 0 ||
    f.colors.length > 0 ||
    f.sizes.length > 0 ||
    f.lensTypes.length > 0 ||
    f.minPriceCents != null ||
    f.maxPriceCents != null ||
    f.inStockOnly ||
    !!f.isNew ||
    !!f.onSale ||
    !!f.search
  );
}

export function countActiveFilters(f: CatalogFilters): number {
  return (
    f.brandSlugs.length +
    f.genders.length +
    f.frameShapes.length +
    f.frameMaterials.length +
    f.frameTypes.length +
    f.colors.length +
    f.sizes.length +
    f.lensTypes.length +
    (f.minPriceCents != null || f.maxPriceCents != null ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +
    (f.isNew ? 1 : 0) +
    (f.onSale ? 1 : 0)
  );
}
