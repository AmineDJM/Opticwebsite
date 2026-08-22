import { requirePermission } from "../../../server/session.js";
import { Badge, EmptyState } from "@optic/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const ctx = await requirePermission("audit:read");
  const logs = await ctx.db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const list = logs as never as { id: string; action: string; entityType: string; entityLabel: string | null; actorEmail: string | null; before: unknown; after: unknown; createdAt: Date; ipAddress: string | null }[];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Journal d&apos;audit</h1>
      <p className="text-sm text-muted-foreground">Les 100 dernières actions sensibles (§36).</p>
      {list.length === 0 ? <EmptyState title="Aucune entrée" description="Les actions sensibles seront tracées ici." /> : (
        <div className="overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Action</th><th className="p-3">Objet</th><th className="p-3">Détails</th><th className="p-3">Auteur</th><th className="p-3">Date</th></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="p-3"><Badge variant="neutral">{l.action}</Badge></td>
                  <td className="p-3">{l.entityType}{l.entityLabel ? ` — ${l.entityLabel}` : ""}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.before || l.after ? `${JSON.stringify(l.before)} → ${JSON.stringify(l.after)}` : "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.actorEmail}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString("fr-DZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
