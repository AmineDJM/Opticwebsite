import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, tenantClient, type TenantClient } from "@optic/database";
import { SESSION_COOKIE, hashToken, isExpired, shouldRefresh, can, type Permission } from "@optic/auth";
import { resolveFeatures, type FeatureFlags } from "@optic/config";

/**
 * Admin session + authorization. Resolves the signed-in User, their membership on the
 * managed website, and the effective permission set. Every admin page/action derives
 * its tenant client from here, so no admin query can escape the brand it manages.
 *
 * The managed website is chosen by SITE_SLUG (single-brand deployment) or, for the
 * platform, by the user's memberships. This app manages exactly one brand per session.
 */

export interface AdminContext {
  user: { id: string; name: string; email: string; isPlatformAdmin: boolean };
  websiteId: string;
  websiteName: string;
  currency: string;
  permissions: string[];
  roleKey: string;
  features: FeatureFlags;
  db: TenantClient;
}

export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || isExpired(session.expiresAt) || !session.user.isActive) return null;

  // Slide the session's lastSeen at most daily.
  if (shouldRefresh(session.lastSeenAt)) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  const slug = process.env.SITE_SLUG;
  const website = slug
    ? await prisma.website.findUnique({ where: { slug }, include: { featureFlags: true } })
    : null;

  // Resolve membership (or platform admin) for the managed website.
  let websiteId: string;
  let websiteName: string;
  let currency: string;
  const features: Record<string, boolean> = {};
  let permissions: string[];
  let roleKey: string;

  if (website) {
    websiteId = website.id;
    websiteName = website.name;
    currency = website.currency;
    for (const f of website.featureFlags) features[f.key] = f.enabled;
    const membership = await prisma.membership.findUnique({
      where: { userId_websiteId: { userId: session.user.id, websiteId } },
      include: { role: true },
    });
    if (session.user.isPlatformAdmin) {
      permissions = ["*"];
      roleKey = "super_admin";
    } else if (membership) {
      permissions = membership.role.permissions;
      roleKey = membership.role.key;
    } else {
      return null; // authenticated but no access to this brand
    }
  } else {
    // No SITE_SLUG: use the user's first membership (or platform default).
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { role: true, website: { include: { featureFlags: true } } },
    });
    if (!membership) return null;
    websiteId = membership.websiteId;
    websiteName = membership.website.name;
    currency = membership.website.currency;
    for (const f of membership.website.featureFlags) features[f.key] = f.enabled;
    permissions = session.user.isPlatformAdmin ? ["*"] : membership.role.permissions;
    roleKey = session.user.isPlatformAdmin ? "super_admin" : membership.role.key;
  }

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email, isPlatformAdmin: session.user.isPlatformAdmin },
    websiteId,
    websiteName,
    currency,
    permissions,
    roleKey,
    features: resolveFeatures(features),
    db: tenantClient(websiteId),
  };
});

/** Require a signed-in admin; redirect to login otherwise. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Require a specific permission; redirect to a 403 page otherwise. */
export async function requirePermission(permission: Permission): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!can(ctx.permissions, permission)) redirect("/denied");
  return ctx;
}

/** Client IP + UA for audit logs. */
export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  return { ip, userAgent: h.get("user-agent") ?? null };
}
