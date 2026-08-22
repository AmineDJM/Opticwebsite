import type { CatalogFilters, SortKey } from "./filters.js";

/**
 * Translate normalised filters into Prisma query fragments for the Product model.
 * Returns plain objects (typed loosely as Prisma input) so this stays free of a
 * Prisma import and unit-testable. The app spreads these into its tenant-scoped
 * `product.findMany`. `websiteId` is added by the tenant client, never here.
 */

export interface ProductWhere {
  status?: string;
  categories?: { some: { category: { slug: string } } };
  brand?: { slug: { in: string[] } };
  gender?: { in: string[] };
  frameShape?: { in: string[] };
  frameMaterial?: { in: string[] };
  frameType?: { in: string[] };
  isNew?: boolean;
  priceCents?: { gte?: number; lte?: number };
  comparePriceCents?: { not: null };
  variants?: { some: Record<string, unknown> };
  OR?: unknown[];
  AND?: unknown[];
}

export function buildProductWhere(f: CatalogFilters, opts: { publishedOnly?: boolean } = {}): ProductWhere {
  const where: ProductWhere = {};
  const and: unknown[] = [];

  if (opts.publishedOnly !== false) where.status = "ACTIVE";
  if (f.categorySlug) where.categories = { some: { category: { slug: f.categorySlug } } };
  if (f.brandSlugs.length) where.brand = { slug: { in: f.brandSlugs } };
  if (f.genders.length) where.gender = { in: f.genders };
  if (f.frameShapes.length) where.frameShape = { in: f.frameShapes };
  if (f.frameMaterials.length) where.frameMaterial = { in: f.frameMaterials };
  if (f.frameTypes.length) where.frameType = { in: f.frameTypes };
  if (f.isNew) where.isNew = true;

  if (f.minPriceCents != null || f.maxPriceCents != null) {
    where.priceCents = {};
    if (f.minPriceCents != null) where.priceCents.gte = f.minPriceCents;
    if (f.maxPriceCents != null) where.priceCents.lte = f.maxPriceCents;
  }

  if (f.onSale) where.comparePriceCents = { not: null };

  // Variant-level facets (colour/size/stock) and lens compatibility.
  const variantConds: Record<string, unknown> = {};
  if (f.colors.length) variantConds.colorName = { in: f.colors };
  if (f.sizes.length) variantConds.size = { in: f.sizes };
  if (f.inStockOnly) variantConds.stock = { gt: 0 };
  if (Object.keys(variantConds).length) where.variants = { some: { isActive: true, ...variantConds } };

  if (f.lensTypes.length) and.push({ lensCompatibility: { hasSome: f.lensTypes } });

  if (f.search) {
    const q = f.search;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (and.length) where.AND = and;
  return where;
}

export function buildProductOrderBy(sort: SortKey): Record<string, unknown>[] {
  switch (sort) {
    case "newest":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    case "price_asc":
      return [{ priceCents: "asc" }];
    case "price_desc":
      return [{ priceCents: "desc" }];
    case "bestselling":
      return [{ isBestseller: "desc" }, { createdAt: "desc" }];
    case "name_asc":
      return [{ name: "asc" }];
    case "relevance":
    default:
      return [{ isFeatured: "desc" }, { isBestseller: "desc" }, { publishedAt: "desc" }];
  }
}

/** Recommendation-aware sort: bias towards preferred frame shapes (§8 "recommandations visage"). */
export function applyRecommendationBias<T extends { frameShape?: string | null }>(
  products: T[],
  preferredShapes: string[],
): T[] {
  if (preferredShapes.length === 0) return products;
  const rank = new Map(preferredShapes.map((s, i) => [s, preferredShapes.length - i]));
  return [...products].sort((a, b) => (rank.get(b.frameShape ?? "") ?? 0) - (rank.get(a.frameShape ?? "") ?? 0));
}
