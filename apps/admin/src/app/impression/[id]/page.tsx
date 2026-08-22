import { notFound } from "next/navigation";
import { formatMoney } from "@optic/core";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@optic/commerce";
import { requirePermission } from "../../../server/session.js";

export const dynamic = "force-dynamic";

/** Printable bon de commande (§13). Uses the root layout (no admin chrome). */
export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("order:read");
  const order = await ctx.db.order.findFirst({ where: { id } as never, include: { items: true, wilaya: { select: { nameFr: true } }, commune: { select: { nameFr: true } } } });
  if (!order) notFound();
  const o = order as never as { number: string; status: OrderStatus; firstName: string; lastName: string; phone: string; addressLine: string; deliveryMethod: string; totalCents: number; shippingCents: number; wilaya: { nameFr: string } | null; commune: { nameFr: string } | null; items: { name: string; variantName: string | null; quantity: number; totalCents: number }[] };

  return (
    <div className="mx-auto max-w-2xl p-8 text-foreground">
      <h1 className="text-xl font-semibold">{ctx.websiteName} — Bon de commande</h1>
      <p className="mt-1 text-sm"><strong>N° :</strong> {o.number} · <strong>Statut :</strong> {ORDER_STATUS_LABELS[o.status]}</p>
      <hr className="my-3" />
      <p><strong>Client :</strong> {o.firstName} {o.lastName} — {o.phone}</p>
      <p><strong>Adresse :</strong> {o.addressLine}, {o.commune?.nameFr ? `${o.commune.nameFr}, ` : ""}{o.wilaya?.nameFr} ({o.deliveryMethod === "HOME" ? "Domicile" : "Stopdesk"})</p>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead><tr className="border-b text-left"><th className="py-1">Article</th><th>Qté</th><th className="text-right">Total</th></tr></thead>
        <tbody>
          {o.items.map((it, i) => (
            <tr key={i} className="border-b"><td className="py-1">{it.name}{it.variantName ? ` — ${it.variantName}` : ""}</td><td>{it.quantity}</td><td className="text-right">{formatMoney(it.totalCents, ctx.currency)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-right text-sm"><strong>Livraison :</strong> {formatMoney(o.shippingCents, ctx.currency)}</p>
      <p className="mt-1 text-right text-lg"><strong>Total à encaisser : {formatMoney(o.totalCents, ctx.currency)}</strong></p>
      <p className="mt-6 text-xs text-muted-foreground">Paiement à la livraison.</p>
    </div>
  );
}
