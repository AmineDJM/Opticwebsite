import { describe, it, expect } from "vitest";
import { resolveShippingQuote, type ShippingZoneRate } from "../shipping";
import { createDefaultPaymentRegistry, CashOnDeliveryProvider } from "../payment";

const zone: ShippingZoneRate = {
  zoneId: "z1",
  homeDeliveryCents: 60000,
  deskDeliveryCents: 40000,
  freeShippingThresholdCents: 1000000,
  estimatedDaysMin: 2,
  estimatedDaysMax: 5,
  carrierKey: "yalidine",
  codAllowed: true,
};

describe("shipping resolution", () => {
  it("returns home fee", () => {
    const q = resolveShippingQuote("HOME", zone);
    expect(q.available).toBe(true);
    expect(q.feeCents).toBe(60000);
  });
  it("returns desk fee", () => {
    expect(resolveShippingQuote("DESK", zone).feeCents).toBe(40000);
  });
  it("applies a per-wilaya override", () => {
    const q = resolveShippingQuote("HOME", zone, { homeDeliveryCents: 80000, isAvailable: true });
    expect(q.feeCents).toBe(80000);
  });
  it("marks unavailable when wilaya disabled", () => {
    const q = resolveShippingQuote("HOME", zone, { isAvailable: false });
    expect(q.available).toBe(false);
    expect(q.reason).toBe("wilaya_unavailable");
  });
  it("marks unavailable when no zone", () => {
    expect(resolveShippingQuote("HOME", null).available).toBe(false);
  });
});

describe("payment registry", () => {
  it("registers COD by default and nothing else", () => {
    const reg = createDefaultPaymentRegistry();
    expect(reg.has("CASH_ON_DELIVERY")).toBe(true);
    expect(reg.has("CARD")).toBe(false);
    expect(reg.list()).toHaveLength(1);
  });
  it("COD authorize is pending, capture is paid", async () => {
    const cod = new CashOnDeliveryProvider();
    const auth = await cod.authorize({ orderId: "o1", amountCents: 100, currency: "DZD", customerPhone: "0550000000" });
    expect(auth.status).toBe("PENDING");
    const cap = await cod.capture(auth.reference!);
    expect(cap.status).toBe("PAID");
  });
});
