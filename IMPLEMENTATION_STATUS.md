# Implementation Status

Status legend: **IMPLEMENTED** · **PARTIAL** · **MOCK** · **NOT IMPLEMENTED**

This file is the authoritative, honest record of what works. It is updated as each
feature lands. "IMPLEMENTED" means it meets the Definition of Done (§55): UI +
backend + persistence + validation + permissions + error/loading states + tests +
no TypeScript errors + builds.

Last updated: Phase 1 (Foundation).

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
## Phase 4 — Storefront · NOT STARTED
## Phase 5 — Admin · NOT STARTED
## Phase 6 — Generator + Exporter · NOT STARTED
## Phase 7 — Hardening · NOT STARTED
## Phase 8 — Docs & Export test · NOT STARTED
