import Link from "next/link";
import { Plus, Home, FileText } from "lucide-react";
import { Badge, buttonVariants, Card } from "@optic/ui";
import { requirePermission } from "../../../server/session.js";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const ctx = await requirePermission("content:read");
  const pages = await ctx.db.page.findMany({ orderBy: [{ kind: "asc" }, { title: "asc" }], include: { _count: { select: { blocks: true } } } });
  const list = pages as never as { id: string; title: string; slug: string; kind: string; isPublished: boolean; _count: { blocks: number } }[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Contenu &amp; pages</h1>
        <Link href="/contenu/nouvelle" className={buttonVariants()}><Plus size={18} /> Nouvelle page</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((p) => (
          <Link key={p.id} href={`/contenu/${p.id}`}>
            <Card variant="bordered" padded className="transition hover:border-primary/50">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">{p.kind === "HOME" ? <Home size={18} className="text-primary" /> : <FileText size={18} className="text-muted-foreground" />} {p.title}</span>
                <Badge variant={p.isPublished ? "success" : "warning"}>{p.isPublished ? "Publiée" : "Brouillon"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">/{p.slug} · {p._count.blocks} bloc(s)</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
