"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emailSchema } from "@optic/core";
import { prisma } from "@optic/database";
import { hashPassword } from "@optic/auth";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/** Admin user + role management (§35). Only user:write may invite/assign roles. */
export type UserState = { ok: boolean; error?: string };

const inviteSchema = z.object({
  name: z.string().trim().min(2),
  email: emailSchema,
  password: z.string().min(8),
  roleId: z.string().min(1),
});

export async function inviteUserAction(input: unknown): Promise<UserState> {
  const ctx = await requirePermission("user:write");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  const d = parsed.data;

  const role = await ctx.db.role.findFirst({ where: { id: d.roleId } as never });
  if (!role) return { ok: false, error: "Rôle introuvable" };

  try {
    let user = await prisma.user.findUnique({ where: { email: d.email } });
    if (!user) {
      user = await prisma.user.create({ data: { name: d.name, email: d.email, passwordHash: await hashPassword(d.password), isActive: true } });
    }
    await prisma.membership.upsert({
      where: { userId_websiteId: { userId: user.id, websiteId: ctx.websiteId } },
      update: { roleId: d.roleId },
      create: { userId: user.id, websiteId: ctx.websiteId, roleId: d.roleId },
    });
    await audit({ action: "user.invite", entityType: "User", entityId: user.id, entityLabel: d.email });
    revalidatePath("/utilisateurs");
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur lors de l'invitation." };
  }
}

export async function changeRoleAction(userId: string, roleId: string): Promise<UserState> {
  const ctx = await requirePermission("role:write");
  await prisma.membership.update({ where: { userId_websiteId: { userId, websiteId: ctx.websiteId } }, data: { roleId } });
  await audit({ action: "user.role", entityType: "User", entityId: userId, after: { roleId } });
  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function removeUserAction(userId: string): Promise<UserState> {
  const ctx = await requirePermission("user:write");
  if (userId === ctx.user.id) return { ok: false, error: "Vous ne pouvez pas vous retirer vous-même." };
  await prisma.membership.deleteMany({ where: { userId, websiteId: ctx.websiteId } });
  await audit({ action: "user.remove", entityType: "User", entityId: userId });
  revalidatePath("/utilisateurs");
  return { ok: true };
}
