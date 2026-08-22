import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@optic/ui";
import { computeOrderTotals, type CouponInput } from "@optic/commerce";
import { validateCoupon, listWilayas } from "@optic/database";
import { getTenant } from "../../server/tenant.js";
import { readCart } from "../../server/cart.js";
import { CheckoutClient } from "../../components/checkout-client.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commande" };

export default async function CheckoutPage() {
  const tenant = await getTenant();
  const cart = await readCart();
  if (!cart || cart.lines.length === 0) redirect("/panier");

  let coupon: CouponInput | null = null;
  if (cart.couponCode && tenant.features.coupons) {
    const result = await validateCoupon(tenant.db, cart.couponCode, cart.subtotalCents);
    if (result.ok) coupon = result.coupon;
  }
  const commerce = tenant.settings.commerce as { requireEmailAtCheckout?: boolean; freeShippingThresholdCents?: number };
  const totals = computeOrderTotals({
    lines: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
    coupon,
    shippingFeeCents: 0,
    freeShippingThresholdCents: commerce.freeShippingThresholdCents,
  });

  const wilayas = await listWilayas(tenant.db);

  return (
    <Container>
      <div className="py-8">
        <h1 className="mb-6 font-heading text-3xl font-semibold">Commande</h1>
        <CheckoutClient
          currency={tenant.currency}
          requireEmail={!!commerce.requireEmailAtCheckout}
          wilayas={wilayas.map((w) => ({ code: (w as { code: string }).code, name: (w as { nameFr: string }).nameFr }))}
          lines={cart.lines.map((l) => ({ id: l.id, name: l.name, variantName: l.variantName, imageUrl: l.imageUrl, quantity: l.quantity, unitPriceCents: l.unitPriceCents }))}
          subtotalCents={totals.subtotalCents}
          discountCents={totals.discountCents}
          couponCode={cart.couponCode}
        />
      </div>
    </Container>
  );
}
