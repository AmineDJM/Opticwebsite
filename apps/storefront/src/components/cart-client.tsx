"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus, Tag, X } from "lucide-react";
import { Button, Input, PriceDisplay, cn } from "@optic/ui";
import { formatMoney } from "@optic/core";
import {
  updateCartItemAction,
  removeCartItemAction,
  applyCouponAction,
  removeCouponAction,
} from "../server/actions/cart.js";

interface CartLine {
  id: string;
  slug: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  inStock: boolean;
  availableStock: number;
  colorHex: string | null;
}

export function CartClient({
  lines,
  currency,
  couponCode,
  totals,
  features,
  freeShippingThresholdCents,
}: {
  lines: CartLine[];
  currency: string;
  couponCode: string | null;
  totals: { subtotalCents: number; discountCents: number; totalCents: number };
  features: { coupons: boolean };
  freeShippingThresholdCents: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  function update(itemId: string, quantity: number) {
    startTransition(async () => { await updateCartItemAction(itemId, quantity); });
  }
  function remove(itemId: string) {
    startTransition(async () => { await removeCartItemAction(itemId); });
  }
  function applyCoupon() {
    setCouponError(null);
    startTransition(async () => {
      const result = await applyCouponAction(coupon);
      if (!result.ok) setCouponError(result.error);
      else setCoupon("");
    });
  }

  const remaining = freeShippingThresholdCents ? freeShippingThresholdCents - totals.subtotalCents : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {freeShippingThresholdCents && remaining > 0 && (
          <div className="mb-4 rounded bg-muted p-3 text-sm text-muted-foreground">
            Plus que <strong className="text-foreground">{formatMoney(remaining, currency)}</strong> pour la livraison offerte.
          </div>
        )}
        <ul className="divide-y divide-border">
          {lines.map((line) => (
            <li key={line.id} className="flex gap-4 py-4">
              <Link href={`/produit/${line.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-muted">
                {line.imageUrl && <Image src={line.imageUrl} alt={line.name} fill sizes="96px" className="object-cover" unoptimized={line.imageUrl.endsWith(".svg")} />}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <div>
                    <Link href={`/produit/${line.slug}`} className="font-medium hover:text-primary">{line.name}</Link>
                    {line.variantName && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        {line.colorHex && <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: line.colorHex }} />}
                        {line.variantName}
                      </p>
                    )}
                    {!line.inStock && <p className="mt-1 text-sm text-error">Rupture de stock</p>}
                  </div>
                  <button type="button" onClick={() => remove(line.id)} aria-label="Retirer" className="h-8 text-muted-foreground hover:text-error"><Trash2 size={18} /></button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded border border-border">
                    <button type="button" onClick={() => update(line.id, line.quantity - 1)} disabled={pending} className="flex h-9 w-9 items-center justify-center" aria-label="Diminuer"><Minus size={14} /></button>
                    <span className="w-9 text-center text-sm">{line.quantity}</span>
                    <button type="button" onClick={() => update(line.id, line.quantity + 1)} disabled={pending || line.quantity >= line.availableStock} className="flex h-9 w-9 items-center justify-center" aria-label="Augmenter"><Plus size={14} /></button>
                  </div>
                  <PriceDisplay priceCents={line.unitPriceCents * line.quantity} currency={currency} size="sm" showDiscount={false} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded border border-border bg-surface p-5">
        <h2 className="font-heading text-lg font-semibold">Récapitulatif</h2>

        {features.coupons && (
          <div className="mt-4">
            {couponCode ? (
              <div className="flex items-center justify-between rounded bg-success/10 px-3 py-2 text-sm text-success">
                <span className="flex items-center gap-1.5"><Tag size={14} /> {couponCode}</span>
                <button type="button" onClick={() => startTransition(async () => { await removeCouponAction(); })} aria-label="Retirer le code"><X size={16} /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Code promo" className="flex-1" error={couponError ?? undefined} aria-label="Code promo" />
                <Button variant="outline" onClick={applyCoupon} loading={pending} disabled={!coupon.trim()}>OK</Button>
              </div>
            )}
          </div>
        )}

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <Row label="Sous-total" value={formatMoney(totals.subtotalCents, currency)} />
          {totals.discountCents > 0 && <Row label="Remise" value={`-${formatMoney(totals.discountCents, currency)}`} className="text-success" />}
          <Row label="Livraison" value="Calculée à l'étape suivante" muted />
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(totals.totalCents, currency)}</dd>
          </div>
        </dl>

        <Link href="/checkout" className={cn("mt-5 flex h-12 w-full items-center justify-center rounded bg-primary font-medium text-primary-foreground hover:opacity-90")}>
          Passer la commande
        </Link>
        <Link href="/boutique" className="mt-2 block text-center text-sm text-muted-foreground hover:text-primary">Continuer mes achats</Link>
      </aside>
    </div>
  );
}

function Row({ label, value, muted, className }: { label: string; value: string; muted?: boolean; className?: string }) {
  return (
    <div className={cn("flex justify-between", className)}>
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={muted ? "text-muted-foreground" : "font-medium"}>{value}</dd>
    </div>
  );
}
