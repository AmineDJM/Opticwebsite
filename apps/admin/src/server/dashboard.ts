import "server-only";
import { prisma, type TenantClient } from "@optic/database";
import { revenueTier, type OrderStatus } from "@optic/commerce";

/**
 * Dashboard metrics (§25). COD-aware: revenue is split into ordered/confirmed/shipped/
 * delivered tiers so an unconfirmed COD order is never counted as realised revenue.
 */

export interface DashboardData {
  today: { orders: number; revenueCents: number };
  toConfirm: number;
  shipped: number;
  failedDelivery: number;
  avgBasketCents: number;
  revenueTiers: { ordered: number; confirmed: number; shipped: number; delivered: number };
  topProducts: { name: string; sold: number }[];
  lowStock: { name: string; sku: string; stock: number }[];
  recentOrders: { id: string; number: string; name: string; totalCents: number; status: OrderStatus; createdAt: Date }[];
}

export async function getDashboard(db: TenantClient, websiteId: string): Promise<DashboardData> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todayOrders, allActiveOrders, byStatus, lowStockVariants, recent] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: startOfToday } } as never, select: { totalCents: true } }),
    db.order.findMany({ where: { status: { notIn: ["CANCELLED", "RETURNED"] } } as never, select: { totalCents: true, status: true } }),
    db.order.groupBy({ by: ["status"], _count: true } as never) as never as Promise<{ status: OrderStatus; _count: number }[]>,
    db.productVariant.findMany({ where: { isActive: true, stock: { lte: 3 } } as never, take: 8, orderBy: { stock: "asc" }, include: { product: { select: { name: true } } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" } as never, take: 8, select: { id: true, number: true, firstName: true, lastName: true, totalCents: true, status: true, createdAt: true } }),
  ]);

  const today = {
    orders: (todayOrders as { totalCents: number }[]).length,
    revenueCents: (todayOrders as { totalCents: number }[]).reduce((s, o) => s + o.totalCents, 0),
  };

  const tiers = { ordered: 0, confirmed: 0, shipped: 0, delivered: 0 };
  for (const o of allActiveOrders as { totalCents: number; status: OrderStatus }[]) {
    const tier = revenueTier(o.status);
    if (tier) tiers[tier] += o.totalCents;
  }

  const statusCounts = new Map((byStatus as unknown as { status: OrderStatus; _count: number }[]).map((s) => [s.status, s._count]));

  const activeOrders = allActiveOrders as { totalCents: number }[];
  const avgBasketCents = activeOrders.length ? Math.round(activeOrders.reduce((s, o) => s + o.totalCents, 0) / activeOrders.length) : 0;

  // Top products: aggregate order items belonging to this website's non-cancelled
  // orders. OrderItem is reached through the Order relation, so we filter on
  // `order.websiteId` explicitly (this read is scoped by that filter).
  const topGroups = await prisma.orderItem.groupBy({
    by: ["name"],
    where: { order: { websiteId, status: { notIn: ["CANCELLED", "RETURNED"] } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  return {
    today,
    toConfirm: statusCounts.get("NEW") ?? 0,
    shipped: statusCounts.get("SHIPPED") ?? 0,
    failedDelivery: statusCounts.get("FAILED_DELIVERY") ?? 0,
    avgBasketCents,
    revenueTiers: tiers,
    topProducts: topGroups.map((t) => ({ name: t.name, sold: t._sum.quantity ?? 0 })),
    lowStock: (lowStockVariants as never as { sku: string; stock: number; product: { name: string } }[]).map((v) => ({ name: v.product.name, sku: v.sku, stock: v.stock })),
    recentOrders: (recent as never as { id: string; number: string; firstName: string; lastName: string; totalCents: number; status: OrderStatus; createdAt: Date }[]).map((o) => ({
      id: o.id, number: o.number, name: `${o.firstName} ${o.lastName}`, totalCents: o.totalCents, status: o.status, createdAt: o.createdAt,
    })),
  };
}
