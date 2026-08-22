import Image from "next/image";
import { requirePermission } from "../../../server/session.js";
import { MediaUploader } from "../../../components/media-uploader.js";
import { EmptyState } from "@optic/ui";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const ctx = await requirePermission("media:read");
  const media = await ctx.db.media.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  const list = media as never as { id: string; url: string; filename: string; folder: string }[];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Médiathèque</h1>
      <MediaUploader />
      {list.length === 0 ? <EmptyState title="Aucun média" description="Importez vos premières images." /> : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((m) => (
            <figure key={m.id} className="group relative overflow-hidden rounded border border-border bg-surface">
              <span className="relative block aspect-square bg-muted">
                <Image src={m.url} alt={m.filename} fill sizes="150px" className="object-cover" unoptimized />
              </span>
              <figcaption className="truncate p-1.5 text-center text-[10px] text-muted-foreground">{m.filename}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
