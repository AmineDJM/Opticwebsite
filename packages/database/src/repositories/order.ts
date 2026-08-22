import { prisma } from "../client.js";
import type { TenantClient } from "../tenant.js";
import { generateOrderNumber } from "@optic/core";
import {
  computeOrderTotals,
  transitionEffect,
  type OrderStatus,
  type CouponInput,
} from "@optic/commerce";

/**
 * Order repository. `createOrder` is the transactional heart of COD checkout (§11):
 * it re-prices the cart from live data (never trusting client prices), reserves stock,
 * writes the order + items + initial history, and consumes the coupon — all in one
 * transaction so a failure leaves nothing half-created.
 */

export interface CreateOrderInput {
  websiteId: string;
  orderNumberPrefix: string;
  cartToken: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    phoneAlt?: string | null;
    email?: string | null;
    customerId?: string | null;
  };
  delivery: {
    wilayaCode: string;
    communeId?: string | null;
    addressLine: string;
    landmark?: string | null;
    method: "HOME" | "DESK";
    carrierKey?: string | null;
    shippingCents: number;
    freeShippingThresholdCents?: number | null;
  };
  coupon?: CouponInput | null;
  note?: string | null;
  locale?: string;
  currency: string;
  stockStrategy: "reserve" | "decrement";
}

export interface CreatedOrder {
  id: string;
  number: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
}

export async function createOrder(db: TenantClient, input: CreateOrderInput): Promise<CreatedOrder> {
  return prisma.$transaction(async (tx) => {
    // Load the cart with live product/variant data inside the transaction.
    const cart = await tx.cart.findFirst({
      where: { token: input.cartToken, websiteId: input.websiteId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, priceCents: true, images: { take: 1, orderBy: { position: "asc" }, include: { media: { select: { url: true } } } } } },
            variant: { select: { id: true, name: true, sku: true, priceCents: true, stock: true, reserved: true } },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

    // Re-price from live data and check stock.
    const lines = cart.items.map((item) => {
      const unit = item.variant?.priceCents ?? item.product.priceCents;
      return {
        productId: item.product.id,
        variantId: item.variant?.id ?? null,
        sku: item.variant?.sku ?? item.product.sku,
        name: item.product.name,
        variantName: item.variant?.name ?? null,
        imageUrl: item.product.images[0]?.media.url ?? null,
        quantity: item.quantity,
        unitPriceCents: unit,
        available: item.variant ? item.variant.stock - item.variant.reserved : Number.MAX_SAFE_INTEGER,
      };
    });

    for (const line of lines) {
      if (line.variantId && line.quantity > line.available) {
        throw new Error(`OUT_OF_STOCK:${line.name}`);
      }
    }

    const totals = computeOrderTotals({
      lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
      coupon: input.coupon ?? null,
      shippingFeeCents: input.delivery.shippingCents,
      freeShippingThresholdCents: input.delivery.freeShippingThresholdCents,
    });

    // Reserve (or decrement) stock for variant lines.
    for (const line of lines) {
      if (!line.variantId) continue;
      if (input.stockStrategy === "reserve") {
        await tx.productVariant.update({ where: { id: line.variantId }, data: { reserved: { increment: line.quantity } } });
      } else {
        await tx.productVariant.update({ where: { id: line.variantId }, data: { stock: { decrement: line.quantity } } });
      }
      await tx.stockMovement.create({
        data: {
          websiteId: input.websiteId,
          variantId: line.variantId,
          delta: input.stockStrategy === "reserve" ? 0 : -line.quantity,
          reason: input.stockStrategy === "reserve" ? "order_reserved" : "order_decremented",
          note: `Order ${line.sku}`,
        },
      });
    }

    // Generate a unique order number (retry on the rare collision).
    let number = generateOrderNumber(input.orderNumberPrefix);
    for (let i = 0; i < 5; i++) {
      const clash = await tx.order.findFirst({ where: { websiteId: input.websiteId, number }, select: { id: true } });
      if (!clash) break;
      number = generateOrderNumber(input.orderNumberPrefix);
    }

    const order = await tx.order.create({
      data: {
        websiteId: input.websiteId,
        number,
        customerId: input.customer.customerId ?? null,
        status: "NEW",
        paymentMethod: "CASH_ON_DELIVERY",
        paymentStatus: "PENDING",
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        phone: input.customer.phone,
        phoneAlt: input.customer.phoneAlt ?? null,
        email: input.customer.email ?? null,
        wilayaCode: input.delivery.wilayaCode,
        communeId: input.delivery.communeId ?? null,
        addressLine: input.delivery.addressLine,
        landmark: input.delivery.landmark ?? null,
        deliveryMethod: input.delivery.method,
        carrierKey: input.delivery.carrierKey ?? null,
        currency: input.currency,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
        couponCode: input.coupon?.code ?? null,
        customerNote: input.note ?? null,
        locale: input.locale ?? null,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            sku: l.sku,
            name: l.name,
            variantName: l.variantName,
            imageUrl: l.imageUrl,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            totalCents: l.unitPriceCents * l.quantity,
          })),
        },
        history: {
          create: { toStatus: "NEW", actorType: "customer", note: "Commande créée" },
        },
      },
      select: { id: true, number: true, totalCents: true, subtotalCents: true, shippingCents: true, discountCents: true },
    });

    // Consume the coupon.
    if (input.coupon?.code) {
      await tx.coupon.updateMany({
        where: { websiteId: input.websiteId, code: input.coupon.code },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Empty the cart.
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

    return order as CreatedOrder;
  });
}

/**
 * Change an order's status, applying the state-machine side-effects (stock
 * release/consume, timestamps) and recording history. Rejects invalid transitions.
 */
export async function changeOrderStatus(
  db: TenantClient,
  input: { orderId: string; websiteId: string; to: OrderStatus; actor: { type: string; id?: string; name?: string }; note?: string },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, websiteId: input.websiteId },
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    if (!order) throw new Error("Order not found");

    const from = order.status as OrderStatus;
    const effect = transitionEffect(from, input.to); // throws on invalid transition

    for (const item of order.items) {
      if (!item.variantId) continue;
      if (effect.releaseStock) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { reserved: { decrement: item.quantity } } });
      }
      if (effect.consumeStock) {
        // Convert the reservation into an actual stock decrement.
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity }, reserved: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: { websiteId: input.websiteId, variantId: item.variantId, delta: -item.quantity, reason: "order_delivered", orderId: order.id },
        });
      }
    }

    const data: Record<string, unknown> = { status: input.to };
    if (effect.timestampField) data[effect.timestampField] = new Date();
    if (input.to === "DELIVERED") data.paymentStatus = "PAID";

    await tx.order.update({ where: { id: order.id }, data });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: from,
        toStatus: input.to,
        note: input.note ?? null,
        actorType: input.actor.type,
        actorId: input.actor.id ?? null,
        actorName: input.actor.name ?? null,
      },
    });
  });
}

export async function getOrderByNumber(db: TenantClient, number: string) {
  return db.order.findFirst({
    where: { number } as never,
    include: {
      items: true,
      history: { orderBy: { createdAt: "asc" } },
      wilaya: { select: { nameFr: true } },
      commune: { select: { nameFr: true } },
    },
  });
}
