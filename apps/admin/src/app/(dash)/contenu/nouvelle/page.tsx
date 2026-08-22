import { redirect } from "next/navigation";
import { savePageAction } from "../../../../server/actions/content.js";
import { requirePermission } from "../../../../server/session.js";

export const dynamic = "force-dynamic";

export default async function NewContentPage() {
  await requirePermission("content:write");
  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "Nouvelle page");
    const result = await savePageAction({ title, kind: "STANDARD", isPublished: false });
    if (result.ok && result.id) redirect(`/contenu/${result.id}`);
    redirect("/contenu");
  }
  return (
    <form action={create} className="mx-auto max-w-md space-y-4 py-8">
      <h1 className="font-heading text-2xl font-semibold">Nouvelle page</h1>
      <input name="title" placeholder="Titre de la page" required className="w-full rounded border border-border bg-surface px-3 py-2.5 text-sm" />
      <button className="rounded bg-primary px-5 py-2.5 font-medium text-primary-foreground">Créer</button>
    </form>
  );
}
