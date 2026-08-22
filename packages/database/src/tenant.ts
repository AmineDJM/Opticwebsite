import { prisma } from "./client.js";

/**
 * Tenant isolation — layer 2 of the defence in depth described in
 * docs/ARCHITECTURE.md §4 (layer 1 = composite unique constraints, layer 3 = RLS).
 *
 * `tenantClient(websiteId)` returns a Prisma client that:
 *   - injects `websiteId` into the `where` of every read on a tenant-scoped model;
 *   - injects `websiteId` into the `data` of every create;
 *   - refuses any query whose `where`/`data` tries to target a *different* websiteId.
 *
 * Application code therefore cannot forget the tenant filter, because it never
 * writes it. Platform-level tables (Website, User, Wilaya, …) are not scoped and
 * must be accessed through the raw `prisma` client from a platform context only.
 */

/** Models that carry a `websiteId` column and must always be tenant-filtered. */
export const TENANT_MODELS = new Set<string>([
  "Domain",
  "Theme",
  "SiteSettings",
  "FeatureFlag",
  "AnalyticsConfiguration",
  "Membership",
  "Role",
  "Customer",
  "Category",
  "Brand",
  "Collection",
  "Product",
  "ProductVariant",
  "StockMovement",
  "Media",
  "Page",
  "ContentBlock",
  "Menu",
  "Cart",
  "Order",
  "Coupon",
  "ShippingZone",
  "Quiz",
  "QuizResult",
  "VisagismProfile",
  "RecommendationRule",
  "Favorite",
  "AuditLog",
  "NewsletterSubscriber",
  "ContactMessage",
  "ExportJob",
]);

/** Operations that accept a `where` we should constrain. */
const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "updateMany",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** Operations that write a row and must stamp `websiteId`. */
const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);
const UPSERT_OPS = new Set(["upsert"]);
const SINGLE_MUTATION_OPS = new Set(["update", "delete"]);

function assertNoForeignTenant(value: unknown, websiteId: string, model: string) {
  if (value && typeof value === "object" && "websiteId" in value) {
    const provided = (value as { websiteId?: unknown }).websiteId;
    if (typeof provided === "string" && provided !== websiteId) {
      throw new Error(
        `Tenant isolation violation: attempted to access ${model} of website ${provided} from tenant ${websiteId}.`,
      );
    }
  }
}

export type TenantClient = ReturnType<typeof tenantClient>;

export function tenantClient(websiteId: string) {
  if (!websiteId) throw new Error("tenantClient requires a websiteId");

  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) {
            return query(args);
          }

          const a = (args ?? {}) as Record<string, unknown>;

          if (WHERE_OPS.has(operation)) {
            const where = (a.where ?? {}) as Record<string, unknown>;
            assertNoForeignTenant(where, websiteId, model);
            a.where = { ...where, websiteId };
          }

          if (CREATE_OPS.has(operation)) {
            const data = a.data;
            if (Array.isArray(data)) {
              a.data = data.map((row) => {
                assertNoForeignTenant(row, websiteId, model);
                return { ...(row as object), websiteId };
              });
            } else if (data && typeof data === "object") {
              assertNoForeignTenant(data, websiteId, model);
              a.data = { ...(data as object), websiteId };
            }
          }

          if (UPSERT_OPS.has(operation)) {
            const where = (a.where ?? {}) as Record<string, unknown>;
            assertNoForeignTenant(where, websiteId, model);
            a.where = { ...where, websiteId };
            for (const key of ["create", "update"] as const) {
              const d = a[key];
              if (d && typeof d === "object") {
                assertNoForeignTenant(d, websiteId, model);
                a[key] = { ...(d as object), websiteId };
              }
            }
          }

          if (SINGLE_MUTATION_OPS.has(operation)) {
            // Prisma's "extended where unique" lets us add a non-unique `websiteId`
            // filter alongside the unique selector (e.g. `id`). A row belonging to
            // another tenant then simply does not match and Prisma throws P2025,
            // so a raw `{ where: { id } }` cannot reach across tenants.
            const where = (a.where ?? {}) as Record<string, unknown>;
            assertNoForeignTenant(where, websiteId, model);
            a.where = { ...where, websiteId };
          }

          return query(a);
        },
      },
    },
  });
}
