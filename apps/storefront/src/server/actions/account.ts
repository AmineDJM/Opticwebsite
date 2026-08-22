"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSchema, phoneSchema } from "@optic/core";
import { prisma } from "@optic/database";
import {
  hashPassword,
  verifyPassword,
  issueSession,
  sessionCookieOptions,
  CUSTOMER_COOKIE,
  hashToken,
  isLocked,
  nextLockState,
  RateLimiter,
} from "@optic/auth";
import { getTenant } from "../tenant.js";
import { getCustomer } from "../auth.js";

/**
 * Customer account actions (§14): register, login, logout. Guest checkout means these
 * are optional. Passwords use scrypt; sessions store only a token hash; login is
 * rate-limited and locks after repeated failures.
 */

const loginLimiter = new RateLimiter(10, 60_000);

export type AuthState = { ok: boolean; error?: string };

const registerSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, "8 caractères minimum"),
});

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const tenant = await getTenant();
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  const data = parsed.data;

  const existing = await prisma.customer.findFirst({
    where: { websiteId: tenant.websiteId, OR: [{ email: data.email }, { phone: data.phone }] },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "Un compte existe déjà avec cet e-mail ou téléphone." };

  const customer = await prisma.customer.create({
    data: {
      websiteId: tenant.websiteId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      isGuest: false,
    },
  });

  await startSession(customer.id);
  redirect("/compte");
}

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1) });

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const tenant = await getTenant();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "E-mail ou mot de passe invalide." };

  if (!loginLimiter.check(`${tenant.websiteId}:${parsed.data.email}`).allowed) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans une minute." };
  }

  const customer = await prisma.customer.findFirst({
    where: { websiteId: tenant.websiteId, email: parsed.data.email },
  });
  // Constant-ish behaviour: always run a hash comparison even if user is missing.
  const hash = customer?.passwordHash ?? "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA";
  const valid = await verifyPassword(parsed.data.password, hash);

  if (!customer || !customer.passwordHash || !valid) {
    if (customer) {
      const lock = nextLockState(customer.failedAttempts);
      await prisma.customer.update({ where: { id: customer.id }, data: lock });
    }
    return { ok: false, error: "E-mail ou mot de passe invalide." };
  }
  if (isLocked(customer.lockedUntil)) {
    return { ok: false, error: "Compte temporairement bloqué. Réessayez plus tard." };
  }

  await prisma.customer.update({ where: { id: customer.id }, data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await startSession(customer.id);
  redirect("/compte");
}

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (token) {
    await prisma.customerSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    store.delete(CUSTOMER_COOKIE);
  }
  redirect("/");
}

async function startSession(customerId: string) {
  const session = issueSession();
  await prisma.customerSession.create({
    data: { customerId, tokenHash: session.tokenHash, expiresAt: session.expiresAt },
  });
  const store = await cookies();
  store.set(CUSTOMER_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
}

/** Orders for the logged-in customer (by id, or by phone for guest lookup). */
export async function getMyOrders() {
  const tenant = await getTenant();
  const customer = await getCustomer();
  if (!customer) return [];
  return tenant.db.order.findMany({
    where: { customerId: customer.id } as never,
    orderBy: { createdAt: "desc" },
    include: { items: { select: { name: true, quantity: true } } },
  });
}
