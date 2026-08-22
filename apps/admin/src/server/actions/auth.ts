"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSchema } from "@optic/core";
import { prisma } from "@optic/database";
import {
  verifyPassword,
  issueSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  hashToken,
  isLocked,
  nextLockState,
  RateLimiter,
} from "@optic/auth";

/**
 * Admin authentication. scrypt verification, hashed opaque sessions, rate limit and
 * lockout after repeated failures (§34). Uniform error message avoids user enumeration.
 */

const limiter = new RateLimiter(8, 60_000);
const schema = z.object({ email: emailSchema, password: z.string().min(1) });

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Identifiants invalides." };
  const { email, password } = parsed.data;

  if (!limiter.check(email).allowed) return { error: "Trop de tentatives. Réessayez dans une minute." };

  const user = await prisma.user.findUnique({ where: { email } });
  const hash = user?.passwordHash ?? "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA";
  const valid = await verifyPassword(password, hash);

  if (!user || !valid || !user.isActive) {
    if (user) await prisma.user.update({ where: { id: user.id }, data: nextLockState(user.failedAttempts) });
    return { error: "E-mail ou mot de passe invalide." };
  }
  if (isLocked(user.lockedUntil)) return { error: "Compte temporairement bloqué. Réessayez plus tard." };

  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });

  const session = issueSession();
  await prisma.session.create({ data: { userId: user.id, tokenHash: session.tokenHash, expiresAt: session.expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));

  redirect("/");
}

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    store.delete(SESSION_COOKIE);
  }
  redirect("/login");
}
