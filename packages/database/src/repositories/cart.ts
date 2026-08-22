
import type { TenantClient } from "../tenant.js";
import { generateToken } from "@optic/core/ids";

/**
 * Cart repository. Carts are persisted (§10) and keyed by a signed token stored in a
 * cookie. Unit prices are captured at add time and re-validated against the live
 * product price at read/checkout so a stale cart never charges the wrong amount.
 */

const CART_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export interface CartLineView {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  inStock: boolean;
  availableStock: number;
  colorHex: string | null;
}

export interface CartView {
  id: string;
  token: string;
  couponCode: string | null;
  note: string | null;
  lines: CartLineView[];
  itemCount: number;
  subtotalCents: number;
}

export async function getOrCreateCart(db: TenantClient, token: string | undefined): Promise<{ id: string; token: string }> {
  if (token) {
    const existing = await db.cart.findFirst({ where: { token } as never, select: { id: true, token: true } });
    if (existing) return existing as { id: string; token: string };
  }
  const newToken = generateToken(24);
  const cart = await db.cart.create({
    data: { token: newToken, expiresAt: new Date(Date.now() + CART_TTL_MS) } as never,
    select: { id: true, token: true },
  });
  return cart as { id: string; token: string };
}

export async function getCartView(db: TenantClient, token: string | undefined): Promise<CartView | null> {
  if (!token) return null;
  const cart = await db.cart.findFirst({
    where: { token } as never,
    include: {
      items: {
        include: {
          product: { select: { slug: true, name: true, priceCents: true, comparePriceCents: true, images: { take: 1, orderBy: { position: "asc" }, include: { media: { select: { url: true } } } } } },
          variant: { select: { name: true, priceCents: true, stock: true, reserved: true, colorHex: true } },
        },
      },
    },
  });
  if (!cart) return null;

  const c = cart as never as {
    id: string;
    token: string;
    couponCode: string | null;
    note: string | null;
    items: Array<{
      id: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      product: { slug: string; name: string; priceCents: number; images: { media: { url: string } }[] };
      variant: { name: string; priceCents: number | null; stock: number; reserved: number; colorHex: string | null } | null;
    }>;
  };

  const lines: CartLineView[] = c.items.map((item) => {
    const unit = item.variant?.priceCents ?? item.product.priceCents;
    const available = item.variant ? item.variant.stock - item.variant.reserved : Number.MAX_SAFE_INTEGER;
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      slug: item.product.slug,
      name: item.product.name,
      variantName: item.variant?.name ?? null,
      imageUrl: item.product.images[0]?.media.url ?? null,
      unitPriceCents: unit,
      quantity: item.quantity,
      lineTotalCents: unit * item.quantity,
      inStock: available > 0,
      availableStock: available,
      colorHex: item.variant?.colorHex ?? null,
    };
  });

  return {
    id: c.id,
    token: c.token,
    couponCode: c.couponCode,
    note: c.note,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalCents: lines.reduce((n, l) => n + l.lineTotalCents, 0),
  };
}

export async function addToCart(
  db: TenantClient,
  cartId: string,
  input: { productId: string; variantId?: string | null; quantity: number },
): Promise<void> {
  // Validate the product exists and capture its current price (tenant-scoped).
  const product = await db.product.findFirst({
    where: { id: input.productId, status: "ACTIVE" } as never,
    select: { id: true, priceCents: true },
  });
  if (!product) throw new Error("Product not available");

  let unitPrice = (product as { priceCents: number }).priceCents;
  if (input.variantId) {
    const variant = await db.productVariant.findFirst({
      where: { id: input.variantId, productId: input.productId, isActive: true } as never,
      select: { priceCents: true },
    });
    if (!variant) throw new Error("Variant not available");
    if ((variant as { priceCents: number | null }).priceCents != null) {
      unitPrice = (variant as { priceCents: number }).priceCents;
    }
  }

  const existing = await db.cartItem.findFirst({
    where: { cartId, productId: input.productId, variantId: input.variantId ?? null } as never,
    select: { id: true, quantity: true },
  });

  if (existing) {
    await db.cartItem.update({
      where: { id: (existing as { id: string }).id },
      data: { quantity: (existing as { quantity: number }).quantity + input.quantity } as never,
    });
  } else {
    await db.cartItem.create({
      data: {
        cartId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        quantity: input.quantity,
        unitPriceCents: unitPrice,
      } as never,
    });
  }
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } as never });
}

export async function updateCartItem(db: TenantClient, itemId: string, quantity: number): Promise<void> {
  if (quantity <= 0) {
    await db.cartItem.deleteMany({ where: { id: itemId } as never });
    return;
  }
  await db.cartItem.updateMany({ where: { id: itemId } as never, data: { quantity } as never });
}

export async function removeCartItem(db: TenantClient, itemId: string): Promise<void> {
  await db.cartItem.deleteMany({ where: { id: itemId } as never });
}

export async function setCartCoupon(db: TenantClient, cartId: string, couponCode: string | null): Promise<void> {
  await db.cart.update({ where: { id: cartId }, data: { couponCode } as never });
}

export async function setCartNote(db: TenantClient, cartId: string, note: string | null): Promise<void> {
  await db.cart.update({ where: { id: cartId }, data: { note } as never });
}
