import { getHomepage } from "@optic/database";
import { getTenant } from "../server/tenant.js";
import { BlockRenderer } from "../components/block-renderer.js";

/** Homepage — renders the admin-configured block list (§45). Fully data-driven. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = await getTenant();
  const home = await getHomepage(tenant.db);

  if (!home || home.blocks.length === 0) {
    return (
      <div className="mx-auto max-w-container px-4 py-24 text-center">
        <h1 className="font-heading text-3xl font-semibold">{tenant.name}</h1>
        <p className="mt-2 text-muted-foreground">{tenant.tagline}</p>
      </div>
    );
  }

  return (
    <>
      {home.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} tenant={tenant} />
      ))}
    </>
  );
}
