import { requirePermission } from "../../../server/session.js";
import { BrandsManager } from "../../../components/brands-manager.js";

export const dynamic = "force-dynamic";

export default async function BrandsAdminPage() {
  const ctx = await requirePermission("brand:read");
  const brands = await ctx.db.brand.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <BrandsManager brands={(brands as never as { id: string; name: string; slug: string; description: string | null; story: string | null; isExclusive: boolean; isFeatured: boolean; isActive: boolean; _count: { products: number } }[]).map((b) => ({ id: b.id, name: b.name, slug: b.slug, description: b.description, story: b.story, isExclusive: b.isExclusive, isFeatured: b.isFeatured, isActive: b.isActive, productCount: b._count.products }))} />
  );
}
