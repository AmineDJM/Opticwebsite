import { clampPageParams, formatMoney, pageToRange } from "@optic/core";
import { EmptyState } from "@optic/ui";
import { requirePermission } from "../../../server/session.js";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requirePermission("customer:read");
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  const page = clampPageParams(sp.page, 20);
  const { skip, take } = pageToRange(page);
  const where = q ? { OR: [{ phone: { contains: q } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {};
  const [rows, total] = await Promise.all([
    ctx.db.customer.findMany({ where: where as never, orderBy: { createdAt: "desc" }, skip, take, include: { _count: { select: { orders: true } } } }),
    ctx.db.customer.count({ where: where as never }),
  ]);
  const customers = rows as never as { id: string; firstName: string; lastName: string; phone: string; email: string | null; isGuest: boolean; createdAt: Date; _count: { orders: number } }[];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Clients <span className="text-base font-normal text-muted-foreground">({total})</span></h1>
      <form action="/clients"><input name="q" defaultValue={q} placeholder="Nom, téléphone, e-mail…" className="w-full max-w-md rounded border border-border bg-surface px-3 py-2 text-sm" /></form>
      {customers.length === 0 ? <EmptyState title="Aucun client" /> : (
        <div className="overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Client</th><th className="p-3">Contact</th><th className="p-3">Commandes</th><th className="p-3">Type</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{c.firstName} {c.lastName}</td>
                  <td className="p-3 text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ""}</td>
                  <td className="p-3">{c._count.orders}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.isGuest ? "Invité" : "Compte"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
