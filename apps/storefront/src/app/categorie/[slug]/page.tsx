import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseFilters, countActiveFilters } from "@optic/catalog";
import { listProducts, listCategoryTree, listBrands, getCategoryBySlug } from "@optic/database";
import { Container, EmptyState, ProductGridSkeleton } from "@optic/ui";
import { getTenant } from "../../../server/tenant.js";
import { ProductRow } from "../../../components/block-renderer.js";
import { CatalogFilters } from "../../../components/catalog-filters.js";
import { CatalogToolbar } from "../../../components/catalog-toolbar.js";
import { Pagination } from "../../../components/pagination.js";
import { Breadcrumbs } from "../../../components/breadcrumbs.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const category = await getCategoryBySlug(tenant.db, slug);
  if (!category) return { title: "Catégorie" };
  const c = category as { name: string; seo?: { title?: string; description?: string } | null };
  return { title: c.seo?.title ?? c.name, description: c.seo?.description ?? undefined };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tenant = await getTenant();
  const category = await getCategoryBySlug(tenant.db, slug);
  if (!category) notFound();
  const c = category as { name: string; description: string | null };

  return (
    <Container>
      <div className="py-8">
        <Breadcrumbs items={[{ label: "Accueil", href: "/" }, { label: "Boutique", href: "/boutique" }, { label: c.name }]} />
        <h1 className="mb-1 mt-3 font-heading text-3xl font-semibold">{c.name}</h1>
        {c.description && <p className="mb-6 max-w-2xl text-muted-foreground">{c.description}</p>}
        <Suspense fallback={<ProductGridSkeleton />}>
          <CategoryResults slug={slug} params={sp} />
        </Suspense>
      </div>
    </Container>
  );
}

async function CategoryResults({ slug, params }: { slug: string; params: Record<string, string | string[] | undefined> }) {
  const tenant = await getTenant();
  const filters = parseFilters(params, { categorySlug: slug });
  const [page, categories, brands] = await Promise.all([
    listProducts(tenant.db, filters),
    listCategoryTree(tenant.db),
    listBrands(tenant.db),
  ]);
  const facetOptions = {
    categories: categories.map((cat) => ({ slug: (cat as { slug: string }).slug, name: (cat as { name: string }).name, parentId: (cat as { parentId: string | null }).parentId })),
    brands: brands.map((b) => ({ slug: (b as { slug: string }).slug, name: (b as { name: string }).name })),
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <CatalogFilters facets={facetOptions} activeCount={countActiveFilters(filters)} />
      </aside>
      <div>
        <CatalogToolbar total={page.total} sort={filters.sort} facets={facetOptions} activeCount={countActiveFilters(filters)} />
        {page.items.length === 0 ? (
          <EmptyState title="Aucun produit" description="Cette catégorie est vide ou vos filtres sont trop restrictifs." />
        ) : (
          <>
            <ProductRow products={page.items} tenant={tenant} />
            <Pagination page={page.page} pageCount={page.pageCount} />
          </>
        )}
      </div>
    </div>
  );
}
