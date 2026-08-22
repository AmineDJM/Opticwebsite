import { LocalStorageDriver } from "./local.js";
import { S3StorageDriver } from "./s3.js";
import type { StorageConfig, StorageDriver } from "./types.js";

export * from "./types.js";
export { LocalStorageDriver } from "./local.js";
export { S3StorageDriver } from "./s3.js";

/** Build the configured driver. Reads env when no explicit config is passed. */
export function createStorage(config?: StorageConfig): StorageDriver {
  const cfg = config ?? storageConfigFromEnv();
  if (cfg.driver === "s3") {
    if (!cfg.s3) throw new Error("STORAGE_DRIVER=s3 requires S3 configuration");
    return new S3StorageDriver(cfg.s3);
  }
  const local = cfg.local ?? { dir: "./var/storage", publicUrl: "/media" };
  return new LocalStorageDriver(local.dir, local.publicUrl);
}

export function storageConfigFromEnv(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const driver = (env.STORAGE_DRIVER as "local" | "s3") ?? "local";
  if (driver === "s3") {
    return {
      driver: "s3",
      s3: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION ?? "us-east-1",
        bucket: env.S3_BUCKET ?? "",
        accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
        publicUrl: env.STORAGE_PUBLIC_URL,
      },
    };
  }
  return {
    driver: "local",
    local: {
      dir: env.STORAGE_LOCAL_DIR ?? "./var/storage",
      publicUrl: env.STORAGE_PUBLIC_URL ?? "/media",
    },
  };
}
