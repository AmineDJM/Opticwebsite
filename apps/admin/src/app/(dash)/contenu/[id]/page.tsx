import { notFound } from "next/navigation";
import { requirePermission } from "../../../../server/session.js";
import { parseBlockProps } from "@optic/config";
import { PageEditor } from "../../../../components/page-editor.js";

export const dynamic = "force-dynamic";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("content:read");
  const page = await ctx.db.page.findFirst({ where: { id } as never, include: { blocks: { orderBy: { position: "asc" } } } });
  if (!page) notFound();
  const p = page as never as { id: string; title: string; slug: string; kind: string; isPublished: boolean; body: string | null; blocks: { id: string; type: string; isEnabled: boolean; position: number; props: unknown }[] };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold">{p.title}</h1>
      <PageEditor
        page={{ id: p.id, title: p.title, slug: p.slug, kind: p.kind, isPublished: p.isPublished, body: p.body ?? "" }}
        blocks={p.blocks.map((b) => ({ id: b.id, type: b.type, isEnabled: b.isEnabled, position: b.position, props: parseBlockProps(b.type, b.props) }))}
      />
    </div>
  );
}
