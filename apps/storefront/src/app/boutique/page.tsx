import type { Metadata } from "next";
import { Suspense } from "react";
import { parseFilters, countActiveFilters } from "@optic/catalog";
import { listProducts, listCategoryTree, listBrands } from "@optic/database";
import { Container, EmptyState, ProductGridSkeleton } from "@optic/ui";
import { getTenant } from "../../server/tenant.js";
import { ProductRow } from "../../components/block-renderer.js";
import { CatalogFilters } from "../../components/catalog-filters.js";
import { CatalogToolbar } from "../../components/catalog-toolbar.js";
import { Pagination } from "../../components/pagination.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Boutique" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <Container>
      <div className="py-8">
        <h1 className="mb-6 font-heading text-3xl font-semibold">Boutique</h1>
        <Suspense fallback={<ProductGridSkeleton />}>
          <CatalogResults params={params} />
        </Suspense>
      </div>
    </Container>
  );
}

async function CatalogResults({ params }: { params: SearchParams }) {
  const tenant = await getTenant();
  const filters = parseFilters(params);
  const [page, categories, brands] = await Promise.all([
    listProducts(tenant.db, filters),
    listCategoryTree(tenant.db),
    listBrands(tenant.db),
  ]);

  const facetOptions = {
    categories: categories.map((c) => ({ slug: (c as { slug: string }).slug, name: (c as { name: string }).name, parentId: (c as { parentId: string | null }).parentId })),
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
          <EmptyState
            title="Aucun produit ne correspond"
            description="Essayez d'élargir ou de réinitialiser vos filtres."
          />
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
