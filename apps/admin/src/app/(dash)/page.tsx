import Link from "next/link";
import { ShoppingCart, Wallet, PackageCheck, TruckIcon, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, Badge } from "@optic/ui";
import { formatMoney } from "@optic/core";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@optic/commerce";
import { requireAdmin } from "../../server/session.js";
import { getDashboard } from "../../server/dashboard.js";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireAdmin();
  const data = await getDashboard(ctx.db, ctx.websiteId);
  const money = (c: number) => formatMoney(c, ctx.currency);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<ShoppingCart size={20} />} label="Commandes aujourd'hui" value={String(data.today.orders)} sub={money(data.today.revenueCents)} />
        <Stat icon={<Wallet size={20} />} label="À confirmer" value={String(data.toConfirm)} accent={data.toConfirm > 0} href="/commandes?status=NEW" />
        <Stat icon={<TruckIcon size={20} />} label="Expédiées" value={String(data.shipped)} href="/commandes?status=SHIPPED" />
        <Stat icon={<AlertTriangle size={20} />} label="Livraisons échouées" value={String(data.failedDelivery)} accent={data.failedDelivery > 0} href="/commandes?status=FAILED_DELIVERY" />
      </div>

      {/* COD revenue tiers (§25) */}
      <Card variant="bordered" padded>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h2 className="font-heading text-lg font-semibold">Chiffre d&apos;affaires (paiement à la livraison)</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          En COD, une commande n&apos;est un revenu réalisé qu&apos;une fois livrée. Voici la ventilation par étape.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Tier label="Commandé" value={money(data.revenueTiers.ordered)} tone="muted" />
          <Tier label="Confirmé" value={money(data.revenueTiers.confirmed)} tone="muted" />
          <Tier label="Expédié" value={money(data.revenueTiers.shipped)} tone="warning" />
          <Tier label="Livré (réalisé)" value={money(data.revenueTiers.delivered)} tone="success" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Panier moyen : <strong className="text-foreground">{money(data.avgBasketCents)}</strong></p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="bordered" padded>
          <h2 className="mb-3 font-heading text-lg font-semibold">Dernières commandes</h2>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune commande pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/commandes/${o.id}`} className="flex items-center justify-between py-2.5 hover:text-primary">
                    <span>
                      <span className="font-mono text-sm font-medium">{o.number}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{o.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <span className="text-sm font-medium">{money(o.totalCents)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card variant="bordered" padded>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold"><PackageCheck size={18} /> Meilleures ventes</h2>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas encore de ventes.</p>
            ) : (
              <ul className="space-y-2">
                {data.topProducts.map((p) => (
                  <li key={p.name} className="flex justify-between text-sm"><span>{p.name}</span><span className="font-medium">{p.sold} vendus</span></li>
                ))}
              </ul>
            )}
          </Card>

          <Card variant="bordered" padded>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold"><AlertTriangle size={18} className="text-warning" /> Stock faible</h2>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun produit en stock faible.</p>
            ) : (
              <ul className="space-y-2">
                {data.lowStock.map((v) => (
                  <li key={v.sku} className="flex justify-between text-sm"><span>{v.name} <span className="text-xs text-muted-foreground">({v.sku})</span></span><Badge variant={v.stock === 0 ? "error" : "warning"}>{v.stock}</Badge></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, accent, href }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean; href?: string }) {
  const inner = (
    <Card variant="bordered" padded className={accent ? "border-primary/40" : ""}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={accent ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Tier({ label, value, tone }: { label: string; value: string; tone: "muted" | "warning" | "success" }) {
  const c = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-semibold ${c}`}>{value}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const variant: Record<OrderStatus, "neutral" | "primary" | "success" | "warning" | "error"> = {
    NEW: "primary", CONFIRMED: "primary", PREPARING: "neutral", READY: "neutral", SHIPPED: "warning",
    DELIVERED: "success", CANCELLED: "error", RETURNED: "error", FAILED_DELIVERY: "error",
  };
  return <Badge variant={variant[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
