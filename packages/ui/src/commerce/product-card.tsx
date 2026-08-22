import { type ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Badge } from "../primitives/misc.js";
import { PriceDisplay } from "./price.js";
import type { ProductCardModel } from "./types.js";

/**
 * ProductCard — the catalogue's atom. Presentational: the app passes a `LinkComponent`
 * (Next's <Link>) and an optional favorite/try-on slot so this stays framework-free.
 * Image hover swaps to a secondary view when available. Stock and price always shown.
 */
export interface ProductCardProps {
  product: ProductCardModel;
  currency: string;
  locale?: string;
  href: string;
  /** Next.js Link (or any component with href). Falls back to <a>. */
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: ReactNode }>;
  ImageComponent?: React.ComponentType<{
    src: string;
    alt: string;
    className?: string;
    fill?: boolean;
    sizes?: string;
  }>;
  actionSlot?: ReactNode;
  labels?: { new: string; bestseller: string; outOfStock: string };
  className?: string;
}

export function ProductCard({
  product,
  currency,
  locale,
  href,
  LinkComponent,
  ImageComponent,
  actionSlot,
  labels = { new: "Nouveau", bestseller: "Best-seller", outOfStock: "Rupture" },
  className,
}: ProductCardProps) {
  const Link = LinkComponent ?? (({ href, className, children }) => <a href={href} className={className}>{children}</a>);
  const outOfStock = product.inStock === false;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded bg-surface transition-shadow hover:shadow-md",
        className,
      )}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          <ProductImage
            product={product}
            ImageComponent={ImageComponent}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground" aria-hidden="true">
            <GlassesIcon />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isNew && <Badge variant="primary">{labels.new}</Badge>}
          {product.isBestseller && <Badge variant="accent">{labels.bestseller}</Badge>}
          {product.matchPercent != null && (
            <Badge variant="success">{product.matchPercent}%</Badge>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="rounded bg-foreground/80 px-3 py-1 text-xs font-medium text-background">
              {labels.outOfStock}
            </span>
          </div>
        )}

        {actionSlot && (
          <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {actionSlot}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brandName && (
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{product.brandName}</span>
        )}
        <Link href={href} className="line-clamp-2 font-medium text-foreground hover:text-primary">
          {product.name}
        </Link>
        {product.matchReason && (
          <p className="line-clamp-1 text-xs text-success">{product.matchReason}</p>
        )}
        <div className="mt-auto pt-2">
          <PriceDisplay
            priceCents={product.priceCents}
            comparePriceCents={product.comparePriceCents}
            currency={currency}
            locale={locale}
            size="sm"
          />
        </div>
        {product.colors && product.colors.length > 0 && (
          <div className="mt-1 flex items-center gap-1" aria-label="Couleurs disponibles">
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="h-3.5 w-3.5 rounded-full border border-border"
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-xs text-muted-foreground">+{product.colors.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ProductImage({
  product,
  ImageComponent,
}: {
  product: ProductCardModel;
  ImageComponent?: ProductCardProps["ImageComponent"];
}) {
  const primary = product.imageUrl!;
  const secondary = product.secondaryImageUrl;
  if (ImageComponent) {
    return (
      <>
        <ImageComponent
          src={primary}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            "object-cover transition-opacity duration-300",
            secondary && "group-hover:opacity-0",
          )}
        />
        {secondary && (
          <ImageComponent
            src={secondary}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </>
    );
  }
  // Fallback plain img.
  return (
    <img src={primary} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
  );
}

function GlassesIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="6" cy="14" r="3.5" />
      <circle cx="18" cy="14" r="3.5" />
      <path d="M9.5 13.5c1-1 4-1 5 0M2.5 12l1.5-2M21.5 12L20 10" />
    </svg>
  );
}
