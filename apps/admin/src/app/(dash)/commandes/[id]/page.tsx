import { notFound } from "next/navigation";
import { Phone, MapPin, Mail, Wallet, Printer } from "lucide-react";
import { Card } from "@optic/ui";
import { formatMoney } from "@optic/core";
import { allowedTransitions, ORDER_STATUS_LABELS, type OrderStatus } from "@optic/commerce";
import { requirePermission } from "../../../../server/session.js";
import { StatusBadge } from "../../page.js";
import { OrderStatusControl } from "../../../../components/order-status-control.js";
import { OrderNote } from "../../../../components/order-note.js";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("order:read");
  const order = await ctx.db.order.findFirst({
    where: { id } as never,
    include: { items: true, history: { orderBy: { createdAt: "desc" } }, wilaya: { select: { nameFr: true } }, commune: { select: { nameFr: true } } },
  });
  if (!order) notFound();
  const o = order as never as {
    id: string; number: string; status: OrderStatus; firstName: string; lastName: string; phone: string; phoneAlt: string | null; email: string | null;
    addressLine: string; landmark: string | null; deliveryMethod: string; internalNote: string | null;
    subtotalCents: number; discountCents: number; shippingCents: number; totalCents: number; couponCode: string | null; createdAt: Date;
    wilaya: { nameFr: string } | null; commune: { nameFr: string } | null;
    items: { id: string; name: string; variantName: string | null; sku: string; quantity: number; unitPriceCents: number; totalCents: number }[];
    history: { id: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; note: string | null; actorName: string | null; createdAt: Date }[];
  };
  const canChange = ctx.permissions.includes("*") || ctx.permissions.includes("order:status");
  const transitions = allowedTransitions(o.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Commande {o.number}</h1>
          <p className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString("fr-DZ")}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={o.status} />
          <a href={`/impression/${o.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-2 text-sm hover:bg-muted"><Printer size={16} /> Imprimer</a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card variant="bordered" padded>
            <h2 className="mb-3 font-heading text-lg font-semibold">Articles</h2>
            <table className="w-full text-sm">
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id} className="border-b border-border last:border-0">
                    <td className="py-2">{it.name}{it.variantName ? ` — ${it.variantName}` : ""}<br /><span className="font-mono text-xs text-muted-foreground">{it.sku}</span></td>
                    <td className="py-2 text-center">×{it.quantity}</td>
                    <td className="py-2 text-right font-medium">{formatMoney(it.totalCents, ctx.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{formatMoney(o.subtotalCents, ctx.currency)}</dd></div>
              {o.discountCents > 0 && <div className="flex justify-between text-success"><dt>Remise {o.couponCode ? `(${o.couponCode})` : ""}</dt><dd>-{formatMoney(o.discountCents, ctx.currency)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Livraison</dt><dd>{o.shippingCents === 0 ? "Offerte" : formatMoney(o.shippingCents, ctx.currency)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(o.totalCents, ctx.currency)}</dd></div>
            </dl>
            <p className="mt-3 flex items-center gap-2 rounded bg-primary/5 p-2 text-sm"><Wallet size={16} className="text-primary" /> Paiement à la livraison</p>
          </Card>

          <Card variant="bordered" padded>
            <h2 className="mb-3 font-heading text-lg font-semibold">Historique</h2>
            <ol className="space-y-2 text-sm">
              {o.history.map((h) => (
                <li key={h.id} className="flex items-start justify-between border-b border-border pb-2 last:border-0">
                  <span>
                    <strong>{ORDER_STATUS_LABELS[h.toStatus]}</strong>
                    {h.note && <span className="block text-muted-foreground">{h.note}</span>}
                    {h.actorName && <span className="block text-xs text-muted-foreground">par {h.actorName}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString("fr-DZ")}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          {canChange && transitions.length > 0 && <OrderStatusControl orderId={o.id} current={o.status} transitions={transitions} />}

          <Card variant="bordered" padded>
            <h2 className="mb-3 font-heading text-lg font-semibold">Client</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{o.firstName} {o.lastName}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Phone size={14} /> {o.phone}{o.phoneAlt ? ` / ${o.phoneAlt}` : ""}</p>
              {o.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail size={14} /> {o.email}</p>}
              <p className="flex items-start gap-2 text-muted-foreground"><MapPin size={14} className="mt-0.5" /> {o.addressLine}, {o.commune?.nameFr ? `${o.commune.nameFr}, ` : ""}{o.wilaya?.nameFr} — {o.deliveryMethod === "HOME" ? "domicile" : "stopdesk"}</p>
              {o.landmark && <p className="text-xs text-muted-foreground">Repère : {o.landmark}</p>}
            </div>
          </Card>

          <OrderNote orderId={o.id} note={o.internalNote} />
        </div>
      </div>
    </div>
  );
}
