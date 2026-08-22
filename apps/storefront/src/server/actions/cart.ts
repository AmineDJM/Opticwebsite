"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { quantitySchema } from "@optic/core";
import { addToCart, updateCartItem, removeCartItem, setCartCoupon, validateCoupon, getCartView } from "@optic/database";
import { getTenant } from "../tenant.js";
import { ensureCart, getCartToken } from "../cart.js";

/**
 * Cart server actions (§10). Each validates input, resolves the tenant + cart, mutates
 * through the repository, and revalidates. Errors are returned as a typed result the UI
 * can render (not thrown) so add-to-cart failures are graceful.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const addSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: quantitySchema.default(1),
});

export async function addToCartAction(input: unknown): Promise<ActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide" };
  const tenant = await getTenant();
  const cart = await ensureCart();
  try {
    await addToCart(tenant.db, cart.id, {
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
      quantity: parsed.data.quantity,
    });
    revalidatePath("/panier");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  const tenant = await getTenant();
  const cart = await ensureCart();
  // Verify the item belongs to this cart (tenant + cart scoped).
  const view = await getCartView(tenant.db, cart.token);
  if (!view?.lines.some((l) => l.id === itemId)) return { ok: false, error: "Article introuvable" };
  await updateCartItem(tenant.db, itemId, Math.max(0, Math.min(99, Math.floor(quantity))));
  revalidatePath("/panier");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const tenant = await getTenant();
  const cart = await ensureCart();
  const view = await getCartView(tenant.db, cart.token);
  if (!view?.lines.some((l) => l.id === itemId)) return { ok: false, error: "Article introuvable" };
  await removeCartItem(tenant.db, itemId);
  revalidatePath("/panier");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function applyCouponAction(code: string): Promise<ActionResult> {
  const tenant = await getTenant();
  if (!tenant.features.coupons) return { ok: false, error: "Codes promo désactivés" };
  const token = await getCartToken();
  const view = await getCartView(tenant.db, token);
  if (!view) return { ok: false, error: "Panier vide" };
  const result = await validateCoupon(tenant.db, code, view.subtotalCents);
  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "Code promo invalide",
      expired: "Code promo expiré",
      not_started: "Code promo pas encore actif",
      usage_limit: "Code promo épuisé",
      min_subtotal: "Montant minimum non atteint",
    };
    return { ok: false, error: messages[result.reason] ?? "Code promo invalide" };
  }
  const cart = await ensureCart();
  await setCartCoupon(tenant.db, cart.id, result.coupon.code);
  revalidatePath("/panier");
  return { ok: true };
}

export async function removeCouponAction(): Promise<ActionResult> {
  const tenant = await getTenant();
  const cart = await ensureCart();
  await setCartCoupon(tenant.db, cart.id, null);
  revalidatePath("/panier");
  return { ok: true };
}
