"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify } from "@optic/core";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/** Category / brand / coupon management (§26). Permission-checked, validated, audited. */

export type CrudState = { ok: boolean; error?: string };

// ---- Categories ----
const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  slug: z.string().optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  kind: z.enum(["GENERIC", "OPTICAL_FRAMES", "SUNGLASSES", "SUN_LENSES", "CONTACT_LENSES", "ACCESSORIES"]).default("GENERIC"),
  isActive: z.coerce.boolean().default(true),
  position: z.coerce.number().int().default(0),
});

export async function saveCategoryAction(input: unknown): Promise<CrudState> {
  const ctx = await requirePermission("category:write");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  const d = parsed.data;
  const slug = d.slug?.trim() || slugify(d.name);
  try {
    if (d.id) {
      await ctx.db.category.update({ where: { id: d.id } as never, data: { name: d.name, slug, parentId: d.parentId || null, kind: d.kind, isActive: d.isActive, position: d.position } as never });
    } else {
      await ctx.db.category.create({ data: { name: d.name, slug, parentId: d.parentId || null, kind: d.kind, isActive: d.isActive, position: d.position } as never });
    }
    await audit({ action: d.id ? "category.update" : "category.create", entityType: "Category", entityId: d.id, entityLabel: d.name });
    revalidatePath("/categories");
    return { ok: true };
  } catch {
    return { ok: false, error: "Ce slug existe déjà." };
  }
}

export async function deleteCategoryAction(id: string): Promise<CrudState> {
  const ctx = await requirePermission("category:write");
  await ctx.db.category.delete({ where: { id } as never });
  await audit({ action: "category.delete", entityType: "Category", entityId: id });
  revalidatePath("/categories");
  return { ok: true };
}

// ---- Brands ----
const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  slug: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  story: z.string().optional().or(z.literal("")),
  isExclusive: z.coerce.boolean().default(false),
  isFeatured: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
});

export async function saveBrandAction(input: unknown): Promise<CrudState> {
  const ctx = await requirePermission("brand:write");
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  const d = parsed.data;
  const slug = d.slug?.trim() || slugify(d.name);
  try {
    const data = { name: d.name, slug, description: d.description || null, story: d.story || null, isExclusive: d.isExclusive, isFeatured: d.isFeatured, isActive: d.isActive };
    if (d.id) await ctx.db.brand.update({ where: { id: d.id } as never, data: data as never });
    else await ctx.db.brand.create({ data: data as never });
    await audit({ action: d.id ? "brand.update" : "brand.create", entityType: "Brand", entityId: d.id, entityLabel: d.name });
    revalidatePath("/marques");
    return { ok: true };
  } catch {
    return { ok: false, error: "Ce slug existe déjà." };
  }
}

export async function deleteBrandAction(id: string): Promise<CrudState> {
  const ctx = await requirePermission("brand:write");
  await ctx.db.brand.update({ where: { id } as never, data: { isActive: false } as never });
  await audit({ action: "brand.delete", entityType: "Brand", entityId: id });
  revalidatePath("/marques");
  return { ok: true };
}

// ---- Coupons ----
const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(2).transform((s) => s.toUpperCase()),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().int().min(0),
  minSubtotalCents: z.coerce.number().int().min(0).default(0),
  maxDiscountCents: z.coerce.number().int().min(0).optional().nullable(),
  usageLimit: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
});

export async function saveCouponAction(input: unknown): Promise<CrudState> {
  const ctx = await requirePermission("coupon:write");
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  const d = parsed.data;
  try {
    const data = { code: d.code, type: d.type, value: d.value, minSubtotalCents: d.minSubtotalCents, maxDiscountCents: d.maxDiscountCents || null, usageLimit: d.usageLimit || null, isActive: d.isActive };
    if (d.id) await ctx.db.coupon.update({ where: { id: d.id } as never, data: data as never });
    else await ctx.db.coupon.create({ data: data as never });
    await audit({ action: d.id ? "coupon.update" : "coupon.create", entityType: "Coupon", entityId: d.id, entityLabel: d.code });
    revalidatePath("/promotions");
    return { ok: true };
  } catch {
    return { ok: false, error: "Ce code existe déjà." };
  }
}

export async function deleteCouponAction(id: string): Promise<CrudState> {
  const ctx = await requirePermission("coupon:write");
  await ctx.db.coupon.delete({ where: { id } as never });
  await audit({ action: "coupon.delete", entityType: "Coupon", entityId: id });
  revalidatePath("/promotions");
  return { ok: true };
}
