import "server-only";
import { prisma } from "@optic/database";
import { getAdminContext, requestMeta } from "./session.js";

/**
 * Audit logging (§36). Records sensitive admin actions with actor, target and
 * before/after values. Called from server actions after a successful mutation.
 */

export interface AuditInput {
  action: string; // e.g. "price.update", "order.status", "product.delete"
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  before?: unknown;
  after?: unknown;
}

export async function audit(input: AuditInput): Promise<void> {
  const ctx = await getAdminContext();
  if (!ctx) return;
  const meta = await requestMeta();
  try {
    await prisma.auditLog.create({
      data: {
        websiteId: ctx.websiteId,
        userId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        before: (input.before ?? undefined) as never,
        after: (input.after ?? undefined) as never,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch {
    // Auditing must never break the action it records.
  }
}
