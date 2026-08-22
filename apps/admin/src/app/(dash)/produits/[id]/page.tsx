import { notFound } from "next/navigation";
import { requirePermission } from "../../../../server/session.js";
import { ProductForm } from "../../../../components/product-form.js";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("product:read");
  const [product, brands, categories] = await Promise.all([
    ctx.db.product.findFirst({ where: { id } as never, include: { variants: { orderBy: { position: "asc" } }, categories: true } }),
    ctx.db.brand.findMany({ where: { isActive: true } as never, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ctx.db.category.findMany({ where: { isActive: true } as never, orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
  ]);
  if (!product) notFound();
  const p = product as never as {
    id: string; name: string; sku: string; slug: string; brandId: string | null; shortDescription: string | null; description: string | null;
    status: string; gender: string; ageGroup: string; priceCents: number; comparePriceCents: number | null;
    frameShape: string | null; frameMaterial: string | null; frameType: string | null; isNew: boolean; isBestseller: boolean; isFeatured: boolean;
    recommendedFaceShapes: string[]; categories: { categoryId: string }[];
    variants: { id: string; sku: string; name: string; colorName: string | null; colorHex: string | null; size: string | null; priceCents: number | null; stock: number }[];
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold">Modifier — {p.name}</h1>
      <ProductForm
        currency={ctx.currency}
        brands={brands as { id: string; name: string }[]}
        categories={categories as { id: string; name: string; parentId: string | null }[]}
        product={{
          id: p.id, name: p.name, sku: p.sku, slug: p.slug, brandId: p.brandId ?? "",
          shortDescription: p.shortDescription ?? "", description: p.description ?? "",
          status: p.status, gender: p.gender, ageGroup: p.ageGroup, priceCents: p.priceCents, comparePriceCents: p.comparePriceCents,
          frameShape: p.frameShape ?? "", frameMaterial: p.frameMaterial ?? "", frameType: p.frameType ?? "",
          isNew: p.isNew, isBestseller: p.isBestseller, isFeatured: p.isFeatured,
          recommendedFaceShapes: p.recommendedFaceShapes,
          categoryIds: p.categories.map((c) => c.categoryId),
          variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, name: v.name, colorName: v.colorName ?? "", colorHex: v.colorHex ?? "", size: v.size ?? "", priceCents: v.priceCents, stock: v.stock })),
        }}
      />
    </div>
  );
}
