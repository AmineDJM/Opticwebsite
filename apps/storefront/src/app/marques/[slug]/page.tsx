import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseFilters } from "@optic/catalog";
import { getBrandBySlug, listProducts } from "@optic/database";
import { Container, buttonVariants } from "@optic/ui";
import { getTenant } from "../../../server/tenant.js";
import { ProductRow } from "../../../components/block-renderer.js";
import { Pagination } from "../../../components/pagination.js";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const brand = await getBrandBySlug(tenant.db, slug);
  return { title: brand ? (brand as { name: string }).name : "Marque" };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tenant = await getTenant();
  const brand = await getBrandBySlug(tenant.db, slug);
  if (!brand) notFound();
  const b = brand as never as { name: string; slug: string; description: string | null; story: string | null; isExclusive: boolean; cover: { url: string } | null; logo: { url: string } | null };

  const filters = parseFilters({ ...sp, brand: slug });
  const page = await listProducts(tenant.db, filters);

  return (
    <>
      {/* Brand hero (storytelling for exclusive brands like Momus, §24) */}
      <section className="relative overflow-hidden bg-secondary text-white">
        {b.cover?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.cover.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <Container>
          <div className="relative max-w-xl py-16">
            {b.isExclusive && <span className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">Marque exclusive</span>}
            <h1 className="font-heading text-4xl font-bold md:text-5xl">{b.name}</h1>
            {(b.story || b.description) && <p className="mt-4 text-lg opacity-90">{b.story ?? b.description}</p>}
          </div>
        </Container>
      </section>

      <Container>
        <div className="py-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-semibold">Les modèles {b.name}</h2>
            <Link href={`/boutique?brand=${slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Voir tout</Link>
          </div>
          {page.items.length > 0 ? (
            <>
              <ProductRow products={page.items} tenant={tenant} />
              <Pagination page={page.page} pageCount={page.pageCount} />
            </>
          ) : (
            <p className="text-muted-foreground">Aucun produit pour cette marque pour le moment.</p>
          )}
        </div>
      </Container>
    </>
  );
}
