import type { SiteConfig } from "@optic/config";

/**
 * Ops-file templates for the exported project. These make the export self-hostable by a
 * developer who has never seen the platform (§42): documented env, Docker, and step-by-
 * step README/DEPLOYMENT. Kept as functions of the site config so brand names are filled in.
 */

export function envExample(config: SiteConfig): string {
  return `# =============================================================================
# ${config.identity.name} — environment configuration
# Copy this file to \`.env\` and fill in the values. NEVER commit \`.env\`.
# =============================================================================

NODE_ENV=production

# --- Database (PostgreSQL) ---------------------------------------------------
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/${config.identity.slug.replace(/-/g, "_")}?schema=public"

# --- Application secret ------------------------------------------------------
# Generate with: openssl rand -base64 48
APP_SECRET="CHANGE_ME"

# --- Tenant (this is a single-brand deployment) ------------------------------
SITE_SLUG="${config.identity.slug}"
NEXT_PUBLIC_SITE_SLUG="${config.identity.slug}"

# --- Public URLs -------------------------------------------------------------
NEXT_PUBLIC_STOREFRONT_URL="https://www.example.com"
NEXT_PUBLIC_ADMIN_URL="https://admin.example.com"

# --- Media storage -----------------------------------------------------------
STORAGE_DRIVER="local"           # "local" or "s3"
STORAGE_LOCAL_DIR="./var/storage"
STORAGE_PUBLIC_URL="/media"
# For S3-compatible storage (MinIO, R2, S3, Scaleway…):
# STORAGE_DRIVER="s3"
# S3_ENDPOINT="https://s3.example.com"
# S3_REGION="us-east-1"
# S3_BUCKET="${config.identity.slug}-media"
# S3_ACCESS_KEY_ID=""
# S3_SECRET_ACCESS_KEY=""
# STORAGE_PUBLIC_URL="https://cdn.example.com"
`;
}

export function readme(config: SiteConfig): string {
  return `# ${config.identity.name}

${config.identity.tagline ? `> ${config.identity.tagline}\n` : ""}
An independent optical e-commerce website. This is a **complete, self-hostable** source
tree — it does not depend on the platform that generated it. Hand it to any developer and
they can install, host and operate it.

## What's inside

| App | Purpose | Dev port |
| --- | --- | --- |
| \`apps/storefront\` | The public shop (catalogue, PDP, cart, cash-on-delivery checkout, visagism, quiz, try-on). | 3000 |
| \`apps/admin\` | The back-office (products, orders, CMS, shipping, settings, RBAC…). | 3001 |

The engine lives in \`packages/*\` (domain logic, database, design system, storage, i18n).
Your brand's identity, theme, content and catalogue are **data** in \`site/\`.

## Requirements

- **Node.js ≥ 20.11**
- **pnpm 10** (\`corepack enable\` then \`corepack prepare pnpm@10 --activate\`)
- **PostgreSQL ≥ 14**

## Install & run (development)

\`\`\`bash
pnpm install
cp .env.example .env            # then edit DATABASE_URL and APP_SECRET
pnpm db:migrate:deploy          # create the schema
pnpm db:seed                    # load ${config.identity.name}'s data (from site/seed.json)
pnpm dev                        # storefront :3000, admin :3001
\`\`\`

Open http://localhost:3000 for the shop and http://localhost:3001 for the admin. Create
the first admin user with \`pnpm create:admin\` (see below) if the seed did not create one.

## Production

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full production guide (build, run,
domain, SSL, media storage, backups) and the included Docker setup.

## Commands

\`\`\`bash
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm build         # production build of both apps
pnpm db:migrate:deploy
pnpm db:seed
pnpm start:storefront
pnpm start:admin
\`\`\`

## Your data

- \`site/site.config.json\` — identity, theme, features, pages/blocks, SEO.
- \`site/seed.json\` — categories, brands, products, shipping zones, coupons, quiz, CMS.
- \`public/media/\` — your images.

Everything is editable in the admin at runtime; these files are the initial state.

## License

Delivered to the owner of ${config.identity.name}. See your agreement for terms.
`;
}

export function deployment(config: SiteConfig): string {
  return `# Deployment — ${config.identity.name}

This guide takes the exported project from zero to a production website.

## 1. Prerequisites

- A Linux server (or container host) with Node.js ≥ 20.11 and pnpm 10, **or** Docker.
- A PostgreSQL 14+ database (managed or self-hosted).
- A domain name and TLS certificate (Let's Encrypt is fine).

## 2. Configuration

\`\`\`bash
cp .env.example .env
\`\`\`

Set at least:
- \`DATABASE_URL\` — your PostgreSQL connection string.
- \`APP_SECRET\` — \`openssl rand -base64 48\`.
- \`NEXT_PUBLIC_STOREFRONT_URL\`, \`NEXT_PUBLIC_ADMIN_URL\` — your public URLs.
- Storage: keep \`STORAGE_DRIVER=local\` (a mounted volume) or configure S3.

## 3. Database

\`\`\`bash
pnpm install --prod=false
pnpm db:migrate:deploy      # apply migrations
pnpm db:seed                # load initial data (idempotent)
\`\`\`

## 4. Build & start

\`\`\`bash
pnpm build
pnpm start:storefront &     # serves :3000
pnpm start:admin &          # serves :3001
\`\`\`

Run under a process manager (systemd, pm2) or use the Docker setup below.

## 5. Docker (recommended)

\`\`\`bash
docker compose up -d --build
\`\`\`

\`docker-compose.yml\` starts PostgreSQL, runs migrations + seed, and serves both apps.
Edit the environment section for your secrets, then point a reverse proxy at the app ports.

## 6. Domain & SSL

Put a reverse proxy (Nginx, Caddy, Traefik) in front:
- \`www.your-domain.com\` → storefront (:3000)
- \`admin.your-domain.com\` → admin (:3001)

Caddy example (auto-HTTPS):

\`\`\`
www.your-domain.com {
  reverse_proxy localhost:3000
}
admin.your-domain.com {
  reverse_proxy localhost:3001
}
\`\`\`

## 7. Media storage

- **Local (default):** media lives in \`./var/storage\` and is served by the app at
  \`/media\`. Mount this as a persistent volume and include it in backups.
- **S3-compatible:** set \`STORAGE_DRIVER=s3\` and the \`S3_*\` variables. Point
  \`STORAGE_PUBLIC_URL\` at your bucket/CDN.

## 8. Backups

- **Database:** \`pg_dump\` on a schedule (daily recommended). Test restores.
- **Media:** back up \`./var/storage\` (or rely on your S3 provider's durability).

## 9. Face-analysis assets (visagism / virtual try-on)

Face detection runs entirely in the visitor's browser (no image leaves the device). The
MediaPipe model files are fetched from a public CDN by default. For fully offline
operation, self-host those assets and update the URLs in
\`apps/storefront/src/components/visagism-camera.tsx\` and \`try-on-modal.tsx\`.

## 10. Payments

This site ships with **cash on delivery** only. Adding an online provider (CIB, Edahabia,
Stripe…) is a new \`PaymentProvider\` registration in \`packages/commerce\` — the checkout
does not need to change.
`;
}

export function dockerCompose(config: SiteConfig): string {
  const dbName = config.identity.slug.replace(/-/g, "_");
  return `# Docker Compose for ${config.identity.name}
# Edit the secrets, then: docker compose up -d --build
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: optic
      POSTGRES_PASSWORD: change_me
      POSTGRES_DB: ${dbName}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U optic"]
      interval: 5s
      timeout: 5s
      retries: 10

  migrate:
    build: { context: ., dockerfile: Dockerfile }
    command: sh -c "pnpm db:migrate:deploy && pnpm db:seed"
    environment:
      DATABASE_URL: postgresql://optic:change_me@db:5432/${dbName}?schema=public
    depends_on:
      db: { condition: service_healthy }

  storefront:
    build: { context: ., dockerfile: Dockerfile, args: { APP: storefront } }
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://optic:change_me@db:5432/${dbName}?schema=public
      APP_SECRET: change_me_openssl_rand_base64_48
      SITE_SLUG: ${config.identity.slug}
      NEXT_PUBLIC_SITE_SLUG: ${config.identity.slug}
      STORAGE_DRIVER: local
      STORAGE_LOCAL_DIR: /app/var/storage
      STORAGE_PUBLIC_URL: /media
    volumes:
      - media:/app/var/storage
    ports: ["3000:3000"]
    depends_on:
      migrate: { condition: service_completed_successfully }

  admin:
    build: { context: ., dockerfile: Dockerfile, args: { APP: admin } }
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://optic:change_me@db:5432/${dbName}?schema=public
      APP_SECRET: change_me_openssl_rand_base64_48
      SITE_SLUG: ${config.identity.slug}
      STORAGE_DRIVER: local
      STORAGE_LOCAL_DIR: /app/var/storage
      STORAGE_PUBLIC_URL: /media
      NEXT_PUBLIC_STOREFRONT_URL: http://localhost:3000
    volumes:
      - media:/app/var/storage
    ports: ["3001:3001"]
    depends_on:
      migrate: { condition: service_completed_successfully }

volumes:
  db-data:
  media:
`;
}

export function dockerfile(): string {
  return `# Multi-stage Dockerfile for the exported optical site.
# Build arg APP selects which app to serve (storefront | admin); default storefront.
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm db:generate && pnpm build

FROM base AS runner
ARG APP=storefront
ENV APP=\${APP}
COPY --from=build /app ./
EXPOSE 3000 3001
# db:migrate:deploy is run by the migrate service; here we just serve.
CMD ["sh", "-c", "pnpm start:\${APP}"]
`;
}

export function gitignore(): string {
  return `node_modules/\n.next/\ndist/\n.turbo/\n*.tsbuildinfo\n.env\n.env.local\n!.env.example\n/var/\n/exports/\ncoverage/\npackages/database/src/generated/\n`;
}
