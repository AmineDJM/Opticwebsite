import { requirePermission } from "../../../../server/session.js";
import { ProductForm } from "../../../../components/product-form.js";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const ctx = await requirePermission("product:write");
  const [brands, categories] = await Promise.all([
    ctx.db.brand.findMany({ where: { isActive: true } as never, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ctx.db.category.findMany({ where: { isActive: true } as never, orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold">Nouveau produit</h1>
      <ProductForm
        currency={ctx.currency}
        brands={brands as { id: string; name: string }[]}
        categories={categories as { id: string; name: string; parentId: string | null }[]}
      />
    </div>
  );
}
