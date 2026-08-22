import { NextResponse } from "next/server";
import { createStorage } from "@optic/storage";

/**
 * Serves media stored by the local driver (§27). When STORAGE_DRIVER=s3 this route is
 * unused (URLs point at the bucket/CDN directly). Path traversal is prevented by the
 * storage driver's safeKey.
 */
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if ((process.env.STORAGE_DRIVER ?? "local") !== "local") {
    return new NextResponse("Not found", { status: 404 });
  }
  const { path } = await params;
  const key = path.join("/");
  try {
    const storage = createStorage();
    const data = await storage.get(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
