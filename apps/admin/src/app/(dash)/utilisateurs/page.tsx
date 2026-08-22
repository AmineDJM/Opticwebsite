import { prisma } from "@optic/database";
import { requirePermission } from "../../../server/session.js";
import { UsersManager } from "../../../components/users-manager.js";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const ctx = await requirePermission("user:read");
  const [memberships, roles] = await Promise.all([
    prisma.membership.findMany({ where: { websiteId: ctx.websiteId }, include: { user: { select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true } }, role: { select: { id: true, name: true, key: true } } } }),
    ctx.db.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, key: true } }),
  ]);
  const canManage = ctx.permissions.includes("*") || ctx.permissions.includes("user:write");

  return (
    <UsersManager
      canManage={canManage}
      currentUserId={ctx.user.id}
      roles={roles as { id: string; name: string; key: string }[]}
      members={memberships.map((m) => ({ userId: m.user.id, name: m.user.name, email: m.user.email, isActive: m.user.isActive, roleId: m.role.id, roleName: m.role.name, lastLoginAt: m.user.lastLoginAt }))}
    />
  );
}
