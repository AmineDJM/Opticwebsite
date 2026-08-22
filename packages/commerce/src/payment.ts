import type { Cents } from "@optic/core";

/**
 * Payment provider abstraction (§11). V1 implements ONLY cash-on-delivery. The
 * interface exists so CIB / Edahabia / Stripe can be added later as new providers
 * without touching the checkout flow. Nothing speculative is implemented here.
 */

export type PaymentMethod = "CASH_ON_DELIVERY" | "BANK_TRANSFER" | "CARD";

export interface PaymentContext {
  orderId: string;
  amountCents: Cents;
  currency: string;
  customerPhone: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  status: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED";
  reference?: string;
  /** When a provider needs the customer to be redirected (card gateways). */
  redirectUrl?: string;
  message?: string;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  readonly label: string;
  /** Does completing this payment require redirecting the customer off-site? */
  readonly requiresRedirect: boolean;
  /** Begin the payment. For COD this simply marks it pending-on-delivery. */
  authorize(ctx: PaymentContext): Promise<PaymentResult>;
  /** Capture funds (no-op for COD until delivered). */
  capture(reference: string): Promise<PaymentResult>;
  /** Cancel/void an uncaptured authorization. */
  void(reference: string): Promise<PaymentResult>;
}

/**
 * Cash on delivery. The customer pays the courier; the store confirms payment when
 * the order reaches DELIVERED. There is no external gateway, so authorize simply
 * records intent and capture is driven by the order state machine.
 */
export class CashOnDeliveryProvider implements PaymentProvider {
  readonly method = "CASH_ON_DELIVERY" as const;
  readonly label = "Paiement à la livraison";
  readonly requiresRedirect = false;

  async authorize(ctx: PaymentContext): Promise<PaymentResult> {
    return { status: "PENDING", reference: `cod_${ctx.orderId}`, message: "Payable à la livraison" };
  }

  async capture(reference: string): Promise<PaymentResult> {
    // Cash is collected physically; capture just records that it happened.
    return { status: "PAID", reference };
  }

  async void(reference: string): Promise<PaymentResult> {
    return { status: "FAILED", reference, message: "Annulée" };
  }
}

/** Registry of enabled providers. Only COD is registered in V1. */
export class PaymentRegistry {
  private readonly providers = new Map<PaymentMethod, PaymentProvider>();

  register(provider: PaymentProvider): this {
    this.providers.set(provider.method, provider);
    return this;
  }

  get(method: PaymentMethod): PaymentProvider {
    const p = this.providers.get(method);
    if (!p) throw new Error(`No payment provider registered for ${method}`);
    return p;
  }

  has(method: PaymentMethod): boolean {
    return this.providers.has(method);
  }

  list(): PaymentProvider[] {
    return [...this.providers.values()];
  }
}

/** The default registry for V1: cash on delivery only. */
export function createDefaultPaymentRegistry(): PaymentRegistry {
  return new PaymentRegistry().register(new CashOnDeliveryProvider());
}
