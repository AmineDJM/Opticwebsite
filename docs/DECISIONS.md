# Technical decisions & trade-offs

A running log of the significant choices and *why*, so future maintainers understand the
reasoning rather than re-deriving it. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the
full picture; this is the condensed rationale, including the honest limits.

## Framework: Next.js 15 (App Router), not NestJS + SPA
SEO-critical, content-heavy commerce needs SSR. One framework for rendering + data removes
a network hop and a duplicated validation layer. `output: standalone` (opt-in) yields a
self-hostable server — no Vercel lock-in, which the export requirement demands. **Cost:**
business logic must be kept out of the framework — it lives in framework-agnostic
`packages/*` that import neither `next` nor `react`.

## Internal packages ship TypeScript source, not build output
`"exports": "./src/index.ts"` + `transpilePackages`. One less build step, exact types, and
— crucially — the exporter copies sources verbatim so exported code cannot drift from
previewed code. **Cost:** consumers must transpile; webpack needs `extensionAlias` to
resolve the ESM-correct `.js` specifiers to `.ts`.

## `@optic/core` barrel is browser-safe
`ids.ts` uses `node:crypto` (server-only), so it is exposed only via the `@optic/core/ids`
subpath and kept out of the main barrel. This lets client components import `formatMoney`,
optical constants, etc. without webpack trying to bundle `node:crypto`.

## Tenancy: shared schema + discriminator + defence in depth
Rejected database-per-tenant (operationally heavy for a generator making many brands, and
it breaks platform-level queries) and schema-per-tenant (no first-class Prisma support).
Chose `websiteId` on every table with three enforcement layers (composite uniqueness →
client extension → RLS). **Verified** by integration tests (layer 2) and a restricted-role
test (layer 3).

## Auth: first-party, no Auth0/Clerk/NextAuth
Requirements are exportability, no vendor, and RBAC. scrypt + hashed opaque sessions is
~200 lines, zero dependencies, and survives export. **Cost:** we own password/session
code — mitigated by keeping it small, standard, and unit-tested.

## Money as integer minor units
Floats never touch a price. All arithmetic goes through `@optic/core/money`. DZD renders
with no decimals by retail convention.

## Face analysis: MediaPipe in-browser, engine decoupled from camera
Chose MediaPipe Face Landmarker (WASM) over TensorFlow.js (heavier for the same model),
OpenCV.js (no dense landmarks) and hosted APIs (privacy + vendor). The **critical**
structural decision: `Analysis → RecommendationProfile → RecommendationEngine`. The engine
is a pure function of `(profile, products)`; camera and manual questionnaire are two
producers of the same profile, so refusing the camera loses nothing. **Limit (PARTIAL):**
the WASM + model files load from a public CDN by default; the *image never leaves the
device*, but full offline operation requires self-hosting those assets (documented in
DEPLOYMENT.md).

## Virtual try-on: honest 2-D overlay behind a provider interface
Built a real landmark-anchored 2-D overlay (scale/translate/roll from the interpupillary
axis) — what can truthfully be built from a product photo. Photorealistic 3-D needs
per-SKU 3-D assets that do not exist, so rather than fake it, `VirtualTryOnProvider` makes
swapping in a specialist SDK a configuration change. **Status: IMPLEMENTED (2-D); 3-D is a
future provider, by design.**

## Payments: COD only, `PaymentProvider` abstraction
V1 is cash on delivery per the brief. Checkout talks to a `PaymentProvider` interface;
`CashOnDeliveryProvider` is the only registered implementation. CIB/Edahabia/Stripe are a
new provider registration, not a checkout rewrite. Nothing speculative is implemented.

## No Redis in V1
Cart lives in the database keyed by a signed cookie; caching uses Next's data cache.
Redis is an optimisation to add when measurements demand it, not a day-one dependency
every self-hoster must operate. The rate limiter is in-memory (single-node default) behind
a small interface that can be backed by Redis later.

## Storage: driver abstraction, local default
`@optic/storage` exposes `put/get/delete/url/list`. Local disk is the default so a
self-hoster needs only a volume; the S3 driver (lazy-loaded SDK) covers MinIO/R2/S3/etc.

## Quiz & categories are data, not code
The 20-question quiz and the category tree are seeded data, fully editable in the admin.
The storefront never hardcodes a category or a question. This is what lets one engine serve
many brands with different catalogues.

## Admin uses a fixed neutral theme
The operator UI is not brand-themed — it is the same for every brand's back-office. Only
the storefront consumes the per-brand runtime tokens.

## Known limits (honest status)
Tracked authoritatively in [`../IMPLEMENTATION_STATUS.md`](../IMPLEMENTATION_STATUS.md) with
`IMPLEMENTED / PARTIAL / MOCK / NOT IMPLEMENTED`. Notable PARTIALs: CSV product import (UI
not built; model ready), carrier API adapters (interface only), face-model self-hosting
(CDN by default), quiz add/remove-question UI (edit + weights done), custom-permission role
editor (templates done). Nothing is a MOCK — every feature marked IMPLEMENTED persists real
data and is exercised by tests or a verified scenario.
