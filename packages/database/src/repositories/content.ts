import type { TenantClient } from "../tenant.js";
import { parseBlockProps } from "@optic/config";

/**
 * Content repository: pages and their ordered content blocks (§5, §28). Block props
 * are validated/defaulted through @optic/config's registry on read so the renderer
 * always receives well-formed props.
 */

export interface ResolvedBlock {
  id: string;
  type: string;
  position: number;
  props: Record<string, unknown>;
}

export async function getPageBySlug(db: TenantClient, slug: string) {
  const page = await db.page.findFirst({
    where: { slug, isPublished: true } as never,
    include: { blocks: { where: { isEnabled: true }, orderBy: { position: "asc" } } },
  });
  if (!page) return null;
  const p = page as never as {
    id: string;
    slug: string;
    title: string;
    kind: string;
    body: string | null;
    seo: unknown;
    blocks: Array<{ id: string; type: string; position: number; props: unknown }>;
  };
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    kind: p.kind,
    body: p.body,
    seo: p.seo,
    blocks: p.blocks.map((b) => ({ id: b.id, type: b.type, position: b.position, props: parseBlockProps(b.type, b.props) })),
  };
}

export async function getHomepage(db: TenantClient) {
  const page = await db.page.findFirst({
    where: { kind: "HOME" } as never,
    include: { blocks: { where: { isEnabled: true }, orderBy: { position: "asc" } } },
  });
  if (!page) return null;
  const p = page as never as {
    id: string;
    title: string;
    seo: unknown;
    blocks: Array<{ id: string; type: string; position: number; props: unknown }>;
  };
  return {
    id: p.id,
    title: p.title,
    seo: p.seo,
    blocks: p.blocks.map((b) => ({ id: b.id, type: b.type, position: b.position, props: parseBlockProps(b.type, b.props) })),
  };
}

export async function listMenu(db: TenantClient, key: string) {
  const menu = await db.menu.findFirst({
    where: { key } as never,
    include: { items: { where: { parentId: null }, orderBy: { position: "asc" }, include: { children: { orderBy: { position: "asc" } } } } },
  });
  return menu;
}
