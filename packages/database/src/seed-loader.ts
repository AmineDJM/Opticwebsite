import { prisma } from "./client.js";

/**
 * Data-driven site loader. Turns a SiteConfig + seed payload (as produced by
 * @optic/exporter's `extractWebsite`) into database rows. Used by the exported project's
 * `db:seed`. Idempotent: safe to run repeatedly. Also seeds the global Algeria wilaya
 * reference data on first run.
 *
 * This is the inverse of the exporter's extraction, and the reason an exported site boots
 * with the exact catalogue/branding it was previewed with.
 */

interface SiteConfigLike {
  identity: { name: string; legalName?: string; tagline?: string; slug: string; countryCode: string; currency: string; defaultLocale: string; locales: string[]; timezone: string; logoUrl?: string; faviconUrl?: string };
  contact: Record<string, unknown>;
  socials: Record<string, unknown>;
  commerce: Record<string, unknown>;
  seo: Record<string, unknown>;
  theme?: { preset: string; colors: unknown; typography: unknown; layout: unknown; customTokens?: unknown };
  features: Record<string, boolean>;
  announcement?: { text: string; href?: string; enabled?: boolean };
  pages: { slug: string; title: string; kind: string; isPublished: boolean; isSystem?: boolean; body?: string; seo?: unknown; blocks: { type: string; isEnabled: boolean; position: number; props: unknown }[] }[];
}

interface SeedPayloadLike {
  categories: { slug: string; name: string; description?: string | null; kind?: string; position?: number; isActive?: boolean; parentSlug?: string | null; parentId?: string | null }[];
  brands: { slug: string; name: string; description?: string | null; story?: string | null; isExclusive?: boolean; isFeatured?: boolean; position?: number; isActive?: boolean; logo?: { url: string } | null }[];
  products: {
    sku: string; slug: string; name: string; shortDescription?: string | null; description?: string | null; status?: string; gender?: string; ageGroup?: string;
    priceCents: number; comparePriceCents?: number | null; isNew?: boolean; isBestseller?: boolean; isFeatured?: boolean;
    frameShape?: string | null; frameMaterial?: string | null; frameType?: string | null; colorPrimary?: string | null;
    lensWidthMm?: number | null; bridgeWidthMm?: number | null; templeLengthMm?: number | null; weightGrams?: number | null;
    lensCompatibility?: string[]; recommendedFaceShapes?: string[]; recommendedColors?: string[]; recommendedUndertones?: string[]; avoidFaceShapes?: string[]; styleProfiles?: string[];
    brand?: { slug: string } | null; categories?: { category: { slug: string } }[];
    images?: { kind?: string; position?: number; alt?: string | null; media: { url: string } }[];
    variants?: { sku: string; name: string; colorName?: string | null; colorHex?: string | null; size?: string | null; priceCents?: number | null; stock: number; position?: number }[];
  }[];
  shippingZones: { name: string; homeDeliveryCents?: number | null; deskDeliveryCents?: number | null; freeShippingThresholdCents?: number | null; estimatedDaysMin?: number; estimatedDaysMax?: number; carrierKey?: string | null; codAllowed?: boolean; position?: number; isActive?: boolean; wilayas?: { wilayaCode: string; isAvailable?: boolean; homeDeliveryCents?: number | null; deskDeliveryCents?: number | null }[] }[];
  coupons: { code: string; type: string; value: number; minSubtotalCents?: number; maxDiscountCents?: number | null; usageLimit?: number | null; isActive?: boolean }[];
  quiz: {
    key: string; name: string; disclaimer?: string | null;
    sections: { key: string; title: string; subtitle?: string | null; position?: number }[];
    questions: { key: string; label: string; helpText?: string | null; type: string; position?: number; isRequired?: boolean; config?: unknown; showIf?: unknown; section?: { key: string } | null; options: { key: string; label: string; helpText?: string | null; iconKey?: string | null; weights: unknown; position?: number }[] }[];
    rules: { key: string; description?: string | null; conditions: unknown; effects: unknown; position?: number; isActive?: boolean }[];
  } | null;
  menus: { key: string; name: string; items: { label: string; url: string; position?: number; isNew?: boolean }[] }[];
}

export async function loadSiteFromConfig(config: SiteConfigLike, seed: SeedPayloadLike): Promise<{ websiteId: string }> {
  await seedWilayas();

  // Website
  const website = await prisma.website.upsert({
    where: { slug: config.identity.slug },
    update: { name: config.identity.name, status: "ACTIVE" },
    create: {
      slug: config.identity.slug, name: config.identity.name, legalName: config.identity.legalName ?? null,
      tagline: config.identity.tagline ?? null, status: "ACTIVE", defaultLocale: config.identity.defaultLocale,
      locales: config.identity.locales, currency: config.identity.currency, countryCode: config.identity.countryCode, timezone: config.identity.timezone,
    },
  });
  const websiteId = website.id;

  // Media: recreate rows for every referenced URL so foreign keys resolve.
  const mediaByUrl = new Map<string, string>();
  const ensureMedia = async (url: string, alt?: string | null): Promise<string> => {
    if (mediaByUrl.has(url)) return mediaByUrl.get(url)!;
    const key = url.replace(/^\/media\//, "").replace(/^\//, "");
    const media = await prisma.media.upsert({
      where: { websiteId_key: { websiteId, key } },
      update: { url },
      create: { websiteId, key, url, filename: key.split("/").pop() ?? "media", mimeType: guessMime(key), sizeBytes: 0, alt: alt ?? null, folder: "/" + key.split("/").slice(0, -1).join("/") },
    });
    mediaByUrl.set(url, media.id);
    return media.id;
  };

  // Theme
  if (config.theme) {
    const logoId = config.identity.logoUrl ? await ensureMedia(config.identity.logoUrl, config.identity.name) : null;
    const faviconId = config.identity.faviconUrl ? await ensureMedia(config.identity.faviconUrl, config.identity.name) : null;
    await prisma.theme.upsert({
      where: { websiteId },
      update: { preset: config.theme.preset, colors: config.theme.colors as never, typography: config.theme.typography as never, layout: config.theme.layout as never, logoMediaId: logoId, faviconMediaId: faviconId },
      create: { websiteId, preset: config.theme.preset, colors: config.theme.colors as never, typography: config.theme.typography as never, layout: config.theme.layout as never, customTokens: (config.theme.customTokens ?? undefined) as never, logoMediaId: logoId, faviconMediaId: faviconId },
    });
  }

  // Settings
  await prisma.siteSettings.upsert({
    where: { websiteId },
    update: { contact: config.contact as never, socials: config.socials as never, commerce: config.commerce as never, seo: config.seo as never, announcement: (config.announcement ?? null) as never },
    create: { websiteId, contact: config.contact as never, socials: config.socials as never, commerce: config.commerce as never, seo: config.seo as never, announcement: (config.announcement ?? null) as never },
  });

  // Features
  for (const [key, enabled] of Object.entries(config.features)) {
    await prisma.featureFlag.upsert({ where: { websiteId_key: { websiteId, key } }, update: { enabled }, create: { websiteId, key, enabled } });
  }
  await prisma.analyticsConfiguration.upsert({ where: { websiteId }, update: {}, create: { websiteId, provider: "none" } });

  // Categories (two passes for parents).
  const catBySlug = new Map<string, string>();
  for (const c of seed.categories) {
    const cat = await prisma.category.upsert({
      where: { websiteId_slug: { websiteId, slug: c.slug } },
      update: { name: c.name, kind: (c.kind as never) ?? "GENERIC", position: c.position ?? 0, isActive: c.isActive ?? true },
      create: { websiteId, slug: c.slug, name: c.name, description: c.description ?? null, kind: (c.kind as never) ?? "GENERIC", position: c.position ?? 0, isActive: c.isActive ?? true },
    });
    catBySlug.set(c.slug, cat.id);
  }
  // link parents by parentSlug when present
  for (const c of seed.categories) {
    if (c.parentSlug && catBySlug.has(c.parentSlug)) {
      await prisma.category.update({ where: { id: catBySlug.get(c.slug)! }, data: { parentId: catBySlug.get(c.parentSlug)! } });
    }
  }

  // Brands
  const brandBySlug = new Map<string, string>();
  for (const b of seed.brands) {
    const logoId = b.logo?.url ? await ensureMedia(b.logo.url, b.name) : null;
    const brand = await prisma.brand.upsert({
      where: { websiteId_slug: { websiteId, slug: b.slug } },
      update: { name: b.name, description: b.description ?? null, story: b.story ?? null, isExclusive: !!b.isExclusive, isFeatured: !!b.isFeatured, logoMediaId: logoId },
      create: { websiteId, slug: b.slug, name: b.name, description: b.description ?? null, story: b.story ?? null, isExclusive: !!b.isExclusive, isFeatured: !!b.isFeatured, position: b.position ?? 0, isActive: b.isActive ?? true, logoMediaId: logoId },
    });
    brandBySlug.set(b.slug, brand.id);
  }

  // Products
  for (const p of seed.products) {
    const brandId = p.brand?.slug ? brandBySlug.get(p.brand.slug) ?? null : null;
    const product = await prisma.product.upsert({
      where: { websiteId_sku: { websiteId, sku: p.sku } },
      update: { name: p.name, priceCents: p.priceCents, comparePriceCents: p.comparePriceCents ?? null, status: (p.status as never) ?? "ACTIVE" },
      create: {
        websiteId, brandId, sku: p.sku, slug: p.slug, name: p.name, shortDescription: p.shortDescription ?? null, description: p.description ?? null,
        status: (p.status as never) ?? "ACTIVE", gender: (p.gender as never) ?? "UNISEX", ageGroup: (p.ageGroup as never) ?? "ADULT",
        priceCents: p.priceCents, comparePriceCents: p.comparePriceCents ?? null, isNew: !!p.isNew, isBestseller: !!p.isBestseller, isFeatured: !!p.isFeatured,
        frameShape: p.frameShape ?? null, frameMaterial: p.frameMaterial ?? null, frameType: p.frameType ?? null, colorPrimary: p.colorPrimary ?? null,
        lensWidthMm: p.lensWidthMm ?? null, bridgeWidthMm: p.bridgeWidthMm ?? null, templeLengthMm: p.templeLengthMm ?? null, weightGrams: p.weightGrams ?? null,
        lensCompatibility: p.lensCompatibility ?? [], recommendedFaceShapes: p.recommendedFaceShapes ?? [], recommendedColors: p.recommendedColors ?? [], recommendedUndertones: p.recommendedUndertones ?? [], avoidFaceShapes: p.avoidFaceShapes ?? [], styleProfiles: p.styleProfiles ?? [],
        publishedAt: (p.status ?? "ACTIVE") === "ACTIVE" ? new Date() : null,
      },
    });

    // Categories
    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    for (const link of p.categories ?? []) {
      const catId = catBySlug.get(link.category.slug);
      if (catId) await prisma.productCategory.create({ data: { productId: product.id, categoryId: catId } }).catch(() => undefined);
    }

    // Images
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (const img of p.images ?? []) {
      const mediaId = await ensureMedia(img.media.url, img.alt ?? p.name);
      await prisma.productImage.create({ data: { websiteId, productId: product.id, mediaId, kind: (img.kind as never) ?? "GALLERY", position: img.position ?? 0, alt: img.alt ?? p.name } });
    }

    // Variants
    for (let i = 0; i < (p.variants ?? []).length; i++) {
      const v = p.variants![i]!;
      await prisma.productVariant.upsert({
        where: { websiteId_sku: { websiteId, sku: v.sku } },
        update: { stock: v.stock, priceCents: v.priceCents ?? null, name: v.name, colorName: v.colorName ?? null, colorHex: v.colorHex ?? null, size: v.size ?? null },
        create: { websiteId, productId: product.id, sku: v.sku, name: v.name, colorName: v.colorName ?? null, colorHex: v.colorHex ?? null, size: v.size ?? null, priceCents: v.priceCents ?? null, stock: v.stock, position: v.position ?? i },
      });
    }
  }

  // Shipping zones
  for (const z of seed.shippingZones) {
    const zone = await prisma.shippingZone.upsert({
      where: { websiteId_name: { websiteId, name: z.name } },
      update: { homeDeliveryCents: z.homeDeliveryCents ?? null, deskDeliveryCents: z.deskDeliveryCents ?? null, isActive: z.isActive ?? true },
      create: { websiteId, name: z.name, homeDeliveryCents: z.homeDeliveryCents ?? null, deskDeliveryCents: z.deskDeliveryCents ?? null, freeShippingThresholdCents: z.freeShippingThresholdCents ?? null, estimatedDaysMin: z.estimatedDaysMin ?? 2, estimatedDaysMax: z.estimatedDaysMax ?? 5, carrierKey: z.carrierKey ?? null, codAllowed: z.codAllowed ?? true, position: z.position ?? 0, isActive: z.isActive ?? true },
    });
    for (const w of z.wilayas ?? []) {
      await prisma.shippingZoneWilaya.upsert({
        where: { zoneId_wilayaCode: { zoneId: zone.id, wilayaCode: w.wilayaCode } },
        update: { isAvailable: w.isAvailable ?? true, homeDeliveryCents: w.homeDeliveryCents ?? null, deskDeliveryCents: w.deskDeliveryCents ?? null },
        create: { zoneId: zone.id, wilayaCode: w.wilayaCode, isAvailable: w.isAvailable ?? true, homeDeliveryCents: w.homeDeliveryCents ?? null, deskDeliveryCents: w.deskDeliveryCents ?? null },
      }).catch(() => undefined);
    }
  }

  // Coupons
  for (const c of seed.coupons) {
    await prisma.coupon.upsert({
      where: { websiteId_code: { websiteId, code: c.code } },
      update: { value: c.value, type: c.type as never, isActive: c.isActive ?? true },
      create: { websiteId, code: c.code, type: c.type as never, value: c.value, minSubtotalCents: c.minSubtotalCents ?? 0, maxDiscountCents: c.maxDiscountCents ?? null, usageLimit: c.usageLimit ?? null, isActive: c.isActive ?? true },
    });
  }

  // Quiz
  if (seed.quiz) await loadQuiz(websiteId, seed.quiz);

  // Pages + blocks
  for (const page of config.pages) {
    const row = await prisma.page.upsert({
      where: { websiteId_slug: { websiteId, slug: page.slug } },
      update: { title: page.title, kind: page.kind as never, isPublished: page.isPublished, body: page.body ?? null },
      create: { websiteId, slug: page.slug, title: page.title, kind: page.kind as never, isPublished: page.isPublished, isSystem: page.isSystem ?? false, body: page.body ?? null, seo: (page.seo ?? undefined) as never },
    });
    await prisma.contentBlock.deleteMany({ where: { pageId: row.id } });
    for (let i = 0; i < page.blocks.length; i++) {
      const b = page.blocks[i]!;
      await prisma.contentBlock.create({ data: { websiteId, pageId: row.id, type: b.type, isEnabled: b.isEnabled, position: i, props: (b.props ?? {}) as never } });
    }
  }

  // Menus
  for (const menu of seed.menus) {
    const row = await prisma.menu.upsert({ where: { websiteId_key: { websiteId, key: menu.key } }, update: { name: menu.name }, create: { websiteId, key: menu.key, name: menu.name } });
    await prisma.menuItem.deleteMany({ where: { menuId: row.id } });
    for (let i = 0; i < menu.items.length; i++) {
      const it = menu.items[i]!;
      await prisma.menuItem.create({ data: { menuId: row.id, label: it.label, url: it.url, position: it.position ?? i, isNew: !!it.isNew } });
    }
  }

  return { websiteId };
}

async function loadQuiz(websiteId: string, quiz: NonNullable<SeedPayloadLike["quiz"]>): Promise<void> {
  const row = await prisma.quiz.upsert({
    where: { websiteId_key: { websiteId, key: quiz.key } },
    update: { name: quiz.name, disclaimer: quiz.disclaimer ?? null },
    create: { websiteId, key: quiz.key, name: quiz.name, disclaimer: quiz.disclaimer ?? null, isActive: true },
  });
  await prisma.quizRule.deleteMany({ where: { quizId: row.id } });
  await prisma.quizQuestion.deleteMany({ where: { quizId: row.id } });
  await prisma.quizSection.deleteMany({ where: { quizId: row.id } });

  const sectionIds = new Map<string, string>();
  for (let i = 0; i < quiz.sections.length; i++) {
    const s = quiz.sections[i]!;
    const sec = await prisma.quizSection.create({ data: { quizId: row.id, key: s.key, title: s.title, subtitle: s.subtitle ?? null, position: s.position ?? i } });
    sectionIds.set(s.key, sec.id);
  }
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i]!;
    const question = await prisma.quizQuestion.create({
      data: { quizId: row.id, sectionId: q.section?.key ? sectionIds.get(q.section.key) ?? null : null, key: q.key, label: q.label, helpText: q.helpText ?? null, type: q.type as never, position: q.position ?? i, isRequired: q.isRequired ?? true, config: (q.config ?? undefined) as never, showIf: (q.showIf ?? undefined) as never },
    });
    for (let j = 0; j < q.options.length; j++) {
      const o = q.options[j]!;
      await prisma.quizOption.create({ data: { questionId: question.id, key: o.key, label: o.label, helpText: o.helpText ?? null, iconKey: o.iconKey ?? null, weights: (o.weights ?? {}) as never, position: o.position ?? j } });
    }
  }
  for (let i = 0; i < quiz.rules.length; i++) {
    const r = quiz.rules[i]!;
    await prisma.quizRule.create({ data: { quizId: row.id, key: r.key, description: r.description ?? null, conditions: r.conditions as never, effects: r.effects as never, position: r.position ?? i, isActive: r.isActive ?? true } });
  }
}

async function seedWilayas(): Promise<void> {
  const count = await prisma.wilaya.count();
  if (count >= 58) return; // already seeded
  const { WILAYAS } = await import("../prisma/seed-data/wilayas.js");
  for (const w of WILAYAS) {
    await prisma.wilaya.upsert({ where: { code: w.code }, update: { nameFr: w.nameFr, nameAr: w.nameAr }, create: { code: w.code, nameFr: w.nameFr, nameAr: w.nameAr } });
    for (const commune of w.communes) {
      const existing = await prisma.commune.findFirst({ where: { wilayaCode: w.code, nameFr: commune } });
      if (!existing) await prisma.commune.create({ data: { wilayaCode: w.code, nameFr: commune } });
    }
  }
}

function guessMime(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  return ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
}
