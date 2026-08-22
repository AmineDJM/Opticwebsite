"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";
import { prisma, loadSiteFromConfig } from "@optic/database";
import { slugify } from "@optic/core";
import { getPreset, resolveFeatures, siteConfigSchema, DEFAULT_FEATURES } from "@optic/config";
import { themeFromPalette } from "@optic/theming";
import { DEFAULT_QUIZ } from "@optic/quiz-engine";
import { SYSTEM_ROLES } from "@optic/auth";
import { requirePlatform } from "../session.js";

/**
 * Website generation (§C, §3-6). Takes the wizard's config and provisions a complete new
 * brand: website, theme (from extracted palette or preset), settings, features, the
 * default optical category tree, a starter homepage, and the 20-question quiz. Everything
 * is data — the same engine renders it.
 */

const wizardSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().optional().or(z.literal("")),
  tagline: z.string().optional().or(z.literal("")),
  legalName: z.string().optional().or(z.literal("")),
  currency: z.string().default("DZD"),
  countryCode: z.string().default("DZ"),
  locales: z.array(z.enum(["fr", "ar", "en"])).default(["fr"]),
  defaultLocale: z.enum(["fr", "ar", "en"]).default("fr"),
  contact: z.object({ phone: z.string().optional(), whatsapp: z.string().optional(), email: z.string().optional(), address: z.string().optional(), city: z.string().optional() }).default({}),
  socials: z.object({ instagram: z.string().optional(), facebook: z.string().optional() }).default({}),
  preset: z.string().default("modern"),
  paletteColors: z.array(z.string()).default([]),
  paletteMode: z.enum(["light", "dark"]).default("light"),
  logoUrl: z.string().optional().or(z.literal("")),
  faviconUrl: z.string().optional().or(z.literal("")),
  features: z.record(z.string(), z.boolean()).default({}),
  includeDemoCategories: z.boolean().default(true),
  includeQuiz: z.boolean().default(true),
});

export type WizardState = { ok: boolean; error?: string; slug?: string };

export async function createWebsiteAction(input: unknown): Promise<WizardState> {
  await requirePlatform();
  const parsed = wizardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  const d = parsed.data;
  const slug = d.slug?.trim() || slugify(d.name);

  const existing = await prisma.website.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return { ok: false, error: `Un site avec le slug "${slug}" existe déjà.` };

  // Build the theme: extracted palette grafted onto the chosen preset, or the preset itself.
  const theme = d.paletteColors.length
    ? themeFromPalette(d.paletteColors, d.preset, d.paletteMode)
    : getPreset(d.preset);

  const features = resolveFeatures({ ...Object.fromEntries(Object.entries(DEFAULT_FEATURES)), ...d.features });

  // Assemble a SiteConfig (validated) — the same shape the exporter uses.
  const config = siteConfigSchema.parse({
    version: 1,
    identity: {
      name: d.name, legalName: d.legalName || undefined, tagline: d.tagline || undefined, slug,
      logoUrl: d.logoUrl || undefined, faviconUrl: d.faviconUrl || undefined,
      countryCode: d.countryCode, currency: d.currency, defaultLocale: d.defaultLocale, locales: d.locales, timezone: "Africa/Algiers",
    },
    contact: d.contact,
    socials: d.socials,
    commerce: { requireEmailAtCheckout: false, requireAccountToOrder: false, stockStrategy: "reserve", showComparePrice: true },
    seo: { defaultTitle: `${d.name}${d.tagline ? ` — ${d.tagline}` : ""}`, indexable: true },
    theme,
    features,
    announcement: { text: "Livraison partout • Paiement à la livraison", enabled: true },
    pages: [buildStarterHomepage(d.name, d.tagline, features)],
  });

  // Seed payload: default optical categories + optional quiz. No demo products (a new
  // brand starts with an empty catalogue the owner fills in the admin).
  const seed = {
    categories: d.includeDemoCategories ? DEFAULT_CATEGORY_TREE : [],
    brands: [],
    products: [],
    shippingZones: DEFAULT_SHIPPING_ZONES,
    coupons: [],
    quiz: d.includeQuiz ? quizToSeed() : null,
    pages: config.pages,
    menus: [DEFAULT_MENU],
  };

  const { websiteId } = await loadSiteFromConfig(config as never, seed as never);

  // Ensure system roles exist for this website and grant the creator site_owner access.
  const platform = await requirePlatform();
  for (const tpl of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { websiteId_key: { websiteId, key: tpl.key } },
      update: { permissions: tpl.permissions as string[] },
      create: { websiteId, key: tpl.key, name: tpl.name, description: tpl.description, isSystem: true, permissions: tpl.permissions as string[] },
    });
  }
  const ownerRole = await prisma.role.findFirst({ where: { websiteId, key: "site_owner" }, select: { id: true } });
  if (ownerRole) {
    await prisma.membership.upsert({
      where: { userId_websiteId: { userId: platform.user.id, websiteId } },
      update: { roleId: ownerRole.id },
      create: { userId: platform.user.id, websiteId, roleId: ownerRole.id },
    });
  }

  revalidatePath("/");
  return { ok: true, slug };
}

export async function deleteWebsiteAction(slug: string): Promise<{ ok: boolean }> {
  await requirePlatform();
  await prisma.website.deleteMany({ where: { slug } });
  revalidatePath("/");
  return { ok: true };
}

// --- Default data for a new brand (all configurable later in the admin) ---

const DEFAULT_CATEGORY_TREE = [
  { slug: "montures", name: "Montures médicales", kind: "OPTICAL_FRAMES", position: 0, isActive: true },
  { slug: "montures-homme", name: "Homme", kind: "OPTICAL_FRAMES", position: 0, isActive: true, parentSlug: "montures" },
  { slug: "montures-femme", name: "Femme", kind: "OPTICAL_FRAMES", position: 1, isActive: true, parentSlug: "montures" },
  { slug: "montures-enfant", name: "Enfant", kind: "OPTICAL_FRAMES", position: 2, isActive: true, parentSlug: "montures" },
  { slug: "solaires", name: "Lunettes solaires", kind: "SUNGLASSES", position: 1, isActive: true },
  { slug: "solaires-homme", name: "Homme", kind: "SUNGLASSES", position: 0, isActive: true, parentSlug: "solaires" },
  { slug: "solaires-femme", name: "Femme", kind: "SUNGLASSES", position: 1, isActive: true, parentSlug: "solaires" },
  { slug: "verres-solaires", name: "Verres solaires seuls", kind: "SUN_LENSES", position: 2, isActive: true },
  { slug: "lentilles", name: "Lentilles de contact", kind: "CONTACT_LENSES", position: 3, isActive: true },
];

const DEFAULT_SHIPPING_ZONES = [
  { name: "Alger & environs", homeDeliveryCents: 40000, deskDeliveryCents: 25000, estimatedDaysMin: 1, estimatedDaysMax: 2, codAllowed: true, position: 0, isActive: true, wilayas: [{ wilayaCode: "16" }, { wilayaCode: "09" }, { wilayaCode: "35" }, { wilayaCode: "42" }] },
  { name: "National", homeDeliveryCents: 70000, deskDeliveryCents: 45000, estimatedDaysMin: 2, estimatedDaysMax: 6, codAllowed: true, position: 1, isActive: true, wilayas: [] },
];

const DEFAULT_MENU = {
  key: "header", name: "Menu principal",
  items: [
    { label: "Montures", url: "/categorie/montures", position: 0 },
    { label: "Solaires", url: "/categorie/solaires", position: 1 },
    { label: "Lentilles", url: "/categorie/lentilles", position: 2 },
    { label: "Visagisme", url: "/visagisme", position: 3 },
    { label: "Quiz Verres", url: "/quiz", position: 4 },
  ],
};

function buildStarterHomepage(name: string, tagline: string | undefined, features: Record<string, boolean>) {
  const blocks: { type: string; isEnabled: boolean; position: number; props: Record<string, unknown> }[] = [
    { type: "hero", isEnabled: true, position: 0, props: { heading: tagline || `Bienvenue chez ${name}`, subheading: "Découvrez notre collection de montures, solaires et lentilles.", eyebrow: name, align: "left", height: "lg", overlay: 0.35, primaryCta: { label: "Découvrir la boutique", href: "/boutique" } } },
    { type: "featuredCategories", isEnabled: true, position: 1, props: { heading: "Explorer par catégorie", categorySlugs: ["montures", "solaires", "lentilles"] } },
    { type: "newArrivals", isEnabled: true, position: 2, props: { heading: "Nouveautés", limit: 8 } },
  ];
  let pos = 3;
  if (features.visagism) blocks.push({ type: "visagismCta", isEnabled: true, position: pos++, props: { heading: "Trouvez la monture faite pour votre visage", cta: { label: "Lancer le visagisme", href: "/visagisme" } } });
  if (features.lensQuiz) blocks.push({ type: "quizCta", isEnabled: true, position: pos++, props: { heading: "Quel verre est fait pour vous ?", cta: { label: "Faire le quiz", href: "/quiz" } } });
  blocks.push({ type: "advantages", isEnabled: true, position: pos++, props: { heading: "Nos engagements", items: [{ icon: "truck", title: "Livraison rapide" }, { icon: "cash", title: "Paiement à la livraison" }, { icon: "shield", title: "Échange facile" }] } });
  if (features.newsletter) blocks.push({ type: "newsletter", isEnabled: true, position: pos++, props: { heading: "Restez informé" } });
  return { slug: "home", title: "Accueil", kind: "HOME" as const, isPublished: true, isSystem: true, blocks };
}

function quizToSeed() {
  const q = DEFAULT_QUIZ;
  return {
    key: q.key, name: q.name, disclaimer: q.disclaimer,
    sections: q.sections.map((s, i) => ({ key: s.key, title: s.title, subtitle: s.subtitle, position: i })),
    questions: q.questions.map((question, i) => ({ key: question.key, label: question.label, helpText: question.helpText, type: question.type, position: i, isRequired: question.isRequired, config: question.config, showIf: question.showIf, section: question.sectionKey ? { key: question.sectionKey } : null, options: question.options.map((o, j) => ({ key: o.key, label: o.label, helpText: o.helpText, iconKey: o.iconKey, weights: o.weights, position: j })) })),
    rules: q.rules.map((r, i) => ({ key: r.key, description: r.description, conditions: r.conditions, effects: r.effects, position: i, isActive: true })),
  };
}
