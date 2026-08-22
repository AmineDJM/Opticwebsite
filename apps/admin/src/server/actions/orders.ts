"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { allowedTransitions, type OrderStatus } from "@optic/commerce";
import { changeOrderStatus as changeOrderStatusRepo } from "@optic/database";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/**
 * Order management actions (§13): status changes (validated against the state machine,
 * applying stock effects) and internal notes. Every status change is audited.
 */

const statusSchema = z.object({
  orderId: z.string().min(1),
  to: z.enum(["NEW", "CONFIRMED", "PREPARING", "READY", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "FAILED_DELIVERY"]),
  note: z.string().trim().max(500).optional(),
});

export type OrderActionState = { ok: boolean; error?: string };

export async function changeStatusAction(input: unknown): Promise<OrderActionState> {
  const ctx = await requirePermission("order:status");
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide" };
  const { orderId, to, note } = parsed.data;

  const order = await ctx.db.order.findFirst({ where: { id: orderId } as never, select: { status: true, number: true } });
  if (!order) return { ok: false, error: "Commande introuvable" };
  const from = (order as { status: OrderStatus }).status;

  if (!allowedTransitions(from).includes(to)) {
    return { ok: false, error: `Transition ${from} → ${to} non autorisée.` };
  }

  try {
    await changeOrderStatusRepo(ctx.db, {
      orderId,
      websiteId: ctx.websiteId,
      to,
      actor: { type: "admin", id: ctx.user.id, name: ctx.user.name },
      note,
    });
    await audit({ action: "order.status", entityType: "Order", entityId: orderId, entityLabel: (order as { number: string }).number, before: { status: from }, after: { status: to } });
    revalidatePath(`/commandes/${orderId}`);
    revalidatePath("/commandes");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function addOrderNoteAction(orderId: string, note: string): Promise<OrderActionState> {
  const ctx = await requirePermission("order:write");
  await ctx.db.order.update({ where: { id: orderId } as never, data: { internalNote: note } as never });
  await audit({ action: "order.note", entityType: "Order", entityId: orderId });
  revalidatePath(`/commandes/${orderId}`);
  return { ok: true };
}

