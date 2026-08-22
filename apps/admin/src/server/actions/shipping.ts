"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/** Shipping zone rate management (§12). */
export type ShipState = { ok: boolean; error?: string };

const zoneSchema = z.object({
  id: z.string(),
  homeDeliveryCents: z.coerce.number().int().min(0).nullable(),
  deskDeliveryCents: z.coerce.number().int().min(0).nullable(),
  freeShippingThresholdCents: z.coerce.number().int().min(0).nullable(),
  estimatedDaysMin: z.coerce.number().int().min(0),
  estimatedDaysMax: z.coerce.number().int().min(0),
  codAllowed: z.coerce.boolean(),
  isActive: z.coerce.boolean(),
});

export async function saveZoneAction(input: unknown): Promise<ShipState> {
  const ctx = await requirePermission("shipping:write");
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Champs invalides" };
  const d = parsed.data;
  await ctx.db.shippingZone.update({
    where: { id: d.id } as never,
    data: { homeDeliveryCents: d.homeDeliveryCents, deskDeliveryCents: d.deskDeliveryCents, freeShippingThresholdCents: d.freeShippingThresholdCents, estimatedDaysMin: d.estimatedDaysMin, estimatedDaysMax: d.estimatedDaysMax, codAllowed: d.codAllowed, isActive: d.isActive } as never,
  });
  await audit({ action: "shipping.update", entityType: "ShippingZone", entityId: d.id });
  revalidatePath("/livraison");
  return { ok: true };
}
