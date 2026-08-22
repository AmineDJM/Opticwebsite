"use client";

import { useEffect, useState, useActionState } from "react";
import Image from "next/image";
import { Wallet, Truck, Store, Loader2 } from "lucide-react";
import { Button, Input, Select, Textarea, Alert, cn } from "@optic/ui";
import { formatMoney } from "@optic/core";
import { placeOrderAction, quoteShippingAction, communesAction, type CheckoutState } from "../server/actions/checkout.js";

/**
 * COD checkout (§11): a short, mobile-first form. Wilaya→commune cascade, live shipping
 * quote as the wilaya/method change, and a clear "paiement à la livraison" summary. The
 * order is created by a server action (progressive-enhancement friendly via useActionState).
 */
interface Line {
  id: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: number;
}

export function CheckoutClient({
  currency,
  requireEmail,
  wilayas,
  lines,
  subtotalCents,
  discountCents,
  couponCode,
}: {
  currency: string;
  requireEmail: boolean;
  wilayas: { code: string; name: string }[];
  lines: Line[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, { ok: false });
  const [wilaya, setWilaya] = useState("");
  const [method, setMethod] = useState<"HOME" | "DESK">("HOME");
  const [communes, setCommunes] = useState<{ id: string; nameFr: string }[]>([]);
  const [quote, setQuote] = useState<{ feeCents: number; available: boolean; codAllowed: boolean; estimatedDaysMin: number; estimatedDaysMax: number; freeShippingThresholdCents: number | null } | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    if (!wilaya) { setCommunes([]); setQuote(null); return; }
    let cancelled = false;
    setLoadingQuote(true);
    (async () => {
      const [c, q] = await Promise.all([communesAction(wilaya), quoteShippingAction(wilaya, method)]);
      if (cancelled) return;
      setCommunes(c as { id: string; nameFr: string }[]);
      setQuote(q);
      setLoadingQuote(false);
    })();
    return () => { cancelled = true; };
  }, [wilaya, method]);

  const shippingCents = quote?.available
    ? (quote.freeShippingThresholdCents && subtotalCents - discountCents >= quote.freeShippingThresholdCents ? 0 : quote.feeCents)
    : null;
  const totalCents = subtotalCents - discountCents + (shippingCents ?? 0);
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="deliveryMethod" value={method} />
      <div className="space-y-8">
        {state.error && <Alert variant="error" role="alert">{state.error}</Alert>}

        <section>
          <h2 className="mb-4 font-heading text-xl font-semibold">Vos coordonnées</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="firstName" label="Prénom" required error={fieldError("firstName")} autoComplete="given-name" />
            <Input name="lastName" label="Nom" required error={fieldError("lastName")} autoComplete="family-name" />
            <Input name="phone" label="Téléphone" required error={fieldError("phone")} inputMode="tel" autoComplete="tel" placeholder="05 / 06 / 07…" />
            <Input name="phoneAlt" label="Téléphone secondaire" hint="Facultatif" error={fieldError("phoneAlt")} inputMode="tel" />
            <div className="sm:col-span-2">
              <Input name="email" type="email" label={`E-mail${requireEmail ? "" : " (facultatif)"}`} required={requireEmail} error={fieldError("email")} autoComplete="email" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-heading text-xl font-semibold">Livraison</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="wilayaCode" label="Wilaya" required value={wilaya} onChange={(e) => setWilaya(e.target.value)} placeholder="Choisir une wilaya" options={wilayas.map((w) => ({ value: w.code, label: `${w.code} — ${w.name}` }))} error={fieldError("wilayaCode")} />
            <Select name="communeId" label="Commune" value={communes.length ? undefined : ""} placeholder={communes.length ? "Choisir une commune" : "Sélectionnez d'abord une wilaya"} options={communes.map((c) => ({ value: c.id, label: c.nameFr }))} disabled={!communes.length} />
            <div className="sm:col-span-2">
              <Input name="addressLine" label="Adresse" required error={fieldError("addressLine")} autoComplete="street-address" />
            </div>
            <div className="sm:col-span-2">
              <Input name="landmark" label="Repère / instructions" hint="Facultatif — aide le livreur à vous trouver" />
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">Mode de livraison</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <MethodOption icon={<Truck size={20} />} label="À domicile" selected={method === "HOME"} onSelect={() => setMethod("HOME")} />
              <MethodOption icon={<Store size={20} />} label="Au bureau (stopdesk)" selected={method === "DESK"} onSelect={() => setMethod("DESK")} />
            </div>
          </fieldset>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold">Paiement</h2>
          <div className="flex items-start gap-3 rounded border border-primary/40 bg-primary/5 p-4">
            <Wallet className="mt-0.5 text-primary" size={22} />
            <div>
              <p className="font-medium">Paiement à la livraison</p>
              <p className="text-sm text-muted-foreground">Vous payez en espèces à la réception de votre commande.</p>
            </div>
          </div>
          <Textarea name="note" label="Note (facultatif)" className="mt-4" rows={2} />
        </section>
      </div>

      <aside className="h-fit rounded border border-border bg-surface p-5">
        <h2 className="font-heading text-lg font-semibold">Votre commande</h2>
        <ul className="mt-3 max-h-56 space-y-3 overflow-y-auto">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
                {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" unoptimized={l.imageUrl.endsWith(".svg")} />}
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{l.quantity}</span>
              </div>
              <div className="flex-1 text-sm">
                <p className="line-clamp-1 font-medium">{l.name}</p>
                {l.variantName && <p className="text-xs text-muted-foreground">{l.variantName}</p>}
              </div>
              <span className="text-sm font-medium">{formatMoney(l.unitPriceCents * l.quantity, currency)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{formatMoney(subtotalCents, currency)}</dd></div>
          {discountCents > 0 && <div className="flex justify-between text-success"><dt>Remise {couponCode ? `(${couponCode})` : ""}</dt><dd>-{formatMoney(discountCents, currency)}</dd></div>}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Livraison</dt>
            <dd>
              {loadingQuote ? <Loader2 className="animate-spin" size={14} /> : shippingCents == null ? <span className="text-muted-foreground">—</span> : shippingCents === 0 ? <span className="text-success">Offerte</span> : formatMoney(shippingCents, currency)}
            </dd>
          </div>
          {quote?.available && (
            <p className="text-xs text-muted-foreground">Livraison estimée {quote.estimatedDaysMin}–{quote.estimatedDaysMax} jours.</p>
          )}
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(totalCents, currency)}</dd>
          </div>
        </dl>

        <Button type="submit" block size="lg" className="mt-5" loading={pending} disabled={!wilaya || (quote != null && !quote.available)}>
          Confirmer la commande
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Paiement à la livraison • Sans engagement</p>
      </aside>
    </form>
  );
}

function MethodOption({ icon, label, selected, onSelect }: { icon: React.ReactNode; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 rounded border p-3 text-left text-sm transition",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
      )}
    >
      <span className={selected ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      {label}
    </button>
  );
}
