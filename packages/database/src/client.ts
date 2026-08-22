import { PrismaClient } from "./generated/client/index.js";

/**
 * Single PrismaClient per process. In dev, Next.js hot-reload would otherwise leak
 * a client per reload and exhaust the connection pool, so we cache on globalThis.
 */
const globalForPrisma = globalThis as unknown as { __opticPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__opticPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__opticPrisma = prisma;
}

export type { PrismaClient };
