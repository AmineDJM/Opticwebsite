import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Package, Phone, MapPin, Wallet } from "lucide-react";
import { Container, buttonVariants } from "@optic/ui";
import { formatMoney } from "@optic/core";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@optic/commerce";
import { getOrderByNumber } from "@optic/database";
import { getTenant } from "../../../server/tenant.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commande confirmée" };

export default async function OrderConfirmationPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const tenant = await getTenant();
  const order = await getOrderByNumber(tenant.db, number);
  if (!order) notFound();
  const o = order as never as {
    number: string; status: OrderStatus; firstName: string; lastName: string; phone: string;
    addressLine: string; deliveryMethod: string; subtotalCents: number; discountCents: number; shippingCents: number; totalCents: number;
    wilaya: { nameFr: string } | null; commune: { nameFr: string } | null;
    items: { name: string; variantName: string | null; quantity: number; totalCents: number }[];
  };

  return (
    <Container>
      <div className="mx-auto max-w-2xl py-12">
        <div className="text-center">
          <CheckCircle2 className="mx-auto text-success" size={56} strokeWidth={1.5} />
          <h1 className="mt-4 font-heading text-3xl font-semibold">Merci pour votre commande</h1>
          <p className="mt-2 text-muted-foreground">Votre commande a bien été enregistrée. Nous vous contacterons pour la confirmer.</p>
          <p className="mt-4 inline-block rounded bg-muted px-4 py-2 font-mono text-lg font-semibold">{o.number}</p>
        </div>

        <div className="mt-8 rounded border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
            <Package size={18} /> Statut : {ORDER_STATUS_LABELS[o.status]}
          </div>
          <ul className="divide-y divide-border">
            {o.items.map((it, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span>{it.quantity} × {it.name}{it.variantName ? ` — ${it.variantName}` : ""}</span>
                <span className="font-medium">{formatMoney(it.totalCents, tenant.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{formatMoney(o.subtotalCents, tenant.currency)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between text-success"><dt>Remise</dt><dd>-{formatMoney(o.discountCents, tenant.currency)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Livraison</dt><dd>{o.shippingCents === 0 ? "Offerte" : formatMoney(o.shippingCents, tenant.currency)}</dd></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(o.totalCents, tenant.currency)}</dd></div>
          </dl>
          <div className="mt-4 flex items-center gap-2 rounded bg-primary/5 p-3 text-sm">
            <Wallet size={18} className="text-primary" /> Paiement à la livraison
          </div>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Phone size={14} /> {o.firstName} {o.lastName} — {o.phone}</p>
            <p className="flex items-center gap-2"><MapPin size={14} /> {o.addressLine}, {o.commune?.nameFr ? `${o.commune.nameFr}, ` : ""}{o.wilaya?.nameFr} ({o.deliveryMethod === "HOME" ? "domicile" : "stopdesk"})</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link href="/boutique" className={buttonVariants({ variant: "outline" })}>Continuer mes achats</Link>
          <Link href={`/suivi?number=${o.number}`} className={buttonVariants()}>Suivre ma commande</Link>
        </div>
      </div>
    </Container>
  );
}
