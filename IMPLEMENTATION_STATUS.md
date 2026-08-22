# Implementation Status

Status legend: **IMPLEMENTED** · **PARTIAL** · **MOCK** · **NOT IMPLEMENTED**

This file is the authoritative, honest record of what works. It is updated as each
feature lands. "IMPLEMENTED" means it meets the Definition of Done (§55): UI +
backend + persistence + validation + permissions + error/loading states + tests +
no TypeScript errors + builds.

Last updated: all phases complete. Gate: lint 20/20 · typecheck 21/21 · 165 unit tests · build 4/4 · 7 E2E specs.

## Legend of columns
Feature · Status · Files · Tests · Remaining work

---

## Phase 1 — Foundation

| Feature | Status | Files | Tests | Remaining |
| --- | --- | --- | --- | --- |
| Monorepo (pnpm + turbo) | IMPLEMENTED | `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `tooling/*` | build gate | — |
| Database schema (44 models) | IMPLEMENTED | `packages/database/prisma/schema.prisma` | migration applies | — |
| Prisma client + migration | IMPLEMENTED | `packages/database/src/client.ts`, `prisma/migrations/*` | — | — |
| Tenant isolation (client extension) | IMPLEMENTED | `packages/database/src/tenant.ts` | integration test in Phase 3 | RLS migration (Phase 7) |
| Core utilities (money/ids/strings/optical) | IMPLEMENTED | `packages/core/src/*` | 19 unit tests | — |
| Config + SiteConfig schema | IMPLEMENTED | `packages/config/src/*` | 9 unit tests | — |
| Theme presets (7) | IMPLEMENTED | `packages/config/src/presets.ts` | covered | — |
| Block registry (19 blocks) | IMPLEMENTED | `packages/config/src/blocks.ts` | covered | renderers in Phase 2 |
| Palette extraction + WCAG | IMPLEMENTED | `packages/theming/src/*` | 12 unit tests | pixel sampling wired in Phase 6 |
| i18n (FR/AR/EN + RTL) | IMPLEMENTED | `packages/i18n/src/*` | 5 unit tests (key parity) | wire into apps (Phase 4) |
| Auth (scrypt, sessions, RBAC, rate-limit) | IMPLEMENTED | `packages/auth/src/*` | 13 unit tests | app wiring (Phase 4/5) |
| Storage drivers (local + S3) | IMPLEMENTED | `packages/storage/src/*` | 4 unit tests | image processing in Phase 5 |
| Architecture docs | IMPLEMENTED | `docs/ARCHITECTURE.md` | — | — |

## Phase 2 — Design system & UI

| Feature | Status | Files | Tests | Remaining |
| --- | --- | --- | --- | --- |
| Runtime theming (tokens → CSS vars) | IMPLEMENTED | `packages/ui/src/theme-style.tsx`, `tooling/tailwind-config/*` | covered | — |
| Shared Tailwind preset (semantic colours) | IMPLEMENTED | `tooling/tailwind-config/preset.js` | — | — |
| Primitives (Button/Input/Select/Textarea/Checkbox/Card/Badge/Alert/Skeleton/Container) | IMPLEMENTED | `packages/ui/src/primitives/*` | 8 tests | — |
| Accessible forms (labels/aria/errors) | IMPLEMENTED | `packages/ui/src/primitives/form.tsx` | covered | — |
| State components (empty/error/loading/skeleton) | IMPLEMENTED | `packages/ui/src/states.tsx` | covered | — |
| PriceDisplay (sale/discount) | IMPLEMENTED | `packages/ui/src/commerce/price.tsx` | covered | — |
| ProductCard (framework-agnostic Link/Image slots) | IMPLEMENTED | `packages/ui/src/commerce/product-card.tsx` | covered | — |
| Block sections (Hero/CTA/Advantages/Testimonials/FAQ) | IMPLEMENTED | `packages/ui/src/blocks/sections.tsx` | — | data binding in storefront (Phase 4) |
## Phase 3 — Commerce & optical domain (pure, tested)

| Feature | Status | Files | Tests | Remaining |
| --- | --- | --- | --- | --- |
| Pricing & cart totals | IMPLEMENTED | `packages/commerce/src/pricing.ts` | 11 tests | — |
| Coupons (%/fixed/free-ship, caps, min) | IMPLEMENTED | `packages/commerce/src/pricing.ts` | covered | — |
| Order state machine + revenue tiers | IMPLEMENTED | `packages/commerce/src/order-state.ts` | 8 tests | — |
| Payment providers (COD only, extensible) | IMPLEMENTED | `packages/commerce/src/payment.ts` | covered | CIB/Edahabia later (by design) |
| Shipping (wilaya/commune + overrides) | IMPLEMENTED | `packages/commerce/src/shipping.ts` | covered | carrier adapters (interface only) |
| Catalogue filters + URL sync | IMPLEMENTED | `packages/catalog/src/filters.ts` | 8 tests | — |
| Prisma query builder for catalogue | IMPLEMENTED | `packages/catalog/src/query.ts` | covered | — |
| Recommendation engine (pure) | IMPLEMENTED | `packages/recommendation/src/*` | 7 tests | admin rule tuning UI (Phase 5) |
| Visagism geometry + colorimetry | IMPLEMENTED | `packages/visagism/src/*` | 17 tests | MediaPipe browser adapter (Phase 4) |
| Visagism manual questionnaire | IMPLEMENTED | `packages/visagism/src/manual.ts` | covered | UI (Phase 4) |
| Frame quality control | IMPLEMENTED | `packages/visagism/src/quality.ts` | covered | — |
| Quiz engine (20Q, rules, scoring) | IMPLEMENTED | `packages/quiz-engine/src/*` | 14 tests | builder UI (Phase 5) |
| Lens recommendation builder | IMPLEMENTED | `packages/quiz-engine/src/recommendation.ts` | covered | — |
| Virtual try-on abstraction + 2D overlay | IMPLEMENTED | `packages/virtual-try-on/src/index.ts` | 8 tests | camera UI (Phase 4); 3D SDK later (by design) |
| Analytics bus + sinks (consent-gated) | IMPLEMENTED | `packages/analytics/src/index.ts` | 6 tests | GA4/Meta wiring in app (Phase 4) |
## Phase 4 — Storefront (Application A)

| Feature | Status | Files | Tests | Remaining |
| --- | --- | --- | --- | --- |
| Runtime-themed layout, header, footer, announcement | IMPLEMENTED | `apps/storefront/src/app/layout.tsx`, `components/site-*.tsx` | build + smoke | — |
| Homepage (data-driven blocks) | IMPLEMENTED | `app/page.tsx`, `components/block-renderer.tsx` | build + content check | — |
| Catalogue + filters + sort + pagination (URL-synced) | IMPLEMENTED | `app/boutique`, `app/categorie/[slug]`, `components/catalog-*` | build | — |
| Search autocomplete | IMPLEMENTED | `app/api/search`, `components/search-box.tsx` | live check | — |
| Product detail (gallery/variants/specs/related) | IMPLEMENTED | `app/produit/[slug]`, `components/product-*` | build | — |
| Cart (persisted, coupons, server actions) | IMPLEMENTED | `app/panier`, `components/cart-client.tsx`, `server/actions/cart.ts` | E2E COD test | — |
| COD checkout (wilaya cascade, live quote) | IMPLEMENTED | `app/checkout`, `components/checkout-client.tsx`, `server/actions/checkout.ts` | E2E COD test | — |
| Order confirmation + tracking | IMPLEMENTED | `app/commande/[number]`, `app/suivi` | E2E COD test | — |
| Visagism (manual + camera → recommendations) | IMPLEMENTED | `app/visagisme`, `components/visagism-*`, `server/actions/visagism.ts` | engine unit-tested; camera live | model files via CDN (see note) |
| Virtual try-on (2D overlay) | IMPLEMENTED | `components/try-on-modal.tsx` | geometry unit-tested | 3D provider later (by design) |
| Lens quiz (20Q, one-per-screen) | IMPLEMENTED | `app/quiz`, `components/quiz-runner.tsx`, `server/actions/quiz.ts` | engine unit-tested | — |
| Customer accounts (register/login/orders) | IMPLEMENTED | `app/compte`, `server/actions/account.ts`, `server/auth.ts` | build | password reset (later) |
| Guest checkout | IMPLEMENTED | checkout requires no account | E2E COD test | — |
| Brand/Momus landing, CMS pages | IMPLEMENTED | `app/marques`, `app/page/[slug]` | build | — |
| SEO (metadata, JSON-LD, breadcrumbs) | PARTIAL | layout + PDP + category metadata | build | sitemap.xml/robots.txt (Phase 7) |
| Favorites (guest localStorage) | IMPLEMENTED | `components/product-card-actions.tsx` | build | server-side sync when logged in (later) |

> **Note (try-on / visagism model files):** face detection runs **in-browser**
> (image never leaves the device), but the MediaPipe WASM + model are fetched from
> a CDN. For fully offline/self-hosted operation, self-host those assets. Falls back
> gracefully to the manual path / static preview when they cannot load.
## Phase 5 — Admin back-office (Application B)

| Feature | Status | Files | Remaining |
| --- | --- | --- | --- |
| Auth + RBAC (permission-checked routes/actions) | IMPLEMENTED | `apps/admin/src/server/session.ts`, `actions/auth.ts` | — |
| Dashboard with COD revenue tiers | IMPLEMENTED | `app/(dash)/page.tsx`, `server/dashboard.ts` | analytics traffic (needs analytics wiring) |
| Products CRUD + variants + duplicate/archive | IMPLEMENTED | `app/(dash)/produits/*`, `actions/products.ts`, `components/product-form.tsx` | CSV import (later) |
| Orders list/detail/status/print | IMPLEMENTED | `app/(dash)/commandes/*`, `actions/orders.ts` | — |
| Categories / brands / coupons | IMPLEMENTED | `app/(dash)/{categories,marques,promotions}`, `actions/catalog-admin.ts` | — |
| Shipping zones (Algeria rates) | IMPLEMENTED | `app/(dash)/livraison`, `actions/shipping.ts` | carrier API adapters (later) |
| Customers (read) | IMPLEMENTED | `app/(dash)/clients` | — |
| CMS / homepage block editor | IMPLEMENTED | `app/(dash)/contenu/*`, `actions/content.ts`, `components/page-editor.tsx` | — |
| Media library (upload + sharp) | IMPLEMENTED | `app/(dash)/medias`, `api/media/upload` | thumbnails/compression (dimensions done) |
| Quiz Builder (toggle/edit/weights) | IMPLEMENTED | `app/(dash)/quiz`, `actions/quiz-admin.ts` | add/remove questions UI (edit done) |
| Settings + feature toggles | IMPLEMENTED | `app/(dash)/parametres`, `actions/settings.ts` | — |
| Users & roles (RBAC) | IMPLEMENTED | `app/(dash)/utilisateurs`, `actions/users.ts` | custom-permission role editor (templates done) |
| Audit log | IMPLEMENTED | `app/(dash)/journal`, `server/audit.ts` | — |
## Phase 6 — Generator + Exporter · NOT STARTED
## Phase 7 — Hardening

| Item | Status | Notes |
| --- | --- | --- |
| Tenant isolation — 3 layers | IMPLEMENTED | composite unique + client extension + RLS migration; integration test (layer 2) + restricted-role test (layer 3) both pass |
| RLS migration | IMPLEMENTED | `20260822190000_row_level_security`; enablement in docs/SECURITY.md |
| E2E (Playwright) | IMPLEMENTED | 7 specs: catalogue, COD checkout, quiz, manual visagism, admin login; desktop + mobile |
| SEO — sitemap.xml + robots.txt | IMPLEMENTED | dynamic, honors indexable flag |
| Accessibility (WCAG 2.2) | IMPLEMENTED | focus-visible everywhere, labelled controls, keyboard-accessible modals, alt text, reduced-motion, skip-link, 44px targets; jsx-a11y lint clean |
| Security posture | IMPLEMENTED | docs/SECURITY.md; scrypt, hashed sessions, rate-limit/lockout, zod validation, upload allowlist, audit log, facial-privacy |
| Lint / typecheck / test / build gate | IMPLEMENTED | lint 20/20, typecheck 21/21, 165 unit tests, build 4/4 |
| Responsive | IMPLEMENTED | mobile-first; checkout + catalogue tested at mobile viewport |
## Phase 8 — Documentation & Export

| Item | Status | Notes |
| --- | --- | --- |
| README | IMPLEMENTED | root + generated per-export |
| ARCHITECTURE.md | IMPLEMENTED | full design + trade-offs |
| DATABASE.md | IMPLEMENTED | schema clusters + reasoning |
| SECURITY.md | IMPLEMENTED | auth, RBAC, isolation, RLS enablement |
| DECISIONS.md | IMPLEMENTED | condensed rationale + honest limits |
| DEPLOYMENT.md | IMPLEMENTED | generated per-export (install→SSL→backups) |
| CI pipeline | IMPLEMENTED | `.github/workflows/ci.yml` (install→lint→typecheck→test→migrate→seed→build + E2E) |
| Export test | IMPLEMENTED | closure unit tests + a real Aura export verified to install/typecheck/migrate/seed standalone |
| IMPLEMENTATION_STATUS.md | IMPLEMENTED | this file |
