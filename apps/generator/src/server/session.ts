import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@optic/database";
import { SESSION_COOKIE, hashToken, isExpired } from "@optic/auth";

/**
 * Platform (super-admin) session for the generator app (§2 App C). Only users with
 * `isPlatformAdmin` may create websites and export source code. This is the platform-
 * level context — the only place that touches unscoped platform tables (Website, User).
 */

export interface PlatformContext {
  user: { id: string; name: string; email: string };
}

export const getPlatformContext = cache(async (): Promise<PlatformContext | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || isExpired(session.expiresAt) || !session.user.isActive) return null;
  if (!session.user.isPlatformAdmin) return null;

  return { user: { id: session.user.id, name: session.user.name, email: session.user.email } };
});

export async function requirePlatform(): Promise<PlatformContext> {
  const ctx = await getPlatformContext();
  if (!ctx) redirect("/login");
  return ctx;
}
