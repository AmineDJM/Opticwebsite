import { prisma, tenantClient } from "@optic/database";
import { resolveFeatures, siteConfigSchema, type SiteConfig } from "@optic/config";

/**
 * Extract a website's data from the database into the serialisable forms the exported
 * project consumes: a validated SiteConfig (identity/theme/features/pages/blocks) and a
 * seed payload (catalogue, brands, categories, shipping, quiz, CMS). Both are validated
 * before writing so an exported site always boots.
 */

export interface ExportData {
  config: SiteConfig;
  seed: SeedPayload;
  /** Media rows referenced by the site, for copying into public/media. */
  media: { key: string; url: string; filename: string }[];
}

export interface SeedPayload {
  categories: unknown[];
  brands: unknown[];
  products: unknown[];
  shippingZones: unknown[];
  coupons: unknown[];
  quiz: unknown | null;
  pages: unknown[];
  menus: unknown[];
}

export async function extractWebsite(websiteId: string): Promise<ExportData> {
  const db = tenantClient(websiteId);
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: { theme: true, settings: true, featureFlags: true, domains: true },
  });
  if (!website) throw new Error("Website not found");

  const featureOverrides: Record<string, boolean> = {};
  for (const f of website.featureFlags) featureOverrides[f.key] = f.enabled;
  const features = resolveFeatures(featureOverrides);

  // Media URL resolver for theme assets.
  const mediaIds = [website.theme?.logoMediaId, website.theme?.logoAltMediaId, website.theme?.faviconMediaId].filter(Boolean) as string[];
  const themeMedia = mediaIds.length ? await prisma.media.findMany({ where: { id: { in: mediaIds } }, select: { id: true, url: true } }) : [];
  const urlOf = (id: string | null | undefined) => (id ? themeMedia.find((m) => m.id === id)?.url : undefined);

  const settings = website.settings;
  const theme = website.theme;

  // Pages + blocks.
  const pages = await db.page.findMany({ where: { isPublished: true } as never, include: { blocks: { where: { isEnabled: true }, orderBy: { position: "asc" } } } });

  const configInput = {
    version: 1 as const,
    identity: {
      name: website.name,
      legalName: website.legalName ?? undefined,
      tagline: website.tagline ?? undefined,
      slug: website.slug,
      logoUrl: urlOf(theme?.logoMediaId),
      logoAltUrl: urlOf(theme?.logoAltMediaId),
      faviconUrl: urlOf(theme?.faviconMediaId),
      countryCode: website.countryCode,
      currency: website.currency,
      defaultLocale: website.defaultLocale as "fr" | "ar" | "en",
      locales: website.locales as ("fr" | "ar" | "en")[],
      timezone: website.timezone,
    },
    contact: (settings?.contact as Record<string, unknown>) ?? {},
    socials: (settings?.socials as Record<string, unknown>) ?? {},
    commerce: (settings?.commerce as Record<string, unknown>) ?? {},
    seo: (settings?.seo as Record<string, unknown>) ?? {},
    theme: theme
      ? { preset: theme.preset, colors: theme.colors, typography: theme.typography, layout: theme.layout, customTokens: theme.customTokens ?? undefined }
      : undefined,
    features: Object.fromEntries(Object.entries(features)),
    announcement: (settings?.announcement as { text: string; href?: string; enabled?: boolean } | null) ?? undefined,
    pages: (pages as never as { slug: string; title: string; kind: string; isPublished: boolean; isSystem: boolean; body: string | null; seo: unknown; blocks: { type: string; isEnabled: boolean; position: number; props: unknown }[] }[]).map((p) => ({
      slug: p.slug, title: p.title, kind: p.kind as "HOME" | "STANDARD" | "LEGAL" | "FAQ" | "CONTACT" | "LANDING",
      isPublished: p.isPublished, isSystem: p.isSystem, body: p.body ?? undefined, seo: (p.seo as Record<string, unknown>) ?? undefined,
      blocks: p.blocks.map((b) => ({ type: b.type, isEnabled: b.isEnabled, position: b.position, props: (b.props as Record<string, unknown>) ?? {} })),
    })),
  };

  const config = siteConfigSchema.parse(configInput);

  // Seed payload (full catalogue + logistics + quiz).
  const [categories, brands, products, shippingZones, coupons, quiz, menus] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" } as never }),
    db.brand.findMany({ orderBy: { position: "asc" } as never, include: { logo: { select: { url: true } } } }),
    db.product.findMany({ include: { variants: true, images: { include: { media: { select: { url: true } } }, orderBy: { position: "asc" } }, categories: { include: { category: { select: { slug: true } } } }, brand: { select: { slug: true } } } }),
    db.shippingZone.findMany({ include: { wilayas: true } }),
    db.coupon.findMany(),
    db.quiz.findFirst({ where: { isActive: true } as never, include: { sections: { orderBy: { position: "asc" } }, questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } }, section: { select: { key: true } } } }, rules: { orderBy: { position: "asc" } } } }),
    db.menu.findMany({ include: { items: { orderBy: { position: "asc" } } } }),
  ]);

  // Collect all referenced media for copying.
  const media = await db.media.findMany({ select: { key: true, url: true, filename: true } });

  return {
    config,
    seed: {
      categories: categories as unknown[],
      brands: brands as unknown[],
      products: products as unknown[],
      shippingZones: shippingZones as unknown[],
      coupons: coupons as unknown[],
      quiz: (quiz as unknown) ?? null,
      pages: configInput.pages,
      menus: menus as unknown[],
    },
    media: media as { key: string; url: string; filename: string }[],
  };
}
