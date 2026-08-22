import { z } from "zod";
import { localeSchema } from "@optic/core";
import { themeSchema } from "./theme.js";

/**
 * SiteConfig — the complete serialisable description of one brand. This is the
 * single source of truth used by:
 *   - the generator wizard (builds one),
 *   - the exporter (writes one to site.config.json),
 *   - the seed loader (reads one),
 *   - the running apps (resolve one per request from the database).
 *
 * If it's a per-brand decision, it lives here, validated.
 */

export const contactSchema = z.object({
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  mapUrl: z.string().optional(),
  openingHours: z.string().optional(),
});
export type Contact = z.infer<typeof contactSchema>;

export const socialsSchema = z.object({
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
});
export type Socials = z.infer<typeof socialsSchema>;

export const commercePolicySchema = z.object({
  /** Ask for e-mail at checkout? Requirement §11 says it is configurable. */
  requireEmailAtCheckout: z.boolean().default(false),
  requireAccountToOrder: z.boolean().default(false),
  /** Reserve stock on order (COD) or decrement immediately. */
  stockStrategy: z.enum(["reserve", "decrement"]).default("reserve"),
  lowStockThreshold: z.number().int().min(0).default(3),
  freeShippingThresholdCents: z.number().int().min(0).optional(),
  returnPolicyDays: z.number().int().min(0).default(14),
  exchangePolicy: z.string().optional(),
  minOrderCents: z.number().int().min(0).default(0),
  showComparePrice: z.boolean().default(true),
});
export type CommercePolicy = z.infer<typeof commercePolicySchema>;

export const seoDefaultsSchema = z.object({
  titleTemplate: z.string().default("%s — {brand}"),
  defaultTitle: z.string().optional(),
  defaultDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  twitterHandle: z.string().optional(),
  indexable: z.boolean().default(true),
});
export type SeoDefaults = z.infer<typeof seoDefaultsSchema>;

export const identitySchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  tagline: z.string().optional(),
  slug: z.string().min(1),
  logoUrl: z.string().optional(),
  logoAltUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  countryCode: z.string().default("DZ"),
  currency: z.string().default("DZD"),
  defaultLocale: localeSchema.default("fr"),
  locales: z.array(localeSchema).default(["fr"]),
  timezone: z.string().default("Africa/Algiers"),
});
export type Identity = z.infer<typeof identitySchema>;

/** A configured content block, as stored/exported (props left generic; validated per-type by blocks.ts). */
export const configBlockSchema = z.object({
  type: z.string(),
  isEnabled: z.boolean().default(true),
  position: z.number().int().default(0),
  props: z.record(z.string(), z.unknown()).default({}),
});

export const configPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  kind: z.enum(["HOME", "STANDARD", "LEGAL", "FAQ", "CONTACT", "LANDING"]).default("STANDARD"),
  isPublished: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  body: z.string().optional(),
  seo: seoDefaultsSchema.partial().optional(),
  blocks: z.array(configBlockSchema).default([]),
});

export const siteConfigSchema = z.object({
  version: z.literal(1).default(1),
  identity: identitySchema,
  contact: contactSchema.default({}),
  socials: socialsSchema.default({}),
  commerce: commercePolicySchema.default({}),
  seo: seoDefaultsSchema.default({}),
  theme: themeSchema,
  features: z.record(z.string(), z.boolean()).default({}),
  announcement: z
    .object({ text: z.string(), href: z.string().optional(), enabled: z.boolean().default(true) })
    .optional(),
  pages: z.array(configPageSchema).default([]),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type ConfigPage = z.infer<typeof configPageSchema>;
export type ConfigBlock = z.infer<typeof configBlockSchema>;

export function parseSiteConfig(input: unknown): SiteConfig {
  return siteConfigSchema.parse(input);
}

export function safeParseSiteConfig(input: unknown) {
  return siteConfigSchema.safeParse(input);
}
