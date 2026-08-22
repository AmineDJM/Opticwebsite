import type { TenantClient } from "../tenant.js";
import {
  buildProductWhere,
  buildProductOrderBy,
  type CatalogFilters,
} from "@optic/catalog";
import { pageToRange, paginate, type Paginated } from "@optic/core";

/**
 * Catalogue read repository. Executes the queries @optic/catalog builds, on the
 * tenant-scoped client (websiteId is injected by the client, never here). Returns
 * plain view models so the app and @optic/ui stay Prisma-free.
 */

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  priceCents: number;
  comparePriceCents: number | null;
  imageUrl: string | null;
  secondaryImageUrl: string | null;
  isNew: boolean;
  isBestseller: boolean;
  frameShape: string | null;
  inStock: boolean;
}

const PRODUCT_LIST_INCLUDE = {
  brand: { select: { name: true } },
  images: { orderBy: { position: "asc" }, take: 2, include: { media: { select: { url: true } } } },
  variants: { select: { stock: true, reserved: true } },
} as const;

function toListItem(p: {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  comparePriceCents: number | null;
  isNew: boolean;
  isBestseller: boolean;
  frameShape: string | null;
  brand: { name: string } | null;
  images: { media: { url: string } }[];
  variants: { stock: number; reserved: number }[];
}): ProductListItem {
  const inStock = p.variants.length === 0 || p.variants.some((v) => v.stock - v.reserved > 0);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandName: p.brand?.name ?? null,
    priceCents: p.priceCents,
    comparePriceCents: p.comparePriceCents,
    imageUrl: p.images[0]?.media.url ?? null,
    secondaryImageUrl: p.images[1]?.media.url ?? null,
    isNew: p.isNew,
    isBestseller: p.isBestseller,
    frameShape: p.frameShape,
    inStock,
  };
}

export async function listProducts(
  db: TenantClient,
  filters: CatalogFilters,
): Promise<Paginated<ProductListItem>> {
  const where = buildProductWhere(filters);
  const orderBy = buildProductOrderBy(filters.sort);
  const { skip, take } = pageToRange(filters.page);

  const [rows, total] = await Promise.all([
    db.product.findMany({ where: where as never, orderBy: orderBy as never, skip, take, include: PRODUCT_LIST_INCLUDE }),
    db.product.count({ where: where as never }),
  ]);

  return paginate(rows.map((r) => toListItem(r as never)), total, filters.page);
}

export async function getProductBySlug(db: TenantClient, slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" } as never,
    include: {
      brand: true,
      collection: true,
      categories: { include: { category: true } },
      images: { orderBy: { position: "asc" }, include: { media: true } },
      variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { include: { media: true } } } },
    },
  });
}

export async function listFeaturedProducts(
  db: TenantClient,
  source: "featured" | "bestsellers" | "new",
  limit: number,
): Promise<ProductListItem[]> {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (source === "featured") where.isFeatured = true;
  if (source === "bestsellers") where.isBestseller = true;
  if (source === "new") where.isNew = true;
  const orderBy = source === "new" ? [{ publishedAt: "desc" }] : [{ createdAt: "desc" }];
  const rows = await db.product.findMany({ where: where as never, orderBy: orderBy as never, take: limit, include: PRODUCT_LIST_INCLUDE });
  return rows.map((r) => toListItem(r as never));
}

export async function getProductsBySlugs(db: TenantClient, slugs: string[]): Promise<ProductListItem[]> {
  if (slugs.length === 0) return [];
  const rows = await db.product.findMany({
    where: { slug: { in: slugs }, status: "ACTIVE" } as never,
    include: PRODUCT_LIST_INCLUDE,
  });
  const bySlug = new Map(rows.map((r) => [(r as { slug: string }).slug, toListItem(r as never)]));
  return slugs.map((s) => bySlug.get(s)).filter((x): x is ProductListItem => !!x);
}

export async function listCategoryTree(db: TenantClient) {
  const categories = await db.category.findMany({
    where: { isActive: true } as never,
    orderBy: [{ position: "asc" }],
    include: { image: { select: { url: true } }, _count: { select: { products: true } } },
  });
  return categories;
}

export async function getCategoryBySlug(db: TenantClient, slug: string) {
  return db.category.findFirst({ where: { slug, isActive: true } as never, include: { image: true } });
}

export async function listBrands(db: TenantClient, opts: { featuredOnly?: boolean } = {}) {
  return db.brand.findMany({
    where: { isActive: true, ...(opts.featuredOnly ? { isFeatured: true } : {}) } as never,
    orderBy: [{ position: "asc" }],
    include: { logo: { select: { url: true } } },
  });
}

export async function getBrandBySlug(db: TenantClient, slug: string) {
  return db.brand.findFirst({ where: { slug, isActive: true } as never, include: { logo: true, cover: true } });
}

/** Lightweight search for the autocomplete (§8). */
export async function searchCatalog(db: TenantClient, query: string, limit = 8) {
  const q = query.trim();
  if (q.length < 2) return { products: [], brands: [], categories: [] };
  const [products, brands, categories] = await Promise.all([
    db.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      } as never,
      take: limit,
      include: PRODUCT_LIST_INCLUDE,
    }),
    db.brand.findMany({ where: { isActive: true, name: { contains: q, mode: "insensitive" } } as never, take: 4 }),
    db.category.findMany({ where: { isActive: true, name: { contains: q, mode: "insensitive" } } as never, take: 4 }),
  ]);
  return {
    products: products.map((p) => toListItem(p as never)),
    brands: brands.map((b) => ({ slug: (b as { slug: string }).slug, name: (b as { name: string }).name })),
    categories: categories.map((c) => ({ slug: (c as { slug: string }).slug, name: (c as { name: string }).name })),
  };
}
