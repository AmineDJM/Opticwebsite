"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { phoneSchema } from "@optic/core";
import { createOrder, validateCoupon, getShippingQuote, getCartView } from "@optic/database";
import type { CouponInput } from "@optic/commerce";
import { getTenant } from "../tenant.js";
import { getCartToken } from "../cart.js";

/**
 * Checkout server action (§11) — cash on delivery. Validates the customer + delivery
 * input server-side (never trusting the client), resolves the live shipping quote and
 * coupon, and delegates order creation to the transactional repository which re-prices
 * and reserves stock. On success, redirects to the confirmation page.
 */

const checkoutSchema = z.object({
  firstName: z.string().trim().min(2, "Prénom requis"),
  lastName: z.string().trim().min(2, "Nom requis"),
  phone: phoneSchema,
  phoneAlt: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  wilayaCode: z.string().min(1, "Wilaya requise"),
  communeId: z.string().optional().or(z.literal("")),
  addressLine: z.string().trim().min(5, "Adresse requise"),
  landmark: z.string().trim().optional().or(z.literal("")),
  deliveryMethod: z.enum(["HOME", "DESK"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CheckoutState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const tenant = await getTenant();
  const commerce = tenant.settings.commerce as { requireEmailAtCheckout?: boolean; stockStrategy?: "reserve" | "decrement"; freeShippingThresholdCents?: number };

  const raw = Object.fromEntries(formData.entries());
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Veuillez corriger les champs indiqués.", fieldErrors };
  }
  const data = parsed.data;

  if (commerce.requireEmailAtCheckout && !data.email) {
    return { ok: false, error: "L'e-mail est requis.", fieldErrors: { email: "E-mail requis" } };
  }

  const token = await getCartToken();
  const cart = await getCartView(tenant.db, token);
  if (!cart || cart.lines.length === 0) return { ok: false, error: "Votre panier est vide." };

  // Live shipping quote for the chosen wilaya + method.
  const quote = await getShippingQuote(tenant.db, data.wilayaCode, data.deliveryMethod);
  if (!quote.available) return { ok: false, error: "La livraison n'est pas disponible pour cette zone." };
  if (!quote.codAllowed) return { ok: false, error: "Le paiement à la livraison n'est pas disponible pour cette zone." };

  // Coupon (if the cart carries one).
  let coupon: CouponInput | null = null;
  if (cart.couponCode && tenant.features.coupons) {
    const result = await validateCoupon(tenant.db, cart.couponCode, cart.subtotalCents);
    if (result.ok) coupon = result.coupon;
  }

  let orderNumber: string;
  try {
    const order = await createOrder(tenant.db, {
      websiteId: tenant.websiteId,
      orderNumberPrefix: tenant.name,
      cartToken: token!,
      customer: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        phoneAlt: data.phoneAlt || null,
        email: data.email || null,
      },
      delivery: {
        wilayaCode: data.wilayaCode,
        communeId: data.communeId || null,
        addressLine: data.addressLine,
        landmark: data.landmark || null,
        method: data.deliveryMethod,
        carrierKey: quote.carrierKey ?? null,
        shippingCents: quote.feeCents,
        freeShippingThresholdCents: quote.freeShippingThresholdCents,
      },
      coupon,
      note: data.note || null,
      locale: tenant.defaultLocale,
      currency: tenant.currency,
      stockStrategy: commerce.stockStrategy ?? "reserve",
    });
    orderNumber = order.number;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    if (message.startsWith("OUT_OF_STOCK")) {
      return { ok: false, error: `Un article n'est plus disponible : ${message.split(":")[1] ?? ""}` };
    }
    return { ok: false, error: "La commande n'a pas pu être créée. Réessayez." };
  }

  redirect(`/commande/${orderNumber}`);
}

/** Fetch a shipping quote for the live checkout summary (called from the client). */
export async function quoteShippingAction(wilayaCode: string, method: "HOME" | "DESK") {
  const tenant = await getTenant();
  if (!wilayaCode) return null;
  const quote = await getShippingQuote(tenant.db, wilayaCode, method);
  return {
    available: quote.available,
    feeCents: quote.feeCents,
    codAllowed: quote.codAllowed,
    estimatedDaysMin: quote.estimatedDaysMin,
    estimatedDaysMax: quote.estimatedDaysMax,
    freeShippingThresholdCents: quote.freeShippingThresholdCents ?? null,
  };
}

/** Communes for a wilaya (cascading select). */
export async function communesAction(wilayaCode: string) {
  const { listCommunes } = await import("@optic/database");
  return listCommunes(wilayaCode);
}
