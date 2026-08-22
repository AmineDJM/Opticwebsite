import { requirePermission } from "../../../server/session.js";
import { CategoriesManager } from "../../../components/categories-manager.js";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const ctx = await requirePermission("category:read");
  const cats = await ctx.db.category.findMany({ orderBy: [{ position: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <CategoriesManager
      categories={(cats as never as { id: string; name: string; slug: string; parentId: string | null; kind: string; isActive: boolean; position: number; _count: { products: number } }[]).map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId, kind: c.kind, isActive: c.isActive, position: c.position, productCount: c._count.products }))}
    />
  );
}
