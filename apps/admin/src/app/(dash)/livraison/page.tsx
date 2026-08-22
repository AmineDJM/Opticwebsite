import { requirePermission } from "../../../server/session.js";
import { ShippingManager } from "../../../components/shipping-manager.js";

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const ctx = await requirePermission("shipping:read");
  const zones = await ctx.db.shippingZone.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { wilayas: true } } } });
  return (
    <ShippingManager currency={ctx.currency} zones={(zones as never as { id: string; name: string; homeDeliveryCents: number | null; deskDeliveryCents: number | null; freeShippingThresholdCents: number | null; estimatedDaysMin: number; estimatedDaysMax: number; codAllowed: boolean; isActive: boolean; _count: { wilayas: number } }[]).map((z) => ({ id: z.id, name: z.name, homeDeliveryCents: z.homeDeliveryCents, deskDeliveryCents: z.deskDeliveryCents, freeShippingThresholdCents: z.freeShippingThresholdCents, estimatedDaysMin: z.estimatedDaysMin, estimatedDaysMax: z.estimatedDaysMax, codAllowed: z.codAllowed, isActive: z.isActive, wilayaCount: z._count.wilayas }))} />
  );
}
