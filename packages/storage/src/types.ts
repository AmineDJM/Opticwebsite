/**
 * Storage driver abstraction (§27). One interface, two drivers (local disk,
 * S3-compatible). The default is local so a self-hoster needs nothing but a volume.
 * Nothing in the app reaches for a specific driver — they call the resolved storage.
 */

export interface PutOptions {
  contentType?: string;
  cacheControl?: string;
  /** Public read (default true for media). */
  public?: boolean;
}

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageDriver {
  readonly name: string;
  put(key: string, data: Buffer | Uint8Array, options?: PutOptions): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Public URL for a stored object (no signing for public media). */
  url(key: string): string;
  list(prefix: string): Promise<string[]>;
}

export interface StorageConfig {
  driver: "local" | "s3";
  local?: { dir: string; publicUrl: string };
  s3?: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicUrl?: string;
    forcePathStyle?: boolean;
  };
}

/** Sanitise a caller-supplied key so it cannot escape the storage root. */
export function safeKey(key: string): string {
  const cleaned = key
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
  // Reject rather than silently rewrite anything that could climb out of the root.
  const segments = cleaned.split("/");
  if (segments.some((s) => s === "..") || cleaned.includes("\0")) {
    throw new Error("Invalid storage key");
  }
  return cleaned;
}
