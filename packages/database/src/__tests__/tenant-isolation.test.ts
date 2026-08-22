import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../client.js";
import { tenantClient } from "../tenant.js";

/**
 * Integration test for tenant isolation — layer 2 (the Prisma client extension).
 * Requires a live database (DATABASE_URL). Skipped automatically if unreachable so unit
 * CI without a DB still passes; the CI 'verify' job provides Postgres.
 */
let dbAvailable = true;
const A = "tenant-test-a";
const B = "tenant-test-b";
let idA = "";
let idB = "";

beforeAll(async () => {
  // Skip when there is no reachable database OR no schema yet (e.g. `test:unit`
  // run before migrations): both raise here and mark the suite unavailable.
  try {
    await prisma.$queryRaw`SELECT 1`;
    // Clean any prior run.
    await prisma.website.deleteMany({ where: { slug: { in: [A, B] } } });
    const a = await prisma.website.create({ data: { slug: A, name: "A", updatedAt: new Date() } });
    const b = await prisma.website.create({ data: { slug: B, name: "B", updatedAt: new Date() } });
    idA = a.id;
    idB = b.id;
    await prisma.product.create({ data: { websiteId: idA, sku: "A-1", slug: "a-1", name: "Product A", priceCents: 1000, updatedAt: new Date() } });
    await prisma.product.create({ data: { websiteId: idB, sku: "B-1", slug: "b-1", name: "Product B", priceCents: 2000, updatedAt: new Date() } });
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (dbAvailable) await prisma.website.deleteMany({ where: { slug: { in: [A, B] } } });
  await prisma.$disconnect();
});

describe("tenant isolation (client extension)", () => {
  it("scopes reads to the tenant", async () => {
    if (!dbAvailable) return;
    const dbA = tenantClient(idA);
    const products = await dbA.product.findMany({});
    expect(products.every((p) => (p as { websiteId: string }).websiteId === idA)).toBe(true);
    expect(products.some((p) => (p as { name: string }).name === "Product A")).toBe(true);
    expect(products.some((p) => (p as { name: string }).name === "Product B")).toBe(false);
  });

  it("cannot read another tenant's row even by its exact id", async () => {
    if (!dbAvailable) return;
    const foreign = await prisma.product.findFirst({ where: { websiteId: idB } });
    const dbA = tenantClient(idA);
    const found = await dbA.product.findFirst({ where: { id: foreign!.id } });
    expect(found).toBeNull(); // websiteId filter injected → no match
  });

  it("stamps websiteId on creates", async () => {
    if (!dbAvailable) return;
    const dbA = tenantClient(idA);
    const created = await dbA.category.create({ data: { slug: "cat-a", name: "Cat A" } as never });
    expect((created as { websiteId: string }).websiteId).toBe(idA);
  });

  it("rejects a query that targets a foreign websiteId", async () => {
    if (!dbAvailable) return;
    const dbA = tenantClient(idA);
    await expect(dbA.product.findMany({ where: { websiteId: idB } as never })).rejects.toThrow(/isolation/i);
  });

  it("cannot update another tenant's row", async () => {
    if (!dbAvailable) return;
    const foreign = await prisma.product.findFirst({ where: { websiteId: idB } });
    const dbA = tenantClient(idA);
    // Extended-where-unique injects websiteId → row doesn't match → P2025.
    await expect(dbA.product.update({ where: { id: foreign!.id } as never, data: { priceCents: 9999 } as never })).rejects.toThrow();
    const unchanged = await prisma.product.findUnique({ where: { id: foreign!.id } });
    expect(unchanged!.priceCents).toBe(2000);
  });
});
