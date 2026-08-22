import { prisma } from "./client.js";
import { tenantClient, type TenantClient } from "./tenant.js";
import { resolveFeatures, type FeatureFlags } from "@optic/config";

/**
 * Website context resolution. Every request in the storefront and admin resolves
 * exactly one tenant: from the pinned SITE_SLUG (single-tenant / exported deployment)
 * or from the Host header against the Domain table (multi-tenant hosting). The
 * resolved context carries the tenant-scoped client so downstream code cannot touch
 * another brand's data.
 */

export interface WebsiteContext {
  websiteId: string;
  slug: string;
  name: string;
  legalName: string | null;
  tagline: string | null;
  defaultLocale: string;
  locales: string[];
  currency: string;
  countryCode: string;
  timezone: string;
  status: string;
  features: FeatureFlags;
  theme: WebsiteTheme | null;
  settings: WebsiteSettings;
  db: TenantClient;
}

export interface WebsiteTheme {
  preset: string;
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  layout: Record<string, unknown>;
  customTokens: Record<string, string> | null;
  logoUrl: string | null;
  logoAltUrl: string | null;
  faviconUrl: string | null;
}

export interface WebsiteSettings {
  contact: Record<string, unknown>;
  socials: Record<string, unknown>;
  commerce: Record<string, unknown>;
  seo: Record<string, unknown>;
  legal: Record<string, unknown>;
  announcement: { text: string; href?: string; enabled?: boolean } | null;
}

async function loadContext(where: { slug: string } | { id: string }): Promise<WebsiteContext | null> {
  const website = await prisma.website.findUnique({
    where: where as { slug: string },
    include: {
      theme: true,
      settings: true,
      featureFlags: true,
    },
  });
  if (!website) return null;

  const featureOverrides: Record<string, boolean> = {};
  for (const flag of website.featureFlags) featureOverrides[flag.key] = flag.enabled;

  // Resolve media URLs for the theme (logo/favicon) in one extra query when needed.
  let theme: WebsiteTheme | null = null;
  if (website.theme) {
    const t = website.theme;
    const mediaIds = [t.logoMediaId, t.logoAltMediaId, t.faviconMediaId].filter(Boolean) as string[];
    const media = mediaIds.length
      ? await prisma.media.findMany({ where: { id: { in: mediaIds } }, select: { id: true, url: true } })
      : [];
    const urlOf = (id: string | null) => (id ? (media.find((m) => m.id === id)?.url ?? null) : null);
    theme = {
      preset: t.preset,
      colors: t.colors as Record<string, string>,
      typography: t.typography as Record<string, unknown>,
      layout: t.layout as Record<string, unknown>,
      customTokens: (t.customTokens as Record<string, string> | null) ?? null,
      logoUrl: urlOf(t.logoMediaId),
      logoAltUrl: urlOf(t.logoAltMediaId),
      faviconUrl: urlOf(t.faviconMediaId),
    };
  }

  const s = website.settings;
  const settings: WebsiteSettings = {
    contact: (s?.contact as Record<string, unknown>) ?? {},
    socials: (s?.socials as Record<string, unknown>) ?? {},
    commerce: (s?.commerce as Record<string, unknown>) ?? {},
    seo: (s?.seo as Record<string, unknown>) ?? {},
    legal: (s?.legal as Record<string, unknown>) ?? {},
    announcement: (s?.announcement as WebsiteSettings["announcement"]) ?? null,
  };

  return {
    websiteId: website.id,
    slug: website.slug,
    name: website.name,
    legalName: website.legalName,
    tagline: website.tagline,
    defaultLocale: website.defaultLocale,
    locales: website.locales,
    currency: website.currency,
    countryCode: website.countryCode,
    timezone: website.timezone,
    status: website.status,
    features: resolveFeatures(featureOverrides),
    theme,
    settings,
    db: tenantClient(website.id),
  };
}

/** Resolve by pinned slug (single-tenant deployments). */
export function resolveWebsiteBySlug(slug: string): Promise<WebsiteContext | null> {
  return loadContext({ slug });
}

/** Resolve by request hostname (multi-tenant hosting) via the Domain table. */
export async function resolveWebsiteByHost(hostname: string): Promise<WebsiteContext | null> {
  const host = hostname.split(":")[0]!.toLowerCase().replace(/^www\./, "");
  const domain = await prisma.domain.findFirst({
    where: { hostname: { in: [host, `www.${host}`] } },
    select: { websiteId: true },
  });
  if (!domain) return null;
  return loadContext({ id: domain.websiteId });
}

/**
 * The standard resolver: prefer the pinned SITE_SLUG; fall back to the Host header.
 * Throws if neither resolves — a misconfigured deployment should fail loudly.
 */
export async function resolveWebsite(opts: { slug?: string; host?: string }): Promise<WebsiteContext | null> {
  if (opts.slug) {
    const bySlug = await resolveWebsiteBySlug(opts.slug);
    if (bySlug) return bySlug;
  }
  if (opts.host) {
    const byHost = await resolveWebsiteByHost(opts.host);
    if (byHost) return byHost;
  }
  return null;
}
