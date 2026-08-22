/**
 * Aura Optique seed (§43). Idempotent: safe to run repeatedly. Creates:
 *  - global wilaya/commune reference data
 *  - the Aura Optique website (identity, theme, settings, features, analytics)
 *  - system roles + a demo admin user
 *  - the category tree, brands (incl. exclusive Momus), demo products + variants
 *  - placeholder media (clearly marked DÉMO)
 *  - shipping zones covering Algeria
 *  - coupons, the 20-question quiz, homepage blocks, CMS pages, menus
 *
 * Everything is DATA — nothing here is special-cased in the engine.
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
for (const c of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(c)) { loadEnv({ path: c }); break; }
}

import { prisma } from "../src/client.js";
import { hashPassword } from "@optic/auth";
import { SYSTEM_ROLES } from "@optic/auth";
import { DEFAULT_QUIZ } from "@optic/quiz-engine";
import { themeFromPalette } from "@optic/theming";
import { slugify } from "@optic/core";
import { WILAYAS } from "./seed-data/wilayas.js";
import {
  AURA_BRANDS, AURA_CATEGORIES, AURA_PRODUCTS, AURA_CONTACT_PRODUCTS, AURA_COUPONS,
  AURA_PRIMARY, AURA_ACCENT, auraColors, type DemoProduct,
} from "./seed-data/aura.js";
import { writePlaceholderImage, writeBannerImage, writeLogo } from "./seed-data/placeholders.js";

const SLUG = "aura-optique";
const DEMO_ADMIN_EMAIL = "admin@aura-optique.demo";
const DEMO_ADMIN_PASSWORD = "AuraOptique2026!";

async function main() {
  console.info("🌱 Seeding Aura Optique…");

  await seedWilayas();
  const website = await seedWebsite();
  await seedRolesAndAdmin(website.id);
  const brandMap = await seedBrands(website.id);
  const categoryMap = await seedCategories(website.id);
  await seedProducts(website.id, brandMap, categoryMap, [...AURA_PRODUCTS, ...AURA_CONTACT_PRODUCTS]);
  await seedShipping(website.id);
  await seedCoupons(website.id);
  await seedQuiz(website.id);
  await seedContent(website.id, categoryMap, brandMap);

  console.info("\n✅ Seed complete.");
  console.info("   Storefront demo:  http://localhost:3000");
  console.info("   Admin demo:       http://localhost:3001");
  console.info(`   Admin login:      ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
  console.info("   Generator:        http://localhost:3002 (platform admin uses the same login)");
}

async function seedWilayas() {
  console.info("  • Wilayas & communes…");
  for (const w of WILAYAS) {
    await prisma.wilaya.upsert({
      where: { code: w.code },
      update: { nameFr: w.nameFr, nameAr: w.nameAr },
      create: { code: w.code, nameFr: w.nameFr, nameAr: w.nameAr },
    });
    for (const communeName of w.communes) {
      const existing = await prisma.commune.findFirst({ where: { wilayaCode: w.code, nameFr: communeName } });
      if (!existing) {
        await prisma.commune.create({ data: { wilayaCode: w.code, nameFr: communeName } });
      }
    }
  }
}

async function media(websiteId: string, key: string, out: { url: string; width: number; height: number; bytes: number }, alt: string) {
  return prisma.media.upsert({
    where: { websiteId_key: { websiteId, key } },
    update: { url: out.url, width: out.width, height: out.height, sizeBytes: out.bytes, alt },
    create: {
      websiteId, key, url: out.url, filename: key.split("/").pop()!, mimeType: "image/svg+xml",
      sizeBytes: out.bytes, width: out.width, height: out.height, alt, folder: "/" + key.split("/").slice(0, -1).join("/"),
    },
  });
}

async function seedWebsite() {
  console.info("  • Website, theme, settings, features…");
  const website = await prisma.website.upsert({
    where: { slug: SLUG },
    update: { status: "ACTIVE" },
    create: {
      slug: SLUG, name: "Aura Optique", legalName: "Aura Optique SARL",
      tagline: "Votre regard, sublimé", status: "ACTIVE",
      defaultLocale: "fr", locales: ["fr", "ar", "en"], currency: "DZD", countryCode: "DZ", timezone: "Africa/Algiers",
    },
  });

  const logo = await media(website.id, "brand/aura-logo.svg", await writeLogo("brand/aura-logo.svg", "Aura Optique", AURA_PRIMARY, AURA_ACCENT), "Aura Optique");
  const favicon = await media(website.id, "brand/aura-favicon.svg", await writeLogo("brand/aura-favicon.svg", "A", AURA_PRIMARY, AURA_ACCENT), "Aura");

  const theme = themeFromPalette([AURA_PRIMARY, "#123c4a", AURA_ACCENT], "clinical", "light");
  theme.colors = auraColors;
  await prisma.theme.upsert({
    where: { websiteId: website.id },
    update: { colors: theme.colors, typography: theme.typography, layout: theme.layout, logoMediaId: logo.id, faviconMediaId: favicon.id },
    create: {
      websiteId: website.id, preset: "clinical",
      colors: theme.colors, typography: theme.typography, layout: theme.layout,
      logoMediaId: logo.id, faviconMediaId: favicon.id,
    },
  });

  await prisma.siteSettings.upsert({
    where: { websiteId: website.id },
    update: {},
    create: {
      websiteId: website.id,
      contact: { phone: "+213 5 50 00 00 00", whatsapp: "+213550000000", email: "contact@aura-optique.demo", address: "12 Rue Didouche Mourad", city: "Alger", openingHours: "Sam–Jeu 9h–18h" },
      socials: { instagram: "aura.optique", facebook: "auraoptique", tiktok: "aura.optique" },
      commerce: { requireEmailAtCheckout: false, requireAccountToOrder: false, stockStrategy: "reserve", lowStockThreshold: 3, freeShippingThresholdCents: 1500000, returnPolicyDays: 14, showComparePrice: true },
      seo: { titleTemplate: "%s — Aura Optique", defaultTitle: "Aura Optique — Lunettes & optique premium", defaultDescription: "Montures, solaires et lentilles. Visagisme, essayage virtuel et paiement à la livraison.", indexable: true },
      legal: { rc: "RC-DEMO-0000", nif: "NIF-DEMO", returnPolicy: "Échange sous 14 jours." },
      announcement: { text: "Livraison partout en Algérie • Paiement à la livraison", enabled: true },
    },
  });

  const features: Record<string, boolean> = {
    accounts: true, guestCheckout: true, coupons: true, favorites: true, reviews: false,
    visagism: true, visagismCamera: true, virtualTryOn: true, lensQuiz: true,
    recentlyViewed: true, newsletter: true, search: true, relatedProducts: true,
    announcementBar: true, multiCurrency: false, instagramFeed: false,
  };
  for (const [key, enabled] of Object.entries(features)) {
    await prisma.featureFlag.upsert({
      where: { websiteId_key: { websiteId: website.id, key } },
      update: { enabled },
      create: { websiteId: website.id, key, enabled },
    });
  }

  await prisma.analyticsConfiguration.upsert({
    where: { websiteId: website.id },
    update: {},
    create: { websiteId: website.id, provider: "none", consentMode: true },
  });

  await prisma.domain.upsert({
    where: { hostname: "aura-optique.local" },
    update: {},
    create: { websiteId: website.id, hostname: "aura-optique.local", isPrimary: true },
  });

  return website;
}

async function seedRolesAndAdmin(websiteId: string) {
  console.info("  • Roles & demo admin…");
  const roleIds = new Map<string, string>();
  for (const tpl of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { websiteId_key: { websiteId, key: tpl.key } },
      update: { permissions: tpl.permissions as string[], name: tpl.name, description: tpl.description },
      create: { websiteId, key: tpl.key, name: tpl.name, description: tpl.description, isSystem: true, permissions: tpl.permissions as string[] },
    });
    roleIds.set(tpl.key, role.id);
  }

  const passwordHash = await hashPassword(DEMO_ADMIN_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: { isPlatformAdmin: true, isActive: true },
    create: { email: DEMO_ADMIN_EMAIL, name: "Admin Démo", passwordHash, isPlatformAdmin: true, isActive: true },
  });

  await prisma.membership.upsert({
    where: { userId_websiteId: { userId: user.id, websiteId } },
    update: { roleId: roleIds.get("site_owner")! },
    create: { userId: user.id, websiteId, roleId: roleIds.get("site_owner")! },
  });
}

async function seedBrands(websiteId: string) {
  console.info("  • Brands…");
  const map = new Map<string, string>();
  let position = 0;
  for (const b of AURA_BRANDS) {
    const logo = await media(websiteId, `brands/${b.slug}.svg`, await writeLogo(`brands/${b.slug}.svg`, b.name, AURA_PRIMARY, AURA_ACCENT), b.name);
    const brand = await prisma.brand.upsert({
      where: { websiteId_slug: { websiteId, slug: b.slug } },
      update: { name: b.name, description: b.description, isExclusive: !!b.isExclusive, isFeatured: !!b.isFeatured },
      create: {
        websiteId, slug: b.slug, name: b.name, description: b.description, story: "story" in b ? (b as { story?: string }).story : undefined,
        isExclusive: !!b.isExclusive, isFeatured: !!b.isFeatured, position: position++, logoMediaId: logo.id,
      },
    });
    map.set(b.slug, brand.id);
  }
  return map;
}

async function seedCategories(websiteId: string) {
  console.info("  • Categories…");
  const map = new Map<string, string>();
  let position = 0;
  for (const parent of AURA_CATEGORIES) {
    const p = await prisma.category.upsert({
      where: { websiteId_slug: { websiteId, slug: parent.slug } },
      update: { name: parent.name, kind: parent.kind },
      create: { websiteId, slug: parent.slug, name: parent.name, kind: parent.kind, position: position++, isActive: true },
    });
    map.set(parent.slug, p.id);
    let childPos = 0;
    for (const child of parent.children) {
      const c = await prisma.category.upsert({
        where: { websiteId_slug: { websiteId, slug: child.slug } },
        update: { name: child.name, parentId: p.id },
        create: { websiteId, slug: child.slug, name: child.name, parentId: p.id, kind: parent.kind, position: childPos++, isActive: true },
      });
      map.set(child.slug, c.id);
    }
  }
  return map;
}

async function seedProducts(websiteId: string, brands: Map<string, string>, categories: Map<string, string>, products: DemoProduct[]) {
  console.info(`  • Products (${products.length})…`);
  const bgFor = (brand: string) => (brand === "momus" ? "#123c4a" : brand === "solis" ? "#1b2a4a" : AURA_PRIMARY);
  for (const p of products) {
    const brandId = brands.get(p.brand) ?? null;
    const product = await prisma.product.upsert({
      where: { websiteId_sku: { websiteId, sku: p.sku } },
      update: {
        name: p.name, priceCents: p.priceCents, comparePriceCents: p.comparePriceCents ?? null,
        status: "ACTIVE", isNew: !!p.isNew, isBestseller: !!p.isBestseller, isFeatured: !!p.isFeatured, publishedAt: new Date(),
      },
      create: {
        websiteId, brandId, sku: p.sku, slug: p.slug, name: p.name, shortDescription: p.shortDescription, description: p.description,
        status: "ACTIVE", gender: p.gender, ageGroup: p.ageGroup, priceCents: p.priceCents, comparePriceCents: p.comparePriceCents ?? null,
        isNew: !!p.isNew, isBestseller: !!p.isBestseller, isFeatured: !!p.isFeatured, publishedAt: new Date(),
        frameShape: p.frameShape ?? null, frameMaterial: p.frameMaterial ?? null, frameType: p.frameType ?? null,
        colorPrimary: p.colorPrimary ?? null, lensWidthMm: p.lensWidthMm ?? null, bridgeWidthMm: p.bridgeWidthMm ?? null,
        templeLengthMm: p.templeLengthMm ?? null, weightGrams: p.weightGrams ?? null,
        lensCompatibility: p.lensCompatibility ?? [], recommendedFaceShapes: p.recommendedFaceShapes ?? [],
        recommendedColors: p.recommendedColors ?? [], recommendedUndertones: p.recommendedUndertones ?? [],
        avoidFaceShapes: p.avoidFaceShapes ?? [], styleProfiles: p.styleProfiles ?? [],
      },
    });

    // Categories
    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    for (const slug of p.categorySlugs) {
      const catId = categories.get(slug);
      if (catId) await prisma.productCategory.create({ data: { productId: product.id, categoryId: catId } });
    }

    // Main image + gallery
    const img = await media(websiteId, `products/${p.slug}.svg`, await writePlaceholderImage(`products/${p.slug}.svg`, { label: p.name, sublabel: p.brand, bg: bgFor(p.brand), accent: AURA_ACCENT, shape: p.frameShape }), p.name);
    const img2 = await media(websiteId, `products/${p.slug}-2.svg`, await writePlaceholderImage(`products/${p.slug}-2.svg`, { label: p.name, sublabel: "profil", bg: "#1c2b33", accent: AURA_ACCENT, shape: p.frameShape }), `${p.name} profil`);
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({ data: { websiteId, productId: product.id, mediaId: img.id, kind: "MAIN", position: 0, alt: p.name } });
    await prisma.productImage.create({ data: { websiteId, productId: product.id, mediaId: img2.id, kind: "PROFILE", position: 1, alt: `${p.name} profil` } });

    // Variants
    for (let i = 0; i < p.variants.length; i++) {
      const v = p.variants[i]!;
      await prisma.productVariant.upsert({
        where: { websiteId_sku: { websiteId, sku: v.sku } },
        update: { stock: v.stock, priceCents: v.priceCents ?? null, name: v.name, colorName: v.colorName, colorHex: v.colorHex },
        create: {
          websiteId, productId: product.id, sku: v.sku, name: v.name, colorName: v.colorName, colorHex: v.colorHex,
          size: v.size ?? null, stock: v.stock, priceCents: v.priceCents ?? null, position: i, isActive: true,
        },
      });
    }
  }
}

async function seedShipping(websiteId: string) {
  console.info("  • Shipping zones…");
  const zones = [
    { name: "Grand Alger", codes: ["16", "09", "35", "42"], home: 40000, desk: 25000, days: [1, 2] },
    { name: "Nord", codes: ["06", "15", "19", "25", "23", "21", "18", "31", "13", "22", "27", "29", "44", "02", "10", "34", "43"], home: 60000, desk: 35000, days: [2, 4] },
    { name: "Hauts-Plateaux", codes: ["05", "04", "12", "40", "28", "17", "03", "14", "20", "24", "41", "38", "48", "46"], home: 70000, desk: 45000, days: [3, 5] },
    { name: "Sud", codes: ["01", "07", "08", "11", "30", "32", "33", "37", "39", "45", "47", "51", "52", "53", "54", "55", "56", "57", "58", "49", "50"], home: 90000, desk: 60000, days: [4, 7] },
    { name: "Centre-Est", codes: ["36", "26"], home: 65000, desk: 40000, days: [2, 4] },
  ];
  let position = 0;
  for (const z of zones) {
    const zone = await prisma.shippingZone.upsert({
      where: { websiteId_name: { websiteId, name: z.name } },
      update: { homeDeliveryCents: z.home, deskDeliveryCents: z.desk },
      create: {
        websiteId, name: z.name, homeDeliveryCents: z.home, deskDeliveryCents: z.desk,
        freeShippingThresholdCents: 1500000, estimatedDaysMin: z.days[0], estimatedDaysMax: z.days[1],
        carrierKey: "demo-carrier", codAllowed: true, position: position++, isActive: true,
      },
    });
    for (const code of z.codes) {
      await prisma.shippingZoneWilaya.upsert({
        where: { zoneId_wilayaCode: { zoneId: zone.id, wilayaCode: code } },
        update: {},
        create: { zoneId: zone.id, wilayaCode: code, isAvailable: true },
      });
    }
  }
}

async function seedCoupons(websiteId: string) {
  console.info("  • Coupons…");
  for (const c of AURA_COUPONS) {
    await prisma.coupon.upsert({
      where: { websiteId_code: { websiteId, code: c.code } },
      update: { value: c.value, type: c.type },
      create: { websiteId, code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents, maxDiscountCents: "maxDiscountCents" in c ? c.maxDiscountCents : null, isActive: true },
    });
  }
}

async function seedQuiz(websiteId: string) {
  console.info("  • Lens quiz (20 questions)…");
  const q = DEFAULT_QUIZ;
  const quiz = await prisma.quiz.upsert({
    where: { websiteId_key: { websiteId, key: q.key } },
    update: { name: q.name, disclaimer: q.disclaimer },
    create: { websiteId, key: q.key, name: q.name, disclaimer: q.disclaimer, isActive: true },
  });

  // Clear and re-create sections/questions/rules for idempotency.
  await prisma.quizRule.deleteMany({ where: { quizId: quiz.id } });
  await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
  await prisma.quizSection.deleteMany({ where: { quizId: quiz.id } });

  const sectionIds = new Map<string, string>();
  let sp = 0;
  for (const s of q.sections) {
    const section = await prisma.quizSection.create({ data: { quizId: quiz.id, key: s.key, title: s.title, subtitle: s.subtitle, position: sp++ } });
    sectionIds.set(s.key, section.id);
  }

  let qp = 0;
  for (const question of q.questions) {
    const created = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id, sectionId: question.sectionKey ? sectionIds.get(question.sectionKey) : null,
        key: question.key, label: question.label, helpText: question.helpText, type: question.type,
        position: qp++, isRequired: question.isRequired, config: question.config ?? undefined, showIf: question.showIf ?? undefined,
      },
    });
    let op = 0;
    for (const opt of question.options) {
      await prisma.quizOption.create({ data: { questionId: created.id, key: opt.key, label: opt.label, helpText: opt.helpText, weights: opt.weights, position: op++ } });
    }
  }

  let rp = 0;
  for (const rule of q.rules) {
    await prisma.quizRule.create({ data: { quizId: quiz.id, key: rule.key, description: rule.description, conditions: rule.conditions, effects: rule.effects, position: rp++, isActive: true } });
  }
}

async function seedContent(websiteId: string, categories: Map<string, string>, brands: Map<string, string>) {
  console.info("  • Homepage, pages, menus…");
  const hero = await media(websiteId, "banners/hero.svg", await writeBannerImage("banners/hero.svg", { bg: AURA_PRIMARY, accent: AURA_ACCENT, label: "Aura Optique" }), "Aura Optique");
  const momusBanner = await media(websiteId, "banners/momus.svg", await writeBannerImage("banners/momus.svg", { bg: "#123c4a", accent: AURA_ACCENT, label: "Momus" }), "Momus");

  // Homepage
  const home = await prisma.page.upsert({
    where: { websiteId_slug: { websiteId, slug: "home" } },
    update: {},
    create: { websiteId, slug: "home", title: "Accueil", kind: "HOME", isPublished: true, isSystem: true },
  });
  await prisma.contentBlock.deleteMany({ where: { pageId: home.id } });
  const blocks: { type: string; props: Record<string, unknown> }[] = [
    { type: "hero", props: { heading: "Votre regard, sublimé", subheading: "Montures, solaires et lentilles. Trouvez la paire faite pour vous.", eyebrow: "Aura Optique", image: { url: hero.url }, align: "left", overlay: 0.4, height: "lg", primaryCta: { label: "Découvrir la boutique", href: "/boutique" }, secondaryCta: { label: "Visagisme", href: "/visagisme" } } },
    { type: "featuredCategories", props: { heading: "Explorer par catégorie", categorySlugs: ["montures", "solaires", "lentilles", "verres-solaires"], columns: 4 } },
    { type: "brandHighlight", props: { brandSlug: "momus", heading: "Momus — la marque exclusive", text: "Un design affirmé, une fabrication soignée. Découvrez la signature d'Aura Optique.", image: { url: momusBanner.url }, cta: { label: "Découvrir Momus", href: "/marques/momus" }, theme: "dark" } },
    { type: "newArrivals", props: { heading: "Nouveautés", limit: 8 } },
    { type: "visagismCta", props: { heading: "Trouvez la monture faite pour votre visage", text: "Notre outil de visagisme analyse la forme de votre visage et vous recommande les montures les plus flatteuses.", cta: { label: "Lancer le visagisme", href: "/visagisme" } } },
    { type: "bestSellers", props: { heading: "Meilleures ventes", limit: 8 } },
    { type: "quizCta", props: { heading: "Quel verre est fait pour vous ?", text: "20 questions pour orienter votre choix de verres.", cta: { label: "Faire le quiz", href: "/quiz" } } },
    { type: "advantages", props: { heading: "Pourquoi Aura Optique", items: [
      { icon: "truck", title: "Livraison 58 wilayas", text: "Partout en Algérie." },
      { icon: "cash", title: "Paiement à la livraison", text: "Payez à réception." },
      { icon: "eye", title: "Visagisme & essayage", text: "Choisissez en confiance." },
      { icon: "shield", title: "Échange 14 jours", text: "Satisfait ou échangé." },
    ] } },
    { type: "brands", props: { heading: "Nos marques", brandSlugs: ["momus", "atelier-aura", "lumen", "solis", "clara"], grayscale: true } },
    { type: "testimonials", props: { heading: "Ils nous font confiance", items: [
      { author: "Yasmine B.", quote: "Le visagisme m'a vraiment aidée à choisir. Montures reçues en 2 jours.", rating: 5 },
      { author: "Karim L.", quote: "Paiement à la livraison, simple et rapide. Je recommande.", rating: 5 },
      { author: "Sofia M.", quote: "Qualité au rendez-vous, la Momus Vela est superbe.", rating: 4 },
    ] } },
    { type: "faq", props: { heading: "Questions fréquentes", items: [
      { q: "Comment se passe le paiement ?", a: "Vous payez en espèces à la livraison de votre commande (paiement à la livraison)." },
      { q: "Livrez-vous dans toute l'Algérie ?", a: "Oui, dans les 58 wilayas, à domicile ou en stopdesk." },
      { q: "Puis-je essayer avant d'acheter ?", a: "Oui, utilisez l'essayage virtuel et le visagisme depuis chaque fiche produit." },
    ] } },
    { type: "newsletter", props: { heading: "Restez informé", text: "Nouveautés et offres, directement dans votre boîte mail.", background: "muted" } },
  ];
  for (let i = 0; i < blocks.length; i++) {
    await prisma.contentBlock.create({ data: { websiteId, pageId: home.id, type: blocks[i]!.type, position: i, isEnabled: true, props: blocks[i]!.props } });
  }

  // CMS pages
  const pages = [
    { slug: "a-propos", title: "À propos", kind: "STANDARD" as const, body: "Aura Optique est une enseigne d'optique premium. (Contenu de démonstration.)" },
    { slug: "contact", title: "Contact", kind: "CONTACT" as const, body: "Contactez-nous par téléphone, WhatsApp ou e-mail." },
    { slug: "livraison", title: "Livraison", kind: "STANDARD" as const, body: "Livraison dans les 58 wilayas, à domicile ou en stopdesk. Délais 1 à 7 jours selon la zone." },
    { slug: "retours", title: "Retours & échanges", kind: "STANDARD" as const, body: "Échange sous 14 jours. (Contenu de démonstration.)" },
    { slug: "confidentialite", title: "Politique de confidentialité", kind: "LEGAL" as const, body: "Vos données sont traitées conformément à notre politique. L'analyse faciale du visagisme se fait dans votre navigateur ; aucune photo n'est conservée sans votre consentement." },
    { slug: "cgv", title: "Conditions générales de vente", kind: "LEGAL" as const, body: "CGV de démonstration." },
  ];
  for (const p of pages) {
    await prisma.page.upsert({
      where: { websiteId_slug: { websiteId, slug: p.slug } },
      update: { title: p.title, body: p.body },
      create: { websiteId, slug: p.slug, title: p.title, kind: p.kind, isPublished: true, body: p.body },
    });
  }

  // Menus
  const header = await prisma.menu.upsert({
    where: { websiteId_key: { websiteId, key: "header" } },
    update: {},
    create: { websiteId, key: "header", name: "Menu principal" },
  });
  await prisma.menuItem.deleteMany({ where: { menuId: header.id } });
  const items = [
    { label: "Montures", url: "/categorie/montures" },
    { label: "Solaires", url: "/categorie/solaires" },
    { label: "Lentilles", url: "/categorie/lentilles" },
    { label: "Momus", url: "/marques/momus", isNew: false },
    { label: "Visagisme", url: "/visagisme" },
    { label: "Quiz Verres", url: "/quiz" },
  ];
  for (let i = 0; i < items.length; i++) {
    await prisma.menuItem.create({ data: { menuId: header.id, label: items[i]!.label, url: items[i]!.url, position: i, isNew: !!items[i]!.isNew } });
  }
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
