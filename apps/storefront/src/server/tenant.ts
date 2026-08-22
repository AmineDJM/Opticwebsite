import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { resolveWebsite, type WebsiteContext } from "@optic/database";
import { negotiateLocale, isLocale, type Locale } from "@optic/i18n";

/**
 * Per-request tenant resolution for the storefront. `cache()` dedupes it across the
 * layout and every server component in one render. Pinned SITE_SLUG wins (single-tenant
 * / exported deployment); otherwise the Host header resolves the brand.
 */
export const getTenant = cache(async (): Promise<WebsiteContext> => {
  const slug = process.env.SITE_SLUG;
  const hdrs = await headers();
  const host = hdrs.get("host") ?? undefined;

  const context = await resolveWebsite({ slug, host });
  if (!context) {
    throw new Error(
      `No website resolved. Set SITE_SLUG (current: ${slug ?? "unset"}) or configure a Domain for host "${host}".`,
    );
  }
  return context;
});

/** Resolve the active locale from cookie override, then Accept-Language, then default. */
export const getLocale = cache(async (): Promise<Locale> => {
  const tenant = await getTenant();
  const hdrs = await headers();
  const cookieLocale = hdrs.get("x-optic-locale");
  if (cookieLocale && isLocale(cookieLocale) && tenant.locales.includes(cookieLocale)) {
    return cookieLocale;
  }
  return negotiateLocale(hdrs.get("accept-language"), tenant.locales as Locale[], tenant.defaultLocale as Locale);
});
