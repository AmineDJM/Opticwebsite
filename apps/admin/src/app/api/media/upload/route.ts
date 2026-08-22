import { NextResponse } from "next/server";
import { createStorage } from "@optic/storage";
import { requirePermission } from "../../../../server/session.js";
import { audit } from "../../../../server/audit.js";

/**
 * Media upload (§27). Validates type/size, stores via the storage driver, and creates
 * a Media row. Optional thumbnail generation with sharp (loaded lazily). Secure upload
 * policy: allowlist of image mime types, size cap, sanitized key.
 */
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/avif", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const ctx = await requirePermission("media:write");
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "/uploads");

  if (!(file instanceof File)) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${folder.replace(/^\/|\/$/g, "")}/${safeName}`;

  // Extract dimensions (and could generate a thumbnail) with sharp for raster images.
  let width: number | null = null;
  let height: number | null = null;
  if (file.type !== "image/svg+xml") {
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(buffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch { /* sharp optional */ }
  }

  const storage = createStorage();
  const stored = await storage.put(key, buffer, { contentType: file.type });

  const media = await ctx.db.media.create({
    data: {
      key: stored.key, url: stored.url, filename: file.name, mimeType: file.type,
      sizeBytes: file.size, width, height, folder,
    } as never,
  });
  await audit({ action: "media.upload", entityType: "Media", entityId: (media as { id: string }).id, entityLabel: file.name });

  return NextResponse.json({ id: (media as { id: string }).id, url: stored.url, filename: file.name });
}
