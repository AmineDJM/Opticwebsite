"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBlockProps, isBlockType } from "@optic/config";
import { slugify } from "@optic/core";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/**
 * Content management (§5, §28): homepage/CMS block editing. Block props are validated
 * through the config registry before persistence, so a saved block always renders.
 */

export type ContentActionState = { ok: boolean; error?: string };

const blockSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  isEnabled: z.boolean().default(true),
  position: z.number().int(),
  props: z.record(z.string(), z.unknown()).default({}),
});

export async function saveBlocksAction(pageId: string, blocks: unknown): Promise<ContentActionState> {
  const ctx = await requirePermission("content:write");
  const parsed = z.array(blockSchema).safeParse(blocks);
  if (!parsed.success) return { ok: false, error: "Blocs invalides" };

  const page = await ctx.db.page.findFirst({ where: { id: pageId } as never, select: { id: true, title: true } });
  if (!page) return { ok: false, error: "Page introuvable" };

  const incoming = parsed.data.filter((b) => isBlockType(b.type));
  const keepIds = incoming.filter((b) => b.id).map((b) => b.id!);
  await ctx.db.contentBlock.deleteMany({ where: { pageId, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) } as never });

  for (let i = 0; i < incoming.length; i++) {
    const b = incoming[i]!;
    const props = parseBlockProps(b.type, b.props);
    if (b.id) {
      await ctx.db.contentBlock.update({ where: { id: b.id } as never, data: { type: b.type, isEnabled: b.isEnabled, position: i, props: props as never } as never });
    } else {
      await ctx.db.contentBlock.create({ data: { pageId, type: b.type, isEnabled: b.isEnabled, position: i, props: props as never } as never });
    }
  }

  await audit({ action: "content.blocks", entityType: "Page", entityId: pageId, entityLabel: (page as { title: string }).title });
  revalidatePath("/contenu");
  return { ok: true };
}

const pageSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2),
  slug: z.string().trim().optional().or(z.literal("")),
  kind: z.enum(["HOME", "STANDARD", "LEGAL", "FAQ", "CONTACT", "LANDING"]),
  isPublished: z.coerce.boolean(),
  body: z.string().optional().or(z.literal("")),
});

export async function savePageAction(input: unknown): Promise<ContentActionState & { id?: string }> {
  const ctx = await requirePermission("content:write");
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  const d = parsed.data;
  const slug = d.slug?.trim() || slugify(d.title);

  try {
    if (d.id) {
      await ctx.db.page.update({ where: { id: d.id } as never, data: { title: d.title, slug, kind: d.kind, isPublished: d.isPublished, body: d.body || null } as never });
      await audit({ action: "page.update", entityType: "Page", entityId: d.id, entityLabel: d.title });
      revalidatePath("/contenu");
      return { ok: true, id: d.id };
    }
    const page = await ctx.db.page.create({ data: { title: d.title, slug, kind: d.kind, isPublished: d.isPublished, body: d.body || null } as never });
    await audit({ action: "page.create", entityType: "Page", entityId: (page as { id: string }).id, entityLabel: d.title });
    revalidatePath("/contenu");
    return { ok: true, id: (page as { id: string }).id };
  } catch {
    return { ok: false, error: "Ce slug existe déjà." };
  }
}
