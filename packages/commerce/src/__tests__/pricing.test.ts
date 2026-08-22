import { describe, it, expect } from "vitest";
import {
  computeOrderTotals,
  computeDiscount,
  computeShipping,
  subtotal,
  type PricedLine,
  type CouponInput,
} from "../pricing";

const lines: PricedLine[] = [
  { productId: "p1", quantity: 2, unitPriceCents: 500000 }, // 2 x 5000 DA
  { productId: "p2", quantity: 1, unitPriceCents: 300000 }, // 3000 DA
];

describe("subtotal", () => {
  it("sums line totals", () => {
    expect(subtotal(lines)).toBe(1300000);
  });
});

describe("computeDiscount", () => {
  const pct: CouponInput = { code: "P10", type: "PERCENTAGE", value: 10, minSubtotalCents: 0 };
  it("applies a percentage", () => {
    expect(computeDiscount(1300000, pct).discountCents).toBe(130000);
  });
  it("respects a max cap", () => {
    const capped: CouponInput = { ...pct, maxDiscountCents: 50000 };
    expect(computeDiscount(1300000, capped).discountCents).toBe(50000);
  });
  it("enforces a minimum subtotal", () => {
    const min: CouponInput = { ...pct, minSubtotalCents: 2000000 };
    const r = computeDiscount(1300000, min);
    expect(r.applied).toBe(false);
    expect(r.reason).toBe("min_subtotal_not_met");
  });
  it("never discounts more than the subtotal", () => {
    const fixed: CouponInput = { code: "BIG", type: "FIXED", value: 9999999, minSubtotalCents: 0 };
    expect(computeDiscount(1300000, fixed).discountCents).toBe(1300000);
  });
  it("flags free shipping", () => {
    const fs: CouponInput = { code: "FS", type: "FREE_SHIPPING", value: 0, minSubtotalCents: 0 };
    expect(computeDiscount(1300000, fs).freeShipping).toBe(true);
  });
});

describe("computeShipping", () => {
  it("charges the fee below threshold", () => {
    expect(computeShipping(500000, { feeCents: 40000, freeShippingThresholdCents: 800000 })).toBe(40000);
  });
  it("is free at or above threshold", () => {
    expect(computeShipping(800000, { feeCents: 40000, freeShippingThresholdCents: 800000 })).toBe(0);
  });
  it("is free when a coupon grants it", () => {
    expect(computeShipping(500000, { feeCents: 40000, couponFreeShipping: true })).toBe(0);
  });
});

describe("computeOrderTotals", () => {
  it("combines subtotal, discount and shipping", () => {
    const totals = computeOrderTotals({
      lines,
      coupon: { code: "P10", type: "PERCENTAGE", value: 10, minSubtotalCents: 0 },
      shippingFeeCents: 40000,
      freeShippingThresholdCents: 2000000,
    });
    expect(totals.subtotalCents).toBe(1300000);
    expect(totals.discountCents).toBe(130000);
    expect(totals.shippingCents).toBe(40000);
    expect(totals.totalCents).toBe(1300000 - 130000 + 40000);
  });
  it("free-shipping coupon zeroes shipping", () => {
    const totals = computeOrderTotals({
      lines,
      coupon: { code: "FS", type: "FREE_SHIPPING", value: 0, minSubtotalCents: 0 },
      shippingFeeCents: 40000,
    });
    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(1300000);
  });
});
