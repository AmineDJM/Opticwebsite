import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, listFeaturedProducts } from "@optic/database";
import { Container, PriceDisplay, Badge } from "@optic/ui";

import { getTenant } from "../../../server/tenant.js";
import { Breadcrumbs } from "../../../components/breadcrumbs.js";
import { ProductPurchase } from "../../../components/product-purchase.js";
import { ProductGallery } from "../../../components/product-gallery.js";
import { ProductRow } from "../../../components/block-renderer.js";
import { RecentlyViewedTracker } from "../../../components/recently-viewed.js";
import { Truck, RefreshCcw, Wallet, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const product = await getProductBySlug(tenant.db, slug);
  if (!product) return { title: "Produit" };
  const p = product as { name: string; shortDescription: string | null; images: { media: { url: string } }[] };
  return {
    title: p.name,
    description: p.shortDescription ?? undefined,
    openGraph: { title: p.name, images: p.images[0]?.media.url ? [p.images[0].media.url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenant();
  const product = await getProductBySlug(tenant.db, slug);
  if (!product) notFound();

  const p = product as never as {
    id: string;
    name: string;
    slug: string;
    sku: string;
    reference: string | null;
    shortDescription: string | null;
    description: string | null;
    priceCents: number;
    comparePriceCents: number | null;
    frameShape: string | null;
    frameMaterial: string | null;
    frameType: string | null;
    lensWidthMm: number | null;
    bridgeWidthMm: number | null;
    templeLengthMm: number | null;
    lensHeightMm: number | null;
    weightGrams: number | null;
    lensCompatibility: string[];
    brand: { name: string; slug: string } | null;
    categories: { category: { name: string; slug: string } }[];
    images: { media: { url: string; alt: string | null } }[];
    variants: { id: string; name: string; colorName: string | null; colorHex: string | null; size: string | null; priceCents: number | null; stock: number; reserved: number }[];
  };

  const related = await listFeaturedProducts(tenant.db, "featured", 8);
  const relatedFiltered = related.filter((r) => r.id !== p.id).slice(0, 4);
  const primaryCategory = p.categories[0]?.category;

  const specs: { label: string; value: string }[] = [
    p.frameShape ? { label: "Forme", value: p.frameShape } : null,
    p.frameMaterial ? { label: "Matière", value: p.frameMaterial } : null,
    p.frameType ? { label: "Type", value: p.frameType } : null,
    p.lensWidthMm ? { label: "Largeur verre", value: `${p.lensWidthMm} mm` } : null,
    p.bridgeWidthMm ? { label: "Pont", value: `${p.bridgeWidthMm} mm` } : null,
    p.templeLengthMm ? { label: "Branche", value: `${p.templeLengthMm} mm` } : null,
    p.weightGrams ? { label: "Poids", value: `${p.weightGrams} g` } : null,
    p.reference ? { label: "Référence", value: p.reference } : { label: "SKU", value: p.sku },
  ].filter(Boolean) as { label: string; value: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => i.media.url),
    description: p.shortDescription ?? p.description ?? undefined,
    sku: p.sku,
    brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: tenant.currency,
      price: (p.priceCents / 100).toFixed(2),
      availability: p.variants.some((v) => v.stock - v.reserved > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecentlyViewedTracker productId={p.id} />
      <div className="py-6">
        <Breadcrumbs
          items={[
            { label: "Accueil", href: "/" },
            ...(primaryCategory ? [{ label: primaryCategory.name, href: `/categorie/${primaryCategory.slug}` }] : []),
            { label: p.name },
          ]}
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <ProductGallery images={p.images.map((i) => ({ url: i.media.url, alt: i.media.alt ?? p.name }))} />

          <div>
            {p.brand && (
              <Link href={`/marques/${p.brand.slug}`} className="text-sm font-medium uppercase tracking-wide text-muted-foreground hover:text-primary">
                {p.brand.name}
              </Link>
            )}
            <h1 className="mt-1 font-heading text-3xl font-semibold">{p.name}</h1>
            {p.shortDescription && <p className="mt-2 text-muted-foreground">{p.shortDescription}</p>}

            <div className="mt-4">
              <PriceDisplay priceCents={p.priceCents} comparePriceCents={p.comparePriceCents} currency={tenant.currency} size="lg" />
            </div>

            <ProductPurchase
              productId={p.id}
              productName={p.name}
              productSlug={p.slug}
              currency={tenant.currency}
              basePriceCents={p.priceCents}
              variants={p.variants.map((v) => ({
                id: v.id,
                name: v.name,
                colorName: v.colorName,
                colorHex: v.colorHex,
                size: v.size,
                priceCents: v.priceCents,
                available: v.stock - v.reserved,
              }))}
              features={{ virtualTryOn: tenant.features.virtualTryOn, favorites: tenant.features.favorites }}
              tryOnAssetUrl={p.images[0]?.media.url ?? null}
            />

            <ul className="mt-6 space-y-2 border-t border-border pt-6 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground"><Wallet size={16} className="text-primary" /> Paiement à la livraison</li>
              <li className="flex items-center gap-2 text-muted-foreground"><Truck size={16} className="text-primary" /> Livraison dans les 58 wilayas</li>
              <li className="flex items-center gap-2 text-muted-foreground"><RefreshCcw size={16} className="text-primary" /> Échange sous 14 jours</li>
              {tenant.features.visagism && (
                <li className="flex items-center gap-2 text-muted-foreground"><Eye size={16} className="text-primary" /> <Link href="/visagisme" className="hover:text-primary">Trouver ma monture idéale (visagisme)</Link></li>
              )}
            </ul>

            {specs.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-heading text-lg font-semibold">Caractéristiques</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {specs.map((s) => (
                    <div key={s.label} className="flex justify-between border-b border-border py-1.5">
                      <dt className="text-muted-foreground">{s.label}</dt>
                      <dd className="font-medium capitalize">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {p.lensCompatibility.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 font-heading text-lg font-semibold">Verres compatibles</h2>
                <div className="flex flex-wrap gap-2">
                  {p.lensCompatibility.map((l) => (
                    <Badge key={l} variant="outline">{lensLabel(l)}</Badge>
                  ))}
                </div>
              </div>
            )}

            {p.description && (
              <div className="mt-8">
                <h2 className="mb-2 font-heading text-lg font-semibold">Description</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              </div>
            )}
          </div>
        </div>

        {tenant.features.relatedProducts && relatedFiltered.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 font-heading text-2xl font-semibold">Produits similaires</h2>
            <ProductRow products={relatedFiltered} tenant={tenant} />
          </section>
        )}
      </div>
    </Container>
  );
}

function lensLabel(key: string): string {
  const labels: Record<string, string> = {
    single_vision: "Unifocal", progressive: "Progressif", bifocal: "Bifocal", sun_corrective: "Solaire correcteur",
    photochromic: "Photochromique", blue_light: "Anti lumière bleue", reading: "Lecture", non_prescription: "Sans correction",
  };
  return labels[key] ?? key;
}
