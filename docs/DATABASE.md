# Database

PostgreSQL + Prisma. The full schema is `packages/database/prisma/schema.prisma`; this
document explains the clusters and the reasoning. See [`ARCHITECTURE.md`](./ARCHITECTURE.md)
§4 for the multi-tenancy model and [`SECURITY.md`](./SECURITY.md) for RLS.

## Conventions

- **IDs:** `cuid()` primary keys everywhere except reference data (`Wilaya.code`).
- **Money:** integers in the currency's minor unit (santeem/cents). Never floats.
- **Tenancy:** every business table carries `websiteId` with `ON DELETE CASCADE` to
  `Website`. Uniqueness is always composite with `websiteId`.
- **Timestamps:** `createdAt` default now, `updatedAt` `@updatedAt`.
- **Open-ended data:** `jsonb` for theme tokens, block props, quiz rules, SEO — validated
  by zod at the application boundary, not by the database.

## Clusters

### Platform
`Website` is the tenant root. `Theme` (design tokens), `SiteSettings` (identity, contact,
socials, commerce policy, SEO, announcement), `Domain` (hostnames), `FeatureFlag`, and
`AnalyticsConfiguration` hang off it 1:1 / 1:N. These are what make a brand a brand.

### Identity & access
`User` (admin/platform accounts) ↔ `Website` via `Membership` (exactly one `Role` per
website). `Role.permissions` is a string array of `resource:action`; `websiteId = null`
marks a system template. `Session` stores only a token **hash**. `Customer` and
`CustomerSession` are the storefront-side equivalents, scoped per website with unique
`(websiteId, email)` and `(websiteId, phone)`.

### Catalogue
`Category` is a self-referential tree with a `kind` discriminator (frames/sunglasses/
lenses…) so generic logic can adapt without hardcoding slugs. `Brand` carries the
`isExclusive` flag (Momus is data, not code). `Product` holds the rich optical model —
frame geometry, lens compatibility, and the visagism matching tags
(`recommendedFaceShapes`, `recommendedColors`, `avoidFaceShapes`, `styleProfiles`) the
recommendation engine reads. `ProductVariant` owns stock with a `reserved` counter
(available = stock − reserved) for COD reservations. `ProductImage` links `Media` with a
`kind` (main/front/profile/…). `StockMovement` is the stock ledger.

### Cart & orders
`Cart`/`CartItem` persist the basket keyed by a signed cookie token, capturing unit price
at add-time (re-validated at checkout). `Order`/`OrderItem` denormalise product name/sku
so an order stays readable after a product is deleted. `OrderStatusHistory` records every
transition with actor. Order status, payment method/status and delivery method are enums.
`Coupon` supports percentage/fixed/free-shipping with caps, minimums and usage limits.

### Logistics (Algeria)
`Wilaya` (58) and `Commune` are **global** reference data shared by every brand — not
duplicated per tenant. `ShippingZone` groups wilayas per brand with home/desk rates, a
free-shipping threshold, delivery estimate, carrier key and COD flag;
`ShippingZoneWilaya` allows per-wilaya overrides.

### Optical features
`Quiz` → `QuizSection` → `QuizQuestion` → `QuizOption` (with scoring `weights`), plus
`QuizRule` for conditional scoring. `QuizResult` stores anonymous outcomes.
`VisagismProfile` stores the **abstract** profile only (never an image). `RecommendationRule`
lets a brand tune the visagism engine. `Favorite` is the wishlist.

### Operations
`Media` (with composite-unique `key`), `Page` → `ContentBlock` (the page builder),
`Menu`/`MenuItem`, `AuditLog` (sensitive-action trail), `NewsletterSubscriber`,
`ContactMessage`, and `ExportJob` (export history).

## Indexes

Hot read paths are indexed: `Product(websiteId, status, publishedAt)`, plus per-flag
indexes (`isFeatured`, `isBestseller`, `isNew`, `priceCents`); `Order(websiteId, status,
createdAt)` and `(websiteId, phone)`; `ProductVariant(websiteId, stock)` for low-stock;
`Session/CustomerSession(expiresAt)` for cleanup. Every foreign key used in a filter is
indexed.

## Migrations

- `20260822175435_init` — the full schema.
- `20260822190000_row_level_security` — RLS policies (opt-in, see SECURITY.md).

Apply with `pnpm db:migrate:deploy`. In development, `pnpm db:migrate` creates new
migrations from schema changes. Never edit an applied migration; add a new one.

## Seeding

`pnpm db:seed` runs `prisma/seed.ts` (Aura Optique demo). The exported project ships a
data-driven `seed.export.ts` that loads `site/seed.json` via the shared
`loadSiteFromConfig` loader (`packages/database/src/seed-loader.ts`).
