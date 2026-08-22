import type { MetadataRoute } from "next";
import { getTenant } from "../server/tenant.js";
import { listCategoryTree, listBrands } from "@optic/database";

/** Dynamic sitemap (§29): home, catalogue, categories, brands, published products, CMS pages. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await getTenant();
  const base = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "";
  const seo = tenant.settings.seo as { indexable?: boolean };
  if (seo.indexable === false) return [];

  const [categories, brands, products, pages] = await Promise.all([
    listCategoryTree(tenant.db),
    listBrands(tenant.db),
    tenant.db.product.findMany({ where: { status: "ACTIVE" } as never, select: { slug: true, updatedAt: true }, take: 5000 }),
    tenant.db.page.findMany({ where: { isPublished: true, kind: { not: "HOME" } } as never, select: { slug: true, updatedAt: true } }),
  ]);

  const url = (path: string) => `${base}${path}`;
  const entries: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/boutique"), changeFrequency: "daily", priority: 0.9 },
  ];
  for (const c of categories as { slug: string }[]) entries.push({ url: url(`/categorie/${c.slug}`), changeFrequency: "weekly", priority: 0.8 });
  for (const b of brands as { slug: string }[]) entries.push({ url: url(`/marques/${b.slug}`), changeFrequency: "weekly", priority: 0.6 });
  for (const p of products as { slug: string; updatedAt: Date }[]) entries.push({ url: url(`/produit/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.7 });
  for (const p of pages as { slug: string; updatedAt: Date }[]) entries.push({ url: url(`/page/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly", priority: 0.3 });
  return entries;
}
