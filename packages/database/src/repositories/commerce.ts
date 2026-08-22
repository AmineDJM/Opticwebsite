import type { TenantClient } from "../tenant.js";
import { resolveShippingQuote, type CouponInput, type DeliveryMethod, type ShippingQuote } from "@optic/commerce";

/**
 * Commerce lookups that back the cart/checkout: coupon validation and shipping-quote
 * resolution from the admin-configured wilaya zones.
 */

export async function validateCoupon(
  db: TenantClient,
  code: string,
  subtotalCents: number,
): Promise<{ ok: true; coupon: CouponInput } | { ok: false; reason: string }> {
  const normalized = code.trim().toUpperCase();
  const coupon = await db.coupon.findFirst({ where: { code: normalized, isActive: true } as never });
  if (!coupon) return { ok: false, reason: "not_found" };

  const c = coupon as never as {
    code: string;
    type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
    value: number;
    minSubtotalCents: number;
    maxDiscountCents: number | null;
    usageLimit: number | null;
    usageCount: number;
    startsAt: Date | null;
    endsAt: Date | null;
  };

  const now = new Date();
  if (c.startsAt && c.startsAt > now) return { ok: false, reason: "not_started" };
  if (c.endsAt && c.endsAt < now) return { ok: false, reason: "expired" };
  if (c.usageLimit != null && c.usageCount >= c.usageLimit) return { ok: false, reason: "usage_limit" };
  if (subtotalCents < c.minSubtotalCents) return { ok: false, reason: "min_subtotal" };

  return {
    ok: true,
    coupon: {
      code: c.code,
      type: c.type,
      value: c.value,
      minSubtotalCents: c.minSubtotalCents,
      maxDiscountCents: c.maxDiscountCents,
    },
  };
}

export async function getShippingQuote(
  db: TenantClient,
  wilayaCode: string,
  method: DeliveryMethod,
): Promise<ShippingQuote> {
  // Find the active zone that includes this wilaya, plus any per-wilaya override.
  const zoneWilaya = await db.shippingZone.findFirst({
    where: { isActive: true, wilayas: { some: { wilayaCode } } } as never,
    include: { wilayas: { where: { wilayaCode } } },
  });
  if (!zoneWilaya) return resolveShippingQuote(method, null);

  const z = zoneWilaya as never as {
    id: string;
    homeDeliveryCents: number | null;
    deskDeliveryCents: number | null;
    freeShippingThresholdCents: number | null;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
    carrierKey: string | null;
    codAllowed: boolean;
    wilayas: Array<{ homeDeliveryCents: number | null; deskDeliveryCents: number | null; isAvailable: boolean }>;
  };
  const override = z.wilayas[0];

  return resolveShippingQuote(
    method,
    {
      zoneId: z.id,
      homeDeliveryCents: z.homeDeliveryCents,
      deskDeliveryCents: z.deskDeliveryCents,
      freeShippingThresholdCents: z.freeShippingThresholdCents,
      estimatedDaysMin: z.estimatedDaysMin,
      estimatedDaysMax: z.estimatedDaysMax,
      carrierKey: z.carrierKey,
      codAllowed: z.codAllowed,
    },
    override ? { homeDeliveryCents: override.homeDeliveryCents, deskDeliveryCents: override.deskDeliveryCents, isAvailable: override.isAvailable } : null,
  );
}

export async function listWilayas(_db: TenantClient) {
  // Wilayas are global reference data — read from the base client via prisma directly.
  const { prisma } = await import("../client.js");
  return prisma.wilaya.findMany({ orderBy: { code: "asc" }, select: { code: true, nameFr: true, nameAr: true } });
}

export async function listCommunes(wilayaCode: string) {
  const { prisma } = await import("../client.js");
  return prisma.commune.findMany({ where: { wilayaCode }, orderBy: { nameFr: "asc" }, select: { id: true, nameFr: true, nameAr: true } });
}
