/**
 * Order lifecycle state machine (§13). Encodes the allowed transitions so the admin
 * cannot move an order into an impossible state, and so downstream logic (stock
 * release, revenue recognition) can react to *valid* transitions only.
 *
 * COD-specific reality: a "confirmed" order is not yet revenue. Revenue is only
 * recognised at DELIVERED. FAILED_DELIVERY and RETURNED must release reserved stock.
 */

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "FAILED_DELIVERY",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed forward/branch transitions from each status. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "FAILED_DELIVERY"],
  DELIVERED: ["RETURNED"],
  FAILED_DELIVERY: ["SHIPPED", "CANCELLED", "RETURNED"], // re-attempt or give up
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return [...(TRANSITIONS[from] ?? [])];
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Statuses in which reserved stock is still held (not yet released or consumed). */
export function holdsReservedStock(status: OrderStatus): boolean {
  return ["NEW", "CONFIRMED", "PREPARING", "READY", "SHIPPED"].includes(status);
}

/** Does entering this status release the reservation back to available stock? */
export function releasesStock(to: OrderStatus): boolean {
  return ["CANCELLED", "RETURNED", "FAILED_DELIVERY"].includes(to);
}

/** Does entering this status permanently consume stock (sale completed)? */
export function consumesStock(to: OrderStatus): boolean {
  return to === "DELIVERED";
}

/** COD revenue is only real once delivered. Used by the dashboard's revenue tiers. */
export function isRealisedRevenue(status: OrderStatus): boolean {
  return status === "DELIVERED";
}

export type RevenueTier = "ordered" | "confirmed" | "shipped" | "delivered";

export function revenueTier(status: OrderStatus): RevenueTier | null {
  switch (status) {
    case "NEW":
      return "ordered";
    case "CONFIRMED":
    case "PREPARING":
    case "READY":
      return "confirmed";
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    default:
      return null; // cancelled/returned/failed contribute to no revenue tier
  }
}

export interface TransitionEffect {
  releaseStock: boolean;
  consumeStock: boolean;
  timestampField: "confirmedAt" | "shippedAt" | "deliveredAt" | "cancelledAt" | null;
}

/** Describe the side-effects a valid transition should trigger. Throws if invalid. */
export function transitionEffect(from: OrderStatus, to: OrderStatus): TransitionEffect {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
  const timestampField =
    to === "CONFIRMED"
      ? "confirmedAt"
      : to === "SHIPPED"
        ? "shippedAt"
        : to === "DELIVERED"
          ? "deliveredAt"
          : to === "CANCELLED"
            ? "cancelledAt"
            : null;
  return {
    releaseStock: releasesStock(to) && holdsReservedStock(from),
    consumeStock: consumesStock(to),
    timestampField,
  };
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Nouvelle",
  CONFIRMED: "Confirmée",
  PREPARING: "En préparation",
  READY: "Prête",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  RETURNED: "Retournée",
  FAILED_DELIVERY: "Livraison échouée",
};
