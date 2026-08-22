import "server-only";
import { cookies } from "next/headers";
import { getCartView, getOrCreateCart, type CartView } from "@optic/database";
import { getTenant } from "./tenant.js";

/**
 * Cart cookie plumbing (thin Next adapter over the DB cart repository). The cart token
 * lives in an httpOnly cookie; the repository owns persistence and price capture.
 */

const CART_COOKIE = "optic_cart";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function getCartToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value;
}

export async function readCart(): Promise<CartView | null> {
  const tenant = await getTenant();
  const token = await getCartToken();
  return getCartView(tenant.db, token);
}

/** Ensure a cart exists and its token is set on the response cookie. Used by mutations. */
export async function ensureCart(): Promise<{ id: string; token: string }> {
  const tenant = await getTenant();
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  const cart = await getOrCreateCart(tenant.db, token);
  if (cart.token !== token) {
    store.set(CART_COOKIE, cart.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }
  return cart;
}
