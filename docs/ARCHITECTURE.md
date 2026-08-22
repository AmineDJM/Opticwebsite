# Architecture — Optic Engine

> `ONE ENGINE → MULTIPLE BRANDS → MULTIPLE INDEPENDENT WEBSITES`

This document records the architecture, the technology choices and the trade-offs
behind them. It is the reference for every decision taken in the codebase; when
code and this document disagree, the code is the bug.

---

## 1. Problem statement

Build a **generator of optical e-commerce websites**. The generator owns the engine;
each brand (`Aura Optique`, `Vision Premium`, …) is a *configuration* of that engine,
never a fork of it. A brand must be able to leave the platform at any time with a
**complete, self-hostable source tree**.

Three consequences drive everything else:

| Requirement | Architectural consequence |
| --- | --- |
| One engine, many brands | Nothing brand-specific in code. All identity, theme, content, feature flags live in data. |
| Independent websites | Hard tenant isolation, enforced at the data layer, not the UI layer. |
| Exportable source code | The runtime must be a plain OSS stack with no proprietary service on the critical path. |

---

## 2. Technology choices and trade-offs

### 2.1 Runtime & framework — Next.js 15 (App Router) + React 19 + TypeScript

**Chosen** over NestJS + separate SPA.

- The product is content-heavy and SEO-critical (catalogue, product pages, brand pages).
  Server rendering with streaming is a requirement, not a nicety.
- A single framework covering rendering *and* the HTTP/data layer (Server Components,
  Server Actions, Route Handlers) removes an entire network hop and an entire
  duplicated validation layer.
- Deployment target is "any Linux box with Node + Postgres". `output: "standalone"`
  produces a self-contained server — no Vercel dependency. This directly serves the
  export requirement.

**Cost accepted:** business logic must be deliberately kept *out* of the framework.
It lives in framework-agnostic packages (`@optic/commerce`, `@optic/catalog`, …) that
import nothing from `next`. If Next.js ever has to be replaced, the domain survives.

**Version:** Next.js 15.5 rather than 16.x — the App Router surface is stable there and
the whole plugin/tooling ecosystem (ESLint config, Playwright, Tailwind) is proven
against it. Upgrading is a contained change; shipping on a churn surface is not.

### 2.2 Styling — Tailwind CSS 3.4 + CSS custom properties

Themes are **runtime data**, not build-time configuration: the generator writes a
palette into the database and the storefront must render it without a rebuild.

The design system therefore defines semantic tokens as CSS custom properties
(`--color-primary`, `--radius-md`, …) injected per request from the site's theme, and
Tailwind maps utilities onto those variables. One design system, N brands, zero
brand-specific CSS.

Tailwind 3 (not 4) because the `theme.extend` JS config is what allows a *shared*
`tooling/tailwind-config` package to be consumed by three apps and the exported project.

### 2.3 Database — PostgreSQL 16 + Prisma 6

Postgres for relational integrity, `jsonb` for the genuinely open-ended parts
(block props, theme tokens, quiz rules), partial and composite indexes, and full-text
search without a second datastore.

Prisma 6 (not 7) for the mature, non-adapter client API and stable migration workflow.
The dependency is contained: only `@optic/database` imports `@prisma/client`; every other
package receives repository functions or plain data.

**No Redis in V1.** Cart state lives in the database keyed by a signed cookie; caching
uses Next.js's own data cache. Redis is an optimisation to add when measurements demand
it, not a day-one dependency that every self-hoster must operate.

### 2.4 Authentication — first-party sessions

No Auth0/Clerk/NextAuth. Requirements are (a) exportable, (b) no vendor, (c) RBAC with
per-permission granularity, (d) works for both admin users and storefront customers.

- Password hashing: `scrypt` from `node:crypto` (N=2^16, r=8, p=1), random 16-byte salt,
  `timingSafeEqual` verification. Zero dependencies, FIPS-adjacent, no native build step.
- Sessions: 256-bit opaque tokens. Only the SHA-256 **hash** is stored, so a database
  leak does not yield usable sessions. `httpOnly` + `SameSite=Lax` + `Secure` cookies,
  sliding expiry with rotation.
- CSRF: Server Actions carry Next.js's origin check; classic route handlers use a
  double-submit token.

### 2.5 Face analysis — MediaPipe Face Landmarker, in-browser (WASM)

Evaluated: MediaPipe Tasks Vision, TensorFlow.js (`face-landmarks-detection`),
OpenCV.js, and hosted vision APIs.

| Option | Accuracy | Mobile perf | Privacy | Cost | Verdict |
| --- | --- | --- | --- | --- | --- |
| **MediaPipe Face Landmarker (WASM/WebGL)** | 478 3-D landmarks, production-grade | ~30 fps on mid-range phones | **Image never leaves the device** | Free | **Chosen** |
| TensorFlow.js | Comparable, wraps the same model | Heavier runtime, slower cold start | Local | Free | Rejected — more bundle for the same result |
| OpenCV.js | Haar/LBP only, no dense landmarks | Poor | Local | Free | Rejected — insufficient |
| Hosted vision API | High | N/A | **Face images sent to a third party** | Per-call | Rejected — violates §17 privacy-by-design and adds vendor lock-in |

**The critical structural decision** is that the recommendation engine does *not* depend
on any of this:

```
  ┌─────────────────┐     ┌──────────────────────┐     ┌────────────────────────┐
  │ FaceAnalysis    │ ──▶ │ RecommendationProfile│ ──▶ │ RecommendationEngine   │
  │ (camera/photo)  │     │  (plain data)        │     │ (pure, deterministic)  │
  └─────────────────┘     └──────────────────────┘     └────────────────────────┘
           ▲                          ▲
  ┌────────┴────────┐                 │
  │ Manual selection│ ────────────────┘
  └─────────────────┘
```

`@optic/recommendation` is a pure function of `(profile, products) → scored[]`. It has no
imports from the browser, the camera, or the DOM, and it is unit-tested in isolation.
Camera analysis and the manual questionnaire are two *producers* of the same
`RecommendationProfile`. A user who refuses the camera gets the identical engine.

### 2.6 Virtual try-on — provider abstraction, one real built-in provider

`VirtualTryOnProvider` is an interface. The built-in provider is an honest **2-D
landmark-anchored overlay**: it computes scale, translation and roll from the interpupillary
axis and composites the frame's front-view asset onto the video frame. That is what can be
built truthfully from a product photograph.

Photorealistic 3-D try-on requires per-SKU 3-D assets that do not exist in the catalogue.
Rather than fake it, the architecture makes swapping in a specialist SDK a *configuration*
change: product pages call `useVirtualTryOn()`, never a vendor SDK.

### 2.7 Storage — driver abstraction (local disk | S3-compatible)

`@optic/storage` exposes `put/get/delete/url/list`. The local-disk driver is the default so
a self-hoster needs nothing but a volume; the S3 driver covers MinIO, Cloudflare R2, S3,
Scaleway, OVH. No code changes to switch.

### 2.8 Payments — `PaymentProvider` abstraction, only COD implemented

V1 for Aura Optique is **cash on delivery**. The checkout talks to a `PaymentProvider`
interface (`authorize / capture / void / refund / requiresRedirect`). `CashOnDeliveryProvider`
is the only registered implementation. Adding CIB / Edahabia / Stripe later is a new
provider registration, not a checkout rewrite. Nothing speculative is implemented.

---

## 3. Monorepo layout

```
apps/
  storefront/       Application A — public site        (Next.js, port 3000)
  admin/            Application B — brand back-office  (Next.js, port 3001)
  generator/        Application C — super-admin        (Next.js, port 3002)

packages/
  core/             Money, IDs, Result, slugify, errors, guards — zero deps but zod
  config/           SiteConfig schema (zod), feature flags, theme presets, block registry
  i18n/             Locale registry, dictionaries, RTL direction, formatters
  theming/          Design tokens, palette extraction from a logo, WCAG contrast
  database/         Prisma schema, migrations, tenant-scoped client, seeds
  auth/             Password hashing, sessions, RBAC, permission catalogue
  commerce/         Cart maths, pricing, coupons, order state machine, payment providers
  catalog/          Filter/facet/search query construction over the catalogue
  recommendation/   RecommendationProfile + scoring engine (pure)
  visagism/         Landmark geometry → face shape / colorimetry → profile (pure)
  quiz-engine/      Question graph, conditional rules, lens scoring (pure)
  virtual-try-on/   Provider interface + built-in 2-D overlay engine
  analytics/        Vendor-neutral event bus + GA4 / Meta / console sinks
  storage/          Media storage drivers
  ui/               Design system: primitives, commerce components, block renderer
  exporter/         Real source-tree export builder + zip

tooling/            eslint-config, typescript-config, tailwind-config
e2e/                Playwright specs
docs/               Architecture, database, security, deployment, decisions
```

**Layering rule (enforced by review and by dependency direction):**

```
apps  ─▶  ui  ─▶  domain packages  ─▶  core
apps  ─▶  database  ─▶  core
```

- Domain packages (`commerce`, `recommendation`, `quiz-engine`, `visagism`) **must not**
  import `@optic/database`, `next`, or `react`. They are pure and testable.
- `@optic/ui` **must not** import `@optic/database`. Components receive data.
- Only apps and `@optic/catalog` compose the two.

Internal packages ship **TypeScript source**, not build output (`"exports": "./src/index.ts"`
+ `transpilePackages`). One less build step, exact type information, and — crucially — the
export can copy sources verbatim.

---

## 4. Multi-tenancy

**Model: shared schema, discriminator column, defence in depth.**

Considered and rejected:

- *Database per tenant* — operationally heavy for a generator that may create dozens of
  brands, and makes the platform-level dashboard impossible without cross-database queries.
- *Schema per tenant* — Prisma has no first-class multi-schema tenancy; migrations become
  an N-way fan-out.

Every tenant-scoped table carries `websiteId` with `ON DELETE CASCADE` to `Website`.
Enforcement has three layers:

1. **`websiteId` in every uniqueness constraint.** `@@unique([websiteId, slug])`,
   `@@unique([websiteId, sku])`. Two brands can both own the product slug `momus-aura-01`.
2. **A Prisma client extension** (`tenantClient(websiteId)`) that injects `websiteId` into
   `where` on every read and into `data` on every write for tenant models, and *rejects*
   any query that tries to override it. Application code cannot forget the filter because
   it never writes it. See `packages/database/src/tenant.ts`.
3. **PostgreSQL Row-Level Security** on tenant tables, keyed on
   `current_setting('app.website_id')`. Shipped as an explicit migration and applied to a
   restricted role. This is the layer that survives a bug in layer 2. See
   [`SECURITY.md`](./SECURITY.md) for how to enable it.

The storefront and admin apps resolve exactly one tenant per request (from `SITE_SLUG`,
or from the `Host` header in multi-tenant hosting mode) and never construct an unscoped
client. Only the generator app uses the platform client, and only for platform-level
tables (`Website`, `Domain`, `Theme`, platform users).

---

## 5. Configuration model — what makes a brand a brand

A website is fully described by rows in `Website`, `Theme`, `SiteSetting`, `Page`,
`ContentBlock`, plus its catalogue. The engine reads them; it never branches on brand.

```
Website ─┬─ Theme        (tokens: palette, typography, radius, density, presets)
         ├─ Domain[]     (hostnames, primary flag)
         ├─ SiteSetting  (identity, contact, socials, currency, locales, shipping policy)
         ├─ FeatureFlag[](visagism, tryOn, quiz, coupons, reviews, accounts, …)
         ├─ Page[] ── ContentBlock[]   (homepage and CMS pages, ordered, typed props)
         └─ everything commerce (categories, brands, products, orders, …)
```

`@optic/config` defines the zod schema for the serialisable form of all of this
(`SiteConfig`). The same schema is used by the generator wizard, by the export writer and
by the seed loader — one source of truth, validated at every boundary.

---

## 6. Export strategy

> The single most important non-negotiable: an exported site must run with no
> connection back to this platform.

Because internal packages are plain TypeScript sources and the apps are ordinary Next.js
apps, **an export is a pruned copy of the real monorepo** plus generated data. Nothing is
re-implemented for export, so the exported code cannot drift from the code that was
previewed.

`@optic/exporter` performs:

1. **Closure resolution** — walk `dependencies` from `apps/storefront` and `apps/admin`
   through `workspace:*` links to compute the exact set of packages required. The
   generator app and its dependencies are excluded by construction.
2. **Source copy** — copy those directories with a deny-list (`node_modules`, `.next`,
   `.turbo`, `dist`, `coverage`). Files are copied byte-for-byte from disk.
3. **Manifest rewrite** — root `package.json` / `pnpm-workspace.yaml` / `turbo.json`
   narrowed to the copied set; `workspace:*` links preserved (they resolve inside the
   exported workspace).
4. **Data materialisation** — `site/site.config.json` (identity, theme, features, pages,
   blocks, SEO) and `site/seed.json` (categories, brands, products, variants, shipping
   zones, quiz, CMS content), both validated against `@optic/config` before writing.
5. **Assets** — every `Media` row referenced by the site copied into `public/media`.
6. **Ops files** — `.env.example` (documented, no secrets), `docker-compose.yml`,
   `Dockerfile`s, `README.md`, `DEPLOYMENT.md`, `ARCHITECTURE.md`.
7. **Zip** — deterministic archive written to `EXPORT_OUTPUT_DIR`.

The exported project is **single-tenant**: `SITE_SLUG` is pinned in `.env`, the tenancy
layer still runs (defence in depth is not removed), and the seed creates exactly one
`Website` row.

A test (`packages/exporter/src/__tests__`) runs a real export into a temporary directory
and asserts the closure is complete — that no copied `package.json` references a workspace
package that was not copied. That is the property that makes "give it to a developer" true.

---

## 7. Request lifecycle (storefront)

```
Request
  └─ middleware      → locale negotiation, direction (LTR/RTL), tenant hint
      └─ layout      → resolveTenant() → Website + Theme + Settings + FeatureFlags
          └─ <ThemeStyle>  → injects design tokens as CSS custom properties
              └─ page (Server Component)
                  └─ repository call on tenantClient(websiteId)
                      └─ domain package (pure) for pricing / filtering / scoring
                          └─ @optic/ui component (presentational)
```

Mutations go through Server Actions that: validate input with zod → check permissions →
call the tenant-scoped repository → write an `AuditLog` row when the action is sensitive →
revalidate the affected cache tags.

---

## 8. Testing strategy

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit | Vitest | Pure domain: money, cart maths, shipping, order state machine, coupons, visagism geometry, recommendation scoring, quiz rules, palette/contrast, config schema, export closure |
| Integration | Vitest + live Postgres | Tenant isolation, repositories, auth/session, order creation, stock movements |
| E2E | Playwright | Catalogue → PDP → cart → COD checkout → order; admin login → product edit → order status; quiz; manual visagism; generator wizard → export |

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` is the gate. CI runs exactly that.

---

## 9. Known limits (stated, not hidden)

See [`../IMPLEMENTATION_STATUS.md`](../IMPLEMENTATION_STATUS.md) for the authoritative
per-feature status using `IMPLEMENTED / PARTIAL / MOCK / NOT IMPLEMENTED`.
