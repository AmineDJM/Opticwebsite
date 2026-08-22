# Optic Engine

> **One engine → multiple brands → multiple independent websites.**
> A generator of optical e-commerce websites. The first brand it produces is
> **Aura Optique**, but nothing in the codebase is specific to Aura — a brand is a
> *configuration* of the engine, and any brand can be **exported as a complete,
> self-hostable source tree** at any time.

## What this is

Three applications over one shared engine:

| App | Purpose | Dev port |
| --- | --- | --- |
| `apps/storefront` | The public optical shop (catalogue, PDP, cart, COD checkout, visagism, quiz, try-on). | 3000 |
| `apps/admin` | Per-brand back-office (products, orders, CMS, shipping, quiz builder, RBAC…). | 3001 |
| `apps/generator` | Super-admin: create a new brand from a wizard, preview it, and export its source code. | 3002 |

The engine itself lives in `packages/*` (pure domain logic, database, design system,
recommendation/visagism/quiz engines, storage, i18n, exporter).

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full design and the
trade-offs behind every technology choice, and
**[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** for the honest, per-feature
status.

## Quick start (local development)

Prerequisites: **Node ≥ 20.11**, **pnpm 10**, **PostgreSQL ≥ 14**.

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env            # then edit DATABASE_URL / APP_SECRET

# 3. Database
pnpm db:migrate:deploy          # apply migrations
pnpm db:seed                    # load the Aura Optique demo brand

# 4. Run everything
pnpm dev                        # storefront :3000, admin :3001, generator :3002
```

Demo credentials and demo data are printed by the seed and documented in
[docs/RENDER.md](docs/RENDER.md).

## Deploy online (Render)

One click puts the storefront + a managed PostgreSQL database online, with no
external services to configure — Render reads [`render.yaml`](render.yaml) and
provisions everything. Step-by-step guide (and how to add the admin back-office):
**[docs/RENDER.md](docs/RENDER.md)**.

## Common tasks

```bash
pnpm lint          # ESLint across the workspace
pnpm typecheck     # tsc --noEmit across the workspace
pnpm test          # unit + integration (Vitest)
pnpm test:e2e      # Playwright end-to-end
pnpm build         # production build of all apps
pnpm export:site   # export a brand's source code (see generator UI too)
```

## Repository layout

```
apps/         storefront · admin · generator
packages/     core · config · theming · i18n · database · auth · commerce ·
              catalog · recommendation · visagism · quiz-engine ·
              virtual-try-on · analytics · storage · ui · exporter
tooling/      eslint-config · typescript-config · tailwind-config
docs/         ARCHITECTURE · DATABASE · SECURITY · RENDER · DECISIONS
e2e/          Playwright specs
```

## License

Proprietary — © the platform owner. Exported brand sites are delivered to their
owners under the terms agreed at export time.
