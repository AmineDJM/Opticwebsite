import { requirePermission } from "../../../server/session.js";
import { CouponsManager } from "../../../components/coupons-manager.js";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const ctx = await requirePermission("coupon:read");
  const coupons = await ctx.db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return <CouponsManager currency={ctx.currency} coupons={coupons as never as { id: string; code: string; type: string; value: number; minSubtotalCents: number; maxDiscountCents: number | null; usageLimit: number | null; usageCount: number; isActive: boolean }[]} />;
}
