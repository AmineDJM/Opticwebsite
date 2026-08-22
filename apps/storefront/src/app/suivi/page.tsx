import type { Metadata } from "next";
import { Container } from "@optic/ui";
import { getTenant } from "../../server/tenant.js";
import { getOrderByNumber } from "@optic/database";
import { formatMoney } from "@optic/core";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "@optic/commerce";
import { TrackForm } from "../../components/track-form.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suivi de commande" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ number?: string; phone?: string }> }) {
  const { number } = await searchParams;
  const tenant = await getTenant();
  const order = number ? await getOrderByNumber(tenant.db, number) : null;

  return (
    <Container>
      <div className="mx-auto max-w-2xl py-12">
        <h1 className="mb-6 font-heading text-3xl font-semibold">Suivre ma commande</h1>
        <TrackForm defaultNumber={number ?? ""} />

        {number && !order && (
          <p className="mt-6 rounded bg-muted p-4 text-sm text-muted-foreground">Aucune commande trouvée pour ce numéro.</p>
        )}

        {order && <OrderStatusView order={order as never} currency={tenant.currency} />}
      </div>
    </Container>
  );
}

function OrderStatusView({ order, currency }: { order: { number: string; status: OrderStatus; totalCents: number; items: { name: string; quantity: number }[]; history: { toStatus: OrderStatus; createdAt: Date; note: string | null }[] }; currency: string }) {
  const flow: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", "SHIPPED", "DELIVERED"];
  const cancelled = ["CANCELLED", "RETURNED", "FAILED_DELIVERY"].includes(order.status);
  const currentIdx = flow.indexOf(order.status);

  return (
    <div className="mt-8 rounded border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono font-semibold">{order.number}</p>
        <span className="font-medium text-primary">{ORDER_STATUS_LABELS[order.status]}</span>
      </div>

      {!cancelled ? (
        <ol className="mt-6 space-y-4">
          {flow.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
              <span className={i <= currentIdx ? "font-medium" : "text-muted-foreground"}>{ORDER_STATUS_LABELS[s]}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded bg-error/10 p-3 text-sm text-error">Statut : {ORDER_STATUS_LABELS[order.status]}</p>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">{order.items.length} article(s)</p>
        <p className="mt-1 font-semibold">Total : {formatMoney(order.totalCents, currency)}</p>
      </div>
    </div>
  );
}
