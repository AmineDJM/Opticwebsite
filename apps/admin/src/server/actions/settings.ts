"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FEATURE_KEYS } from "@optic/config";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/** Site settings + feature flags + theme + shipping management (§4, §12). */

export type SettingsState = { ok: boolean; error?: string };

const settingsSchema = z.object({
  name: z.string().trim().min(1),
  tagline: z.string().optional().or(z.literal("")),
  contact: z.object({ phone: z.string().optional(), whatsapp: z.string().optional(), email: z.string().optional(), address: z.string().optional(), city: z.string().optional() }).partial(),
  socials: z.object({ instagram: z.string().optional(), facebook: z.string().optional(), tiktok: z.string().optional() }).partial(),
  commerce: z.object({ requireEmailAtCheckout: z.boolean(), requireAccountToOrder: z.boolean(), stockStrategy: z.enum(["reserve", "decrement"]), freeShippingThresholdCents: z.number().int().min(0).nullable(), returnPolicyDays: z.number().int().min(0) }).partial(),
  announcement: z.object({ text: z.string(), href: z.string().optional(), enabled: z.boolean() }).nullable().optional(),
  seo: z.object({ defaultTitle: z.string().optional(), defaultDescription: z.string().optional(), indexable: z.boolean() }).partial(),
});

export async function saveSettingsAction(input: unknown): Promise<SettingsState> {
  const ctx = await requirePermission("settings:write");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Champs invalides" };
  const d = parsed.data;

  await ctx.db.website.update({ where: { id: ctx.websiteId } as never, data: { name: d.name, tagline: d.tagline || null } as never });
  await ctx.db.siteSettings.update({
    where: { websiteId: ctx.websiteId } as never,
    data: { contact: d.contact as never, socials: d.socials as never, commerce: d.commerce as never, seo: d.seo as never, announcement: (d.announcement ?? null) as never } as never,
  });
  await audit({ action: "settings.update", entityType: "SiteSettings", entityId: ctx.websiteId, entityLabel: d.name });
  revalidatePath("/parametres");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleFeatureAction(key: string, enabled: boolean): Promise<SettingsState> {
  const ctx = await requirePermission("settings:write");
  if (!(FEATURE_KEYS as readonly string[]).includes(key)) return { ok: false, error: "Fonctionnalité inconnue" };
  await ctx.db.featureFlag.upsert({
    where: { websiteId_key: { websiteId: ctx.websiteId, key } } as never,
    update: { enabled } as never,
    create: { key, enabled } as never,
  });
  await audit({ action: "feature.toggle", entityType: "FeatureFlag", entityLabel: key, after: { enabled } });
  revalidatePath("/parametres");
  return { ok: true };
}
