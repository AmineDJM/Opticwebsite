import type { Cents } from "@optic/core";

/**
 * Shipping rate resolution for the Algerian wilaya/commune model (§12). A shipping
 * zone groups wilayas and sets home/desk fees, a free-shipping threshold, delivery
 * estimate and whether COD is allowed. Per-wilaya overrides refine the zone.
 *
 * Pure resolution logic; the database lookup lives in the app layer.
 */

export type DeliveryMethod = "HOME" | "DESK";

export interface ShippingZoneRate {
  zoneId: string;
  homeDeliveryCents?: Cents | null;
  deskDeliveryCents?: Cents | null;
  freeShippingThresholdCents?: Cents | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  carrierKey?: string | null;
  codAllowed: boolean;
}

export interface WilayaOverride {
  homeDeliveryCents?: Cents | null;
  deskDeliveryCents?: Cents | null;
  isAvailable: boolean;
}

export interface ShippingQuote {
  available: boolean;
  method: DeliveryMethod;
  feeCents: Cents;
  freeShippingThresholdCents?: Cents | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  carrierKey?: string | null;
  codAllowed: boolean;
  reason?: string;
}

/**
 * Resolve a shipping quote for a chosen method, applying any per-wilaya override on
 * top of the zone rate. `null` zone → not deliverable.
 */
export function resolveShippingQuote(
  method: DeliveryMethod,
  zone: ShippingZoneRate | null,
  override?: WilayaOverride | null,
): ShippingQuote {
  if (!zone) {
    return {
      available: false,
      method,
      feeCents: 0,
      estimatedDaysMin: 0,
      estimatedDaysMax: 0,
      codAllowed: false,
      reason: "no_zone",
    };
  }
  if (override && !override.isAvailable) {
    return {
      available: false,
      method,
      feeCents: 0,
      estimatedDaysMin: zone.estimatedDaysMin,
      estimatedDaysMax: zone.estimatedDaysMax,
      codAllowed: zone.codAllowed,
      reason: "wilaya_unavailable",
    };
  }

  const zoneFee = method === "HOME" ? zone.homeDeliveryCents : zone.deskDeliveryCents;
  const overrideFee = override
    ? method === "HOME"
      ? override.homeDeliveryCents
      : override.deskDeliveryCents
    : null;

  const fee = overrideFee ?? zoneFee;
  if (fee == null) {
    return {
      available: false,
      method,
      feeCents: 0,
      estimatedDaysMin: zone.estimatedDaysMin,
      estimatedDaysMax: zone.estimatedDaysMax,
      codAllowed: zone.codAllowed,
      reason: "method_unavailable",
    };
  }

  return {
    available: true,
    method,
    feeCents: Math.max(0, fee),
    freeShippingThresholdCents: zone.freeShippingThresholdCents,
    estimatedDaysMin: zone.estimatedDaysMin,
    estimatedDaysMax: zone.estimatedDaysMax,
    carrierKey: zone.carrierKey,
    codAllowed: zone.codAllowed,
  };
}

/**
 * Carrier adapter interface (§12). No live carrier integrations in V1; the interface
 * documents where they plug in. Rates come from the admin-configured zones.
 */
export interface CarrierAdapter {
  readonly key: string;
  readonly label: string;
  quote(input: { wilayaCode: string; method: DeliveryMethod; weightGrams: number }): Promise<Cents | null>;
}
