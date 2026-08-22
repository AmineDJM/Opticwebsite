"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSchema } from "@optic/core";
import { prisma } from "@optic/database";
import { verifyPassword, issueSession, sessionCookieOptions, SESSION_COOKIE, hashToken, RateLimiter } from "@optic/auth";

const limiter = new RateLimiter(8, 60_000);
const schema = z.object({ email: emailSchema, password: z.string().min(1) });
export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Identifiants invalides." };
  if (!limiter.check(parsed.data.email).allowed) return { error: "Trop de tentatives." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const hash = user?.passwordHash ?? "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA";
  const valid = await verifyPassword(parsed.data.password, hash);
  if (!user || !valid || !user.isActive) return { error: "E-mail ou mot de passe invalide." };
  if (!user.isPlatformAdmin) return { error: "Accès réservé aux administrateurs de la plateforme." };

  const session = issueSession();
  await prisma.session.create({ data: { userId: user.id, tokenHash: session.tokenHash, expiresAt: session.expiresAt } });
  (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
  redirect("/");
}

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) { await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }); store.delete(SESSION_COOKIE); }
  redirect("/login");
}
