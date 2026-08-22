import Link from "next/link";
import { clampPageParams, formatMoney, pageToRange } from "@optic/core";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@optic/commerce";
import { buttonVariants, EmptyState } from "@optic/ui";
import { requirePermission } from "../../../server/session.js";
import { StatusBadge } from "../page.js";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requirePermission("order:read");
  const status = (Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? "";
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  const page = clampPageParams(sp.page, 20, { defaultPageSize: 20, maxPageSize: 50 });
  const { skip, take } = pageToRange(page);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) where.OR = [{ number: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { lastName: { contains: q, mode: "insensitive" } }];

  const [rows, total] = await Promise.all([
    ctx.db.order.findMany({ where: where as never, orderBy: { createdAt: "desc" } as never, skip, take, select: { id: true, number: true, firstName: true, lastName: true, phone: true, totalCents: true, status: true, createdAt: true, wilaya: { select: { nameFr: true } } } }),
    ctx.db.order.count({ where: where as never }),
  ]);
  const orders = rows as never as { id: string; number: string; firstName: string; lastName: string; phone: string; totalCents: number; status: OrderStatus; createdAt: Date; wilaya: { nameFr: string } | null }[];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Commandes <span className="text-base font-normal text-muted-foreground">({total})</span></h1>

      <form action="/commandes" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="N° commande, téléphone, nom…" className="max-w-xs flex-1 rounded border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        <select name="status" defaultValue={status} className="rounded border border-border bg-surface px-3 text-sm">
          <option value="">Tous statuts</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
        </select>
        <button className={buttonVariants({ variant: "outline", size: "sm" })}>Filtrer</button>
      </form>

      {orders.length === 0 ? (
        <EmptyState title="Aucune commande" description="Les commandes apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">N°</th><th className="p-3">Client</th><th className="p-3">Wilaya</th><th className="p-3">Total</th><th className="p-3">Statut</th><th className="p-3">Date</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3"><Link href={`/commandes/${o.id}`} className="font-mono font-medium hover:text-primary">{o.number}</Link></td>
                  <td className="p-3">{o.firstName} {o.lastName}<br /><span className="text-xs text-muted-foreground">{o.phone}</span></td>
                  <td className="p-3">{o.wilaya?.nameFr ?? "—"}</td>
                  <td className="p-3 font-medium">{formatMoney(o.totalCents, ctx.currency)}</td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("fr-DZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > take && (
        <div className="flex justify-center gap-2">
          {page.page > 1 && <Link href={`/commandes?status=${status}&q=${q}&page=${page.page - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Précédent</Link>}
          <span className="flex items-center px-3 text-sm text-muted-foreground">Page {page.page}</span>
          {skip + take < total && <Link href={`/commandes?status=${status}&q=${q}&page=${page.page + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Suivant</Link>}
        </div>
      )}
    </div>
  );
}
