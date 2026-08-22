import Link from "next/link";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { clampPageParams, formatMoney } from "@optic/core";
import { buildProductWhere, buildProductOrderBy, parseFilters } from "@optic/catalog";
import { pageToRange } from "@optic/core";
import { Badge, buttonVariants, EmptyState } from "@optic/ui";
import { requirePermission } from "../../../server/session.js";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requirePermission("product:read");
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  const statusFilter = (Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? "";
  const page = clampPageParams(sp.page, 20, { defaultPageSize: 20, maxPageSize: 50 });

  const filters = parseFilters({ q });
  const where = buildProductWhere(filters, { publishedOnly: false }) as Record<string, unknown>;
  delete where.status; // admin sees all statuses
  if (statusFilter) where.status = statusFilter;
  const { skip, take } = pageToRange(page);

  const [rows, total] = await Promise.all([
    ctx.db.product.findMany({
      where: where as never,
      orderBy: buildProductOrderBy("newest") as never,
      skip, take,
      include: { brand: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" }, include: { media: { select: { url: true } } } }, variants: { select: { stock: true } }, categories: { include: { category: { select: { name: true } } }, take: 1 } },
    }),
    ctx.db.product.count({ where: where as never }),
  ]);

  const products = rows as never as {
    id: string; name: string; sku: string; slug: string; priceCents: number; comparePriceCents: number | null; status: string;
    brand: { name: string } | null; images: { media: { url: string } }[]; variants: { stock: number }[]; categories: { category: { name: string } }[];
  }[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Produits <span className="text-base font-normal text-muted-foreground">({total})</span></h1>
        <Link href="/produits/nouveau" className={buttonVariants()}><Plus size={18} /> Nouveau produit</Link>
      </div>

      <form className="flex gap-2" action="/produits">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q} placeholder="Rechercher par nom, SKU…" className="w-full rounded border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select name="status" defaultValue={statusFilter} className="rounded border border-border bg-surface px-3 text-sm">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="DRAFT">Brouillon</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        <button className={buttonVariants({ variant: "outline", size: "sm" })}>Filtrer</button>
      </form>

      {products.length === 0 ? (
        <EmptyState title="Aucun produit" description="Créez votre premier produit." action={<Link href="/produits/nouveau" className={buttonVariants()}>Nouveau produit</Link>} />
      ) : (
        <div className="overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Produit</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Marque</th>
                <th className="p-3">Prix</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce((s, v) => s + v.stock, 0);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <Link href={`/produits/${p.id}`} className="flex items-center gap-3 font-medium hover:text-primary">
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                          {p.images[0]?.media.url && <Image src={p.images[0].media.url} alt="" fill sizes="40px" className="object-cover" unoptimized />}
                        </span>
                        <span className="line-clamp-1">{p.name}</span>
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="p-3">{p.brand?.name ?? "—"}</td>
                    <td className="p-3 font-medium">{formatMoney(p.priceCents, ctx.currency)}</td>
                    <td className="p-3"><Badge variant={stock === 0 ? "error" : stock <= 3 ? "warning" : "neutral"}>{stock}</Badge></td>
                    <td className="p-3"><Badge variant={p.status === "ACTIVE" ? "success" : p.status === "DRAFT" ? "warning" : "neutral"}>{p.status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > take && (
        <div className="flex justify-center gap-2 pt-2">
          {page.page > 1 && <Link href={`/produits?q=${q}&status=${statusFilter}&page=${page.page - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Précédent</Link>}
          <span className="flex items-center px-3 text-sm text-muted-foreground">Page {page.page}</span>
          {skip + take < total && <Link href={`/produits?q=${q}&status=${statusFilter}&page=${page.page + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Suivant</Link>}
        </div>
      )}
    </div>
  );
}
