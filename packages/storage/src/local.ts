import { mkdir, readFile, rm, stat, readdir, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { safeKey, type PutOptions, type StorageDriver, type StoredObject } from "./types.js";

/**
 * Local-disk driver. Files live under `dir`; public URLs are served by the app at
 * `publicUrl` (a Next.js route or a static mount). This is the zero-dependency
 * default used by dev and by exported single-tenant sites.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local";
  private readonly root: string;
  private readonly publicUrl: string;

  constructor(dir: string, publicUrl: string) {
    this.root = resolve(dir);
    this.publicUrl = publicUrl.replace(/\/$/, "");
  }

  private path(key: string): string {
    const safe = safeKey(key);
    const full = resolve(join(this.root, safe));
    // Defence in depth: ensure the resolved path stays under root.
    if (full !== this.root && !full.startsWith(this.root + "/")) {
      throw new Error("Path traversal detected");
    }
    return full;
  }

  async put(key: string, data: Buffer | Uint8Array, options?: PutOptions): Promise<StoredObject> {
    const full = this.path(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return {
      key: safeKey(key),
      url: this.url(key),
      size: data.byteLength,
      contentType: options?.contentType ?? "application/octet-stream",
    };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.path(key));
      return true;
    } catch {
      return false;
    }
  }

  url(key: string): string {
    return `${this.publicUrl}/${safeKey(key)}`;
  }

  async list(prefix: string): Promise<string[]> {
    const base = this.path(prefix);
    const out: string[] = [];
    const walk = async (dir: string, rel: string) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const childRel = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await walk(join(dir, entry.name), childRel);
        else out.push(`${safeKey(prefix)}/${childRel}`.replace(/^\/+/, ""));
      }
    };
    try {
      const s = await stat(base);
      if (s.isDirectory()) await walk(base, "");
    } catch {
      /* prefix does not exist yet */
    }
    return out;
  }
}
