import { safeKey, type PutOptions, type StorageConfig, type StorageDriver, type StoredObject } from "./types.js";

/**
 * S3-compatible driver (MinIO, R2, S3, Scaleway, OVH…). `@aws-sdk/client-s3` is
 * imported lazily so a local-only deployment never loads it. Public URLs assume a
 * public bucket / CDN in front (configured via `publicUrl`).
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3";
  private client: unknown;
  private readonly cfg: NonNullable<StorageConfig["s3"]>;

  constructor(cfg: NonNullable<StorageConfig["s3"]>) {
    this.cfg = cfg;
  }

  private async getClient() {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    if (this.client) return this.client as import("@aws-sdk/client-s3").S3Client;
    const { S3Client } = await import("@aws-sdk/client-s3");
    this.client = new S3Client({
      region: this.cfg.region,
      endpoint: this.cfg.endpoint,
      forcePathStyle: this.cfg.forcePathStyle ?? !!this.cfg.endpoint,
      credentials: { accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey },
    });
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    return this.client as import("@aws-sdk/client-s3").S3Client;
  }

  async put(key: string, data: Buffer | Uint8Array, options?: PutOptions): Promise<StoredObject> {
    const client = await this.getClient();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const safe = safeKey(key);
    await client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: safe,
        Body: Buffer.from(data),
        ContentType: options?.contentType,
        CacheControl: options?.cacheControl,
        ACL: options?.public === false ? "private" : "public-read",
      }),
    );
    return {
      key: safe,
      url: this.url(safe),
      size: data.byteLength,
      contentType: options?.contentType ?? "application/octet-stream",
    };
  }

  async get(key: string): Promise<Buffer> {
    const client = await this.getClient();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const res = await client.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: safeKey(key) }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: safeKey(key) }));
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      await client.send(new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: safeKey(key) }));
      return true;
    } catch {
      return false;
    }
  }

  url(key: string): string {
    const safe = safeKey(key);
    if (this.cfg.publicUrl) return `${this.cfg.publicUrl.replace(/\/$/, "")}/${safe}`;
    if (this.cfg.endpoint) return `${this.cfg.endpoint.replace(/\/$/, "")}/${this.cfg.bucket}/${safe}`;
    return `https://${this.cfg.bucket}.s3.${this.cfg.region}.amazonaws.com/${safe}`;
  }

  async list(prefix: string): Promise<string[]> {
    const client = await this.getClient();
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const out: string[] = [];
    let token: string | undefined;
    do {
      const res = await client.send(
        new ListObjectsV2Command({ Bucket: this.cfg.bucket, Prefix: safeKey(prefix), ContinuationToken: token }),
      );
      for (const obj of res.Contents ?? []) if (obj.Key) out.push(obj.Key);
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out;
  }
}
