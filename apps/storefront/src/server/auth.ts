import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@optic/database";
import { CUSTOMER_COOKIE, hashToken, isExpired } from "@optic/auth";
import { getTenant } from "./tenant.js";

/**
 * Customer session (storefront accounts, §14). Opaque token in an httpOnly cookie; only
 * its hash is stored. Guest checkout is always allowed, so this is optional context.
 */

export interface CustomerContext {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
}

export const getCustomer = cache(async (): Promise<CustomerContext | null> => {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const tenant = await getTenant();

  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { customer: true },
  });
  if (!session || isExpired(session.expiresAt)) return null;
  const c = session.customer;
  // Tenant isolation: a session only counts for the resolved brand.
  if (c.websiteId !== tenant.websiteId) return null;

  return { id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone };
});
