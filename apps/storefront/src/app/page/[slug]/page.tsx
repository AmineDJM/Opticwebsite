import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@optic/ui";
import { getPageBySlug } from "@optic/database";
import { getTenant } from "../../../server/tenant.js";
import { BlockRenderer } from "../../../components/block-renderer.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const page = await getPageBySlug(tenant.db, slug);
  if (!page) return { title: "Page" };
  const seo = page.seo as { title?: string; description?: string } | null;
  return { title: seo?.title ?? page.title, description: seo?.description ?? undefined };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenant();
  const page = await getPageBySlug(tenant.db, slug);
  if (!page) notFound();

  return (
    <Container>
      <article className="mx-auto max-w-3xl py-12">
        <h1 className="font-heading text-3xl font-semibold">{page.title}</h1>
        {page.body && <div className="prose prose-neutral mt-6 max-w-none whitespace-pre-line text-foreground">{page.body}</div>}
      </article>
      {page.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} tenant={tenant} />
      ))}
    </Container>
  );
}
