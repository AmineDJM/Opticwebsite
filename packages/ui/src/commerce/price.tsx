import { formatMoney } from "@optic/core";
import { cn } from "../lib/cn.js";

/**
 * PriceDisplay — the single source of truth for how a price renders. Shows the
 * compare-at price struck through and a discount badge when on sale. Always visible
 * (§47: always show the price clearly).
 */
export function PriceDisplay({
  priceCents,
  comparePriceCents,
  currency,
  locale,
  size = "md",
  className,
  showDiscount = true,
}: {
  priceCents: number;
  comparePriceCents?: number | null;
  currency: string;
  locale?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showDiscount?: boolean;
}) {
  const onSale = comparePriceCents != null && comparePriceCents > priceCents;
  const discountPct = onSale
    ? Math.round(((comparePriceCents! - priceCents) / comparePriceCents!) * 100)
    : 0;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  }[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-semibold text-foreground", sizeClasses)}>
        {formatMoney(priceCents, currency, locale)}
      </span>
      {onSale && (
        <>
          <span className={cn("text-muted-foreground line-through", size === "lg" ? "text-base" : "text-xs")}>
            {formatMoney(comparePriceCents!, currency, locale)}
          </span>
          {showDiscount && (
            <span className="rounded-full bg-error/15 px-1.5 py-0.5 text-xs font-medium text-error">
              -{discountPct}%
            </span>
          )}
        </>
      )}
    </div>
  );
}
