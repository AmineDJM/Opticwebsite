import type { MetadataRoute } from "next";
import { getTenant } from "../server/tenant.js";

/** robots.txt (§29). Honors the site's indexable setting. */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await getTenant();
  const seo = tenant.settings.seo as { indexable?: boolean };
  const base = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "";
  if (seo.indexable === false) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panier", "/checkout", "/compte", "/api/"] },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
