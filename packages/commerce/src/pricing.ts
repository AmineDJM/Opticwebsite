import { applyPercentage, clampCents, sumCents, type Cents } from "@optic/core";

/**
 * Pricing and cart totals. Pure functions over plain data — no database, no
 * framework. The storefront and admin both compute totals through here so a price
 * shown to a customer and a price recorded on an order can never diverge.
 */

export interface PricedLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPriceCents: Cents;
}

export interface LineTotal extends PricedLine {
  lineTotalCents: Cents;
}

export function lineTotal(line: PricedLine): Cents {
  return line.unitPriceCents * line.quantity;
}

export function subtotal(lines: readonly PricedLine[]): Cents {
  return sumCents(lines.map(lineTotal));
}

export type DiscountKind = "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";

export interface CouponInput {
  code: string;
  type: DiscountKind;
  /** percentage points for PERCENTAGE, cents for FIXED, ignored for FREE_SHIPPING */
  value: number;
  minSubtotalCents: Cents;
  maxDiscountCents?: Cents | null;
}

export interface DiscountResult {
  discountCents: Cents;
  freeShipping: boolean;
  applied: boolean;
  reason?: string;
}

/**
 * Compute the discount a coupon yields against a subtotal. Never returns a discount
 * larger than the subtotal, and honours an optional cap.
 */
export function computeDiscount(subtotalCents: Cents, coupon: CouponInput | null): DiscountResult {
  if (!coupon) return { discountCents: 0, freeShipping: false, applied: false };
  if (subtotalCents < coupon.minSubtotalCents) {
    return {
      discountCents: 0,
      freeShipping: false,
      applied: false,
      reason: "min_subtotal_not_met",
    };
  }

  if (coupon.type === "FREE_SHIPPING") {
    return { discountCents: 0, freeShipping: true, applied: true };
  }

  let raw =
    coupon.type === "PERCENTAGE"
      ? applyPercentage(subtotalCents, coupon.value)
      : Math.round(coupon.value);

  if (coupon.maxDiscountCents != null) raw = Math.min(raw, coupon.maxDiscountCents);
  const discountCents = clampCents(raw, 0, subtotalCents);
  return { discountCents, freeShipping: false, applied: discountCents > 0 };
}

export interface ShippingInput {
  /** Base shipping fee for the chosen method/zone. */
  feeCents: Cents;
  /** Site- or zone-level free-shipping threshold on the *pre-discount* subtotal. */
  freeShippingThresholdCents?: Cents | null;
  /** Coupon granted free shipping. */
  couponFreeShipping?: boolean;
}

export function computeShipping(subtotalCents: Cents, input: ShippingInput): Cents {
  if (input.couponFreeShipping) return 0;
  if (
    input.freeShippingThresholdCents != null &&
    input.freeShippingThresholdCents > 0 &&
    subtotalCents >= input.freeShippingThresholdCents
  ) {
    return 0;
  }
  return Math.max(0, input.feeCents);
}

export interface OrderTotals {
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  freeShipping: boolean;
  couponApplied: boolean;
}

export interface ComputeTotalsInput {
  lines: readonly PricedLine[];
  coupon?: CouponInput | null;
  shippingFeeCents?: Cents;
  freeShippingThresholdCents?: Cents | null;
}

/** The single entry point: lines + coupon + shipping → the authoritative totals. */
export function computeOrderTotals(input: ComputeTotalsInput): OrderTotals {
  const sub = subtotal(input.lines);
  const discount = computeDiscount(sub, input.coupon ?? null);
  const shipping = computeShipping(sub, {
    feeCents: input.shippingFeeCents ?? 0,
    freeShippingThresholdCents: input.freeShippingThresholdCents,
    couponFreeShipping: discount.freeShipping,
  });
  const total = Math.max(0, sub - discount.discountCents + shipping);
  return {
    subtotalCents: sub,
    discountCents: discount.discountCents,
    shippingCents: shipping,
    totalCents: total,
    freeShipping: discount.freeShipping || shipping === 0,
    couponApplied: discount.applied,
  };
}
