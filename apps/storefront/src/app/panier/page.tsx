import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Container, EmptyState, buttonVariants } from "@optic/ui";
import { computeOrderTotals, type CouponInput } from "@optic/commerce";
import { validateCoupon } from "@optic/database";
import { getTenant } from "../../server/tenant.js";
import { readCart } from "../../server/cart.js";
import { CartClient } from "../../components/cart-client.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panier" };

export default async function CartPage() {
  const tenant = await getTenant();
  const cart = await readCart();

  if (!cart || cart.lines.length === 0) {
    return (
      <Container>
        <div className="py-12">
          <h1 className="mb-6 font-heading text-3xl font-semibold">Votre panier</h1>
          <EmptyState
            icon={<ShoppingBag size={48} strokeWidth={1.2} />}
            title="Votre panier est vide"
            description="Découvrez nos montures, solaires et lentilles."
            action={<Link href="/boutique" className={buttonVariants()}>Découvrir la boutique</Link>}
          />
        </div>
      </Container>
    );
  }

  // Resolve coupon for display totals.
  let coupon: CouponInput | null = null;
  if (cart.couponCode && tenant.features.coupons) {
    const result = await validateCoupon(tenant.db, cart.couponCode, cart.subtotalCents);
    if (result.ok) coupon = result.coupon;
  }
  const commerce = tenant.settings.commerce as { freeShippingThresholdCents?: number };
  const totals = computeOrderTotals({
    lines: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
    coupon,
    shippingFeeCents: 0,
    freeShippingThresholdCents: commerce.freeShippingThresholdCents,
  });

  return (
    <Container>
      <div className="py-8">
        <h1 className="mb-6 font-heading text-3xl font-semibold">Votre panier</h1>
        <CartClient
          lines={cart.lines}
          currency={tenant.currency}
          couponCode={cart.couponCode}
          totals={{ subtotalCents: totals.subtotalCents, discountCents: totals.discountCents, totalCents: totals.subtotalCents - totals.discountCents }}
          features={{ coupons: tenant.features.coupons }}
          freeShippingThresholdCents={commerce.freeShippingThresholdCents ?? null}
        />
      </div>
    </Container>
  );
}
