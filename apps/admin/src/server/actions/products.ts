"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@optic/core";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/**
 * Product management actions (§26). Permission-checked, validated, audited. Price and
 * stock changes are logged with before/after (§36). Variants are managed inline.
 */

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  colorName: z.string().trim().optional().or(z.literal("")),
  colorHex: z.string().trim().optional().or(z.literal("")),
  size: z.string().trim().optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  sku: z.string().trim().min(1),
  slug: z.string().trim().optional().or(z.literal("")),
  brandId: z.string().optional().or(z.literal("")),
  shortDescription: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]),
  ageGroup: z.enum(["ADULT", "TEEN", "CHILD"]),
  priceCents: z.coerce.number().int().min(0),
  comparePriceCents: z.coerce.number().int().min(0).optional().nullable(),
  frameShape: z.string().optional().or(z.literal("")),
  frameMaterial: z.string().optional().or(z.literal("")),
  frameType: z.string().optional().or(z.literal("")),
  isNew: z.coerce.boolean().optional(),
  isBestseller: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  categoryIds: z.array(z.string()).default([]),
  recommendedFaceShapes: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
});

export type ProductActionState = { ok: boolean; error?: string; id?: string };

export async function saveProductAction(input: unknown): Promise<ProductActionState> {
  const ctx = await requirePermission("product:write");
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  const d = parsed.data;
  const slug = d.slug?.trim() || slugify(d.name);

  try {
    if (d.id) {
      const before = await ctx.db.product.findFirst({ where: { id: d.id } as never, select: { priceCents: true, comparePriceCents: true, status: true } });
      const b = before as { priceCents: number; comparePriceCents: number | null; status: string } | null;

      await ctx.db.product.update({
        where: { id: d.id } as never,
        data: {
          name: d.name, sku: d.sku, slug, brandId: d.brandId || null,
          shortDescription: d.shortDescription || null, description: d.description || null,
          status: d.status, gender: d.gender, ageGroup: d.ageGroup,
          priceCents: d.priceCents, comparePriceCents: d.comparePriceCents ?? null,
          frameShape: d.frameShape || null, frameMaterial: d.frameMaterial || null, frameType: d.frameType || null,
          isNew: !!d.isNew, isBestseller: !!d.isBestseller, isFeatured: !!d.isFeatured,
          recommendedFaceShapes: d.recommendedFaceShapes,
          publishedAt: d.status === "ACTIVE" ? new Date() : undefined,
        } as never,
      });

      // Price change audit (§36).
      if (b && b.priceCents !== d.priceCents) {
        await audit({ action: "price.update", entityType: "Product", entityId: d.id, entityLabel: d.name, before: { priceCents: b.priceCents }, after: { priceCents: d.priceCents } });
      }
      await syncCategories(ctx.db, d.id, d.categoryIds);
      await syncVariants(ctx.db, ctx.websiteId, d.id, d.variants);
      await audit({ action: "product.update", entityType: "Product", entityId: d.id, entityLabel: d.name });
      revalidatePath("/produits");
      return { ok: true, id: d.id };
    } else {
      const product = await ctx.db.product.create({
        data: {
          name: d.name, sku: d.sku, slug, brandId: d.brandId || null,
          shortDescription: d.shortDescription || null, description: d.description || null,
          status: d.status, gender: d.gender, ageGroup: d.ageGroup,
          priceCents: d.priceCents, comparePriceCents: d.comparePriceCents ?? null,
          frameShape: d.frameShape || null, frameMaterial: d.frameMaterial || null, frameType: d.frameType || null,
          isNew: !!d.isNew, isBestseller: !!d.isBestseller, isFeatured: !!d.isFeatured,
          recommendedFaceShapes: d.recommendedFaceShapes,
          publishedAt: d.status === "ACTIVE" ? new Date() : null,
        } as never,
      });
      const id = (product as { id: string }).id;
      await syncCategories(ctx.db, id, d.categoryIds);
      await syncVariants(ctx.db, ctx.websiteId, id, d.variants);
      await audit({ action: "product.create", entityType: "Product", entityId: id, entityLabel: d.name });
      revalidatePath("/produits");
      return { ok: true, id };
    }
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Ce SKU ou slug existe déjà." : "Erreur lors de l'enregistrement.";
    return { ok: false, error: msg };
  }
}

async function syncCategories(db: Awaited<ReturnType<typeof requirePermission>>["db"], productId: string, categoryIds: string[]) {
  await db.productCategory.deleteMany({ where: { productId } as never });
  for (const categoryId of categoryIds) {
    await db.productCategory.create({ data: { productId, categoryId } as never }).catch(() => undefined);
  }
}

async function syncVariants(db: Awaited<ReturnType<typeof requirePermission>>["db"], websiteId: string, productId: string, variants: z.infer<typeof variantSchema>[]) {
  const keepIds = variants.filter((v) => v.id).map((v) => v.id!);
  // Remove variants no longer present.
  await db.productVariant.deleteMany({ where: { productId, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) } as never });
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i]!;
    const data = { name: v.name, colorName: v.colorName || null, colorHex: v.colorHex || null, size: v.size || null, priceCents: v.priceCents ?? null, stock: v.stock, position: i };
    if (v.id) {
      await db.productVariant.update({ where: { id: v.id } as never, data: data as never });
    } else {
      await db.productVariant.create({ data: { ...data, websiteId, productId, sku: v.sku } as never });
    }
  }
}

export async function deleteProductAction(id: string): Promise<{ ok: boolean }> {
  const ctx = await requirePermission("product:delete");
  const product = await ctx.db.product.findFirst({ where: { id } as never, select: { name: true } });
  await ctx.db.product.update({ where: { id } as never, data: { status: "ARCHIVED" } as never });
  await audit({ action: "product.archive", entityType: "Product", entityId: id, entityLabel: (product as { name: string } | null)?.name });
  revalidatePath("/produits");
  return { ok: true };
}

export async function duplicateProductAction(id: string): Promise<ProductActionState> {
  const ctx = await requirePermission("product:write");
  const src = await ctx.db.product.findFirst({ where: { id } as never, include: { variants: true, categories: true } });
  if (!src) return { ok: false, error: "Produit introuvable" };
  const s = src as never as { name: string; sku: string; slug: string; priceCents: number; gender: string; ageGroup: string; brandId: string | null; variants: { sku: string; name: string; colorName: string | null; colorHex: string | null; size: string | null; stock: number }[]; categories: { categoryId: string }[] };
  const suffix = Math.random().toString(36).slice(2, 6);
  const copy = await ctx.db.product.create({
    data: {
      name: `${s.name} (copie)`, sku: `${s.sku}-${suffix}`, slug: `${s.slug}-${suffix}`,
      priceCents: s.priceCents, gender: s.gender, ageGroup: s.ageGroup, brandId: s.brandId, status: "DRAFT",
    } as never,
  });
  const newId = (copy as { id: string }).id;
  for (const c of s.categories) await ctx.db.productCategory.create({ data: { productId: newId, categoryId: c.categoryId } as never }).catch(() => undefined);
  await audit({ action: "product.duplicate", entityType: "Product", entityId: newId, entityLabel: s.name });
  revalidatePath("/produits");
  redirect(`/produits/${newId}`);
}
