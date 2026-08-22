import Link from "next/link";
import {
  HeroBlock,
  CtaBlock,
  AdvantagesBlock,
  TestimonialsBlock,
  FaqBlock,
  SectionHeading,
  buttonVariants,
  Container,
  ProductCard,
} from "@optic/ui";
import { Truck, Wallet, Eye, ShieldCheck } from "lucide-react";
import type { WebsiteContext } from "@optic/database";
import {
  listFeaturedProducts,
  getProductsBySlugs,
  listCategoryTree,
  listBrands,
  type ProductListItem,
} from "@optic/database";
import { LinkAdapter, ImageAdapter } from "./next-adapters.js";
import { NewsletterForm } from "./newsletter-form.js";
import { ProductCardActions } from "./product-card-actions.js";

/**
 * BlockRenderer — the storefront half of the page builder (§5). Switches on block type,
 * resolves the data each block needs from tenant-scoped repositories, and renders the
 * presentational @optic/ui section. Adding a block = a case here + a UI section.
 */
export async function BlockRenderer({
  block,
  tenant,
}: {
  block: { id: string; type: string; props: Record<string, unknown> };
  tenant: WebsiteContext;
}) {
  const p = block.props;
  switch (block.type) {
    case "hero":
      return (
        <HeroBlock
          heading={String(p.heading ?? "")}
          subheading={p.subheading as string | undefined}
          eyebrow={p.eyebrow as string | undefined}
          imageUrl={imageUrl(p.image)}
          align={(p.align as "left" | "center") ?? "left"}
          overlay={typeof p.overlay === "number" ? p.overlay : 0.3}
          height={(p.height as "md" | "lg" | "full") ?? "lg"}
          primaryCta={cta(p.primaryCta, "primary")}
          secondaryCta={cta(p.secondaryCta, "outline-light")}
        />
      );

    case "banner":
      return (
        <CtaBlock
          heading={String(p.heading ?? "")}
          text={p.text as string | undefined}
          imageUrl={imageUrl(p.image)}
          cta={cta(p.cta, "primary")}
          variant={(p.background as "surface" | "primary" | "accent" | "muted") ?? "surface"}
        />
      );

    case "brandHighlight": {
      const brand = await tenant.db.brand.findFirst({ where: { slug: String(p.brandSlug), isActive: true } as never, include: { cover: true, logo: true } });
      if (!brand) return null;
      const b = brand as never as { name: string; slug: string; story: string | null; cover: { url: string } | null };
      return (
        <CtaBlock
          heading={String(p.heading ?? b.name)}
          text={(p.text as string) ?? b.story ?? undefined}
          imageUrl={imageUrl(p.image) ?? b.cover?.url}
          cta={cta(p.cta, "primary") ?? <Link className={buttonVariants()} href={`/marques/${b.slug}`}>Découvrir</Link>}
          variant="primary"
        />
      );
    }

    case "featuredCategories": {
      const categories = await listCategoryTree(tenant.db);
      const slugs = (p.categorySlugs as string[]) ?? [];
      const selected = (slugs.length
        ? slugs.map((s) => categories.find((c) => (c as { slug: string }).slug === s)).filter(Boolean)
        : categories.filter((c) => !(c as { parentId: string | null }).parentId)) as never as {
        slug: string;
        name: string;
        image: { url: string } | null;
      }[];
      return (
        <Container>
          <div className="py-12">
            <SectionHeading title={String(p.heading ?? "Catégories")} align="center" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {selected.map((c) => (
                <Link key={c.slug} href={`/categorie/${c.slug}`} className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded bg-surface p-4 text-center transition-shadow hover:shadow-md">
                  {c.image?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 transition-transform group-hover:scale-105" />
                  )}
                  <span className="relative font-heading text-lg font-semibold text-foreground">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      );
    }

    case "featuredProducts":
    case "newArrivals":
    case "bestSellers":
    case "promotions": {
      const heading = String(p.heading ?? "Sélection");
      const limit = typeof p.limit === "number" ? p.limit : 8;
      let products: ProductListItem[] = [];
      if (block.type === "newArrivals") products = await listFeaturedProducts(tenant.db, "new", limit);
      else if (block.type === "bestSellers") products = await listFeaturedProducts(tenant.db, "bestsellers", limit);
      else if (block.type === "promotions") {
        products = (await listFeaturedProducts(tenant.db, "featured", 24)).filter((x) => x.comparePriceCents != null).slice(0, limit);
      } else {
        const source = (p.source as "manual" | "featured" | "bestsellers" | "new") ?? "featured";
        if (source === "manual") products = await getProductsBySlugs(tenant.db, (p.productSlugs as string[]) ?? []);
        else products = await listFeaturedProducts(tenant.db, source === "featured" ? "featured" : source, limit);
      }
      if (products.length === 0) return null;
      return (
        <Container>
          <div className="py-12">
            <SectionHeading
              title={heading}
              action={<Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/boutique">Tout voir</Link>}
            />
            <ProductRow products={products} tenant={tenant} />
          </div>
        </Container>
      );
    }

    case "brands": {
      const brands = await listBrands(tenant.db);
      const slugs = (p.brandSlugs as string[]) ?? [];
      const selected = (slugs.length ? slugs.map((s) => brands.find((b) => (b as { slug: string }).slug === s)).filter(Boolean) : brands) as never as { slug: string; name: string; logo: { url: string } | null }[];
      return (
        <Container>
          <div className="py-10">
            <SectionHeading title={String(p.heading ?? "Marques")} align="center" />
            <div className="flex flex-wrap items-center justify-center gap-8">
              {selected.map((b) => (
                <Link key={b.slug} href={`/marques/${b.slug}`} className="opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
                  {b.logo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo.url} alt={b.name} className="h-8 w-auto" />
                  ) : (
                    <span className="font-heading text-lg">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      );
    }

    case "visagismCta":
      if (!tenant.features.visagism) return null;
      return (
        <CtaBlock
          heading={String(p.heading ?? "Visagisme")}
          text={p.text as string | undefined}
          imageUrl={imageUrl(p.image)}
          variant="accent"
          cta={<Link className={buttonVariants()} href={ctaHref(p.cta, "/visagisme")}>Lancer le visagisme</Link>}
        />
      );

    case "virtualTryOnCta":
      if (!tenant.features.virtualTryOn) return null;
      return (
        <CtaBlock heading={String(p.heading ?? "Essayage virtuel")} text={p.text as string | undefined} imageUrl={imageUrl(p.image)} variant="surface"
          cta={<Link className={buttonVariants()} href={ctaHref(p.cta, "/boutique")}>Essayer une monture</Link>} />
      );

    case "quizCta":
      if (!tenant.features.lensQuiz) return null;
      return (
        <CtaBlock heading={String(p.heading ?? "Quiz Verres")} text={p.text as string | undefined} imageUrl={imageUrl(p.image)} variant="primary"
          cta={<Link className={buttonVariants()} href={ctaHref(p.cta, "/quiz")}>Faire le quiz</Link>} />
      );

    case "advantages":
      return (
        <AdvantagesBlock
          heading={p.heading as string | undefined}
          items={((p.items as { icon?: string; title: string; text?: string }[]) ?? []).map((it) => ({
            icon: advantageIcon(it.icon),
            title: it.title,
            text: it.text,
          }))}
        />
      );

    case "testimonials":
      return <TestimonialsBlock heading={String(p.heading ?? "")} items={(p.items as { author: string; quote: string; rating?: number }[]) ?? []} />;

    case "faq":
      return <FaqBlock heading={String(p.heading ?? "FAQ")} items={(p.items as { q: string; a: string }[]) ?? []} />;

    case "newsletter":
      if (!tenant.features.newsletter) return null;
      return (
        <Container>
          <div className="my-12 rounded bg-muted px-6 py-12 text-center">
            <SectionHeading title={String(p.heading ?? "Newsletter")} align="center" subtitle={p.text as string | undefined} />
            <div className="mx-auto max-w-md">
              <NewsletterInline />
            </div>
          </div>
        </Container>
      );

    case "richText":
      return (
        <Container>
          <div className="prose prose-neutral mx-auto max-w-3xl py-12" dangerouslySetInnerHTML={{ __html: String(p.html ?? "") }} />
        </Container>
      );

    default:
      return null;
  }
}

export function ProductRow({ products, tenant }: { products: ProductListItem[]; tenant: WebsiteContext }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          href={`/produit/${product.slug}`}
          currency={tenant.currency}
          product={product}
          LinkComponent={LinkAdapter}
          ImageComponent={ImageAdapter}
          actionSlot={tenant.features.favorites ? <ProductCardActions productId={product.id} /> : undefined}
        />
      ))}
    </div>
  );
}

// --- helpers ---
function imageUrl(image: unknown): string | undefined {
  if (image && typeof image === "object") {
    const i = image as { url?: string };
    return i.url;
  }
  return undefined;
}

function ctaHref(cta: unknown, fallback: string): string {
  if (cta && typeof cta === "object" && "href" in cta) return String((cta as { href: string }).href) || fallback;
  return fallback;
}

function cta(data: unknown, variant: "primary" | "outline-light"): React.ReactNode {
  if (!data || typeof data !== "object") return undefined;
  const c = data as { label?: string; href?: string };
  if (!c.label || !c.href) return undefined;
  const cls =
    variant === "primary"
      ? "inline-flex h-11 items-center rounded bg-primary px-6 font-medium text-primary-foreground hover:opacity-90"
      : "inline-flex h-11 items-center rounded border border-white/70 px-6 font-medium text-white hover:bg-white/10";
  return (
    <Link href={c.href} className={cls}>
      {c.label}
    </Link>
  );
}

function advantageIcon(key?: string) {
  const size = 28;
  switch (key) {
    case "truck": return <Truck size={size} />;
    case "cash": return <Wallet size={size} />;
    case "eye": return <Eye size={size} />;
    case "shield": return <ShieldCheck size={size} />;
    default: return null;
  }
}

function NewsletterInline() {
  return <NewsletterForm subscribeLabel="S'inscrire" />;
}
