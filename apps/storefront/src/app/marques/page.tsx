import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@optic/ui";
import { listBrands } from "@optic/database";
import { getTenant } from "../../server/tenant.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marques" };

export default async function BrandsPage() {
  const tenant = await getTenant();
  const brands = await listBrands(tenant.db);
  return (
    <Container>
      <div className="py-8">
        <h1 className="mb-6 font-heading text-3xl font-semibold">Nos marques</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((b) => {
            const brand = b as never as { slug: string; name: string; description: string | null; isExclusive: boolean; logo: { url: string } | null };
            return (
              <Link key={brand.slug} href={`/marques/${brand.slug}`} className="flex flex-col items-center gap-3 rounded border border-border bg-surface p-6 text-center transition-shadow hover:shadow-md">
                {brand.logo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo.url} alt={brand.name} className="h-10 w-auto" />
                ) : (
                  <span className="font-heading text-xl font-semibold">{brand.name}</span>
                )}
                {brand.isExclusive && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Exclusivité</span>}
                {brand.description && <p className="text-sm text-muted-foreground">{brand.description}</p>}
              </Link>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
