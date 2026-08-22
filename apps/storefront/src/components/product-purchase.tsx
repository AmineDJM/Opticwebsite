"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Minus, Plus, ShoppingBag, Check, Camera } from "lucide-react";
import { Button, PriceDisplay, cn } from "@optic/ui";
import { addToCartAction } from "../server/actions/cart.js";

const TryOnModal = dynamic(() => import("./try-on-modal.js").then((m) => m.TryOnModal), { ssr: false });

/**
 * Purchase panel (§9): variant (colour/size) selection, quantity, add-to-cart with
 * immediate feedback (§47), out-of-stock handling (§48), and the virtual try-on entry.
 */
interface VariantVM {
  id: string;
  name: string;
  colorName: string | null;
  colorHex: string | null;
  size: string | null;
  priceCents: number | null;
  available: number;
}

export function ProductPurchase({
  productId,
  productName,
  currency,
  basePriceCents,
  variants,
  features,
  tryOnAssetUrl,
}: {
  productId: string;
  productName: string;
  productSlug: string;
  currency: string;
  basePriceCents: number;
  variants: VariantVM[];
  features: { virtualTryOn: boolean; favorites: boolean };
  tryOnAssetUrl: string | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const hasVariants = variants.length > 0;
  const available = selected ? selected.available : Number.MAX_SAFE_INTEGER;
  const unitPrice = selected?.priceCents ?? basePriceCents;
  const outOfStock = hasVariants && available <= 0;

  // Distinct colours and sizes for a two-axis selector.
  const colors = dedupe(variants.filter((v) => v.colorName).map((v) => ({ name: v.colorName!, hex: v.colorHex })));
  const sizes = dedupe(variants.filter((v) => v.size).map((v) => ({ name: v.size!, hex: null })));

  function addToCart(buyNow: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction({ productId, variantId: selectedId, quantity });
      if (result.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        if (buyNow) router.push("/panier");
        else router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-6 space-y-5">
      {colors.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium">Couleur : <span className="text-muted-foreground">{selected?.colorName}</span></p>
          <div className="flex flex-wrap gap-2">
            {variants.filter((v) => v.colorName).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                title={v.colorName ?? ""}
                aria-label={v.colorName ?? ""}
                aria-pressed={selectedId === v.id}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition",
                  selectedId === v.id ? "border-primary ring-2 ring-primary/30" : "border-border",
                )}
                style={{ backgroundColor: v.colorHex ?? "#ccc" }}
              />
            ))}
          </div>
        </div>
      )}

      {sizes.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium">Taille</p>
          <div className="flex flex-wrap gap-2">
            {variants.filter((v) => v.size).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                aria-pressed={selectedId === v.id}
                className={cn(
                  "min-w-11 rounded border px-3 py-2 text-sm",
                  selectedId === v.id ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {v.size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        {outOfStock ? (
          <span className="font-medium text-error">Rupture de stock</span>
        ) : available <= 3 && hasVariants ? (
          <span className="font-medium text-warning">Plus que {available} en stock</span>
        ) : (
          <span className="flex items-center gap-1 font-medium text-success"><Check size={16} /> En stock</span>
        )}
      </div>

      {/* Quantity + add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded border border-border">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center" aria-label="Diminuer"><Minus size={16} /></button>
          <span className="w-10 text-center text-sm font-medium" aria-live="polite">{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(available, 99, q + 1))} className="flex h-11 w-11 items-center justify-center" aria-label="Augmenter"><Plus size={16} /></button>
        </div>
        <div className="ml-auto text-right">
          <PriceDisplay priceCents={unitPrice * quantity} currency={currency} size="md" showDiscount={false} />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button block size="lg" onClick={() => addToCart(false)} loading={pending} disabled={outOfStock}>
          {added ? <><Check size={18} /> Ajouté</> : <><ShoppingBag size={18} /> Ajouter au panier</>}
        </Button>
        <Button block size="lg" variant="secondary" onClick={() => addToCart(true)} disabled={outOfStock || pending}>
          Commander
        </Button>
      </div>

      {features.virtualTryOn && tryOnAssetUrl && (
        <Button block variant="outline" onClick={() => setTryOnOpen(true)}>
          <Camera size={18} /> Essayer cette monture
        </Button>
      )}

      {error && <p className="text-sm text-error" role="alert">{error}</p>}

      {tryOnOpen && tryOnAssetUrl && (
        <TryOnModal productName={productName} assetUrl={tryOnAssetUrl} onClose={() => setTryOnOpen(false)} />
      )}
    </div>
  );
}

function dedupe(items: { name: string; hex: string | null }[]): { name: string; hex: string | null }[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true)));
}
