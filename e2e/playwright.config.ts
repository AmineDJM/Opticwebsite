import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * E2E config (§49). Boots the storefront and admin production servers against the seeded
 * database and runs the specs. Mobile viewport is included because the checkout and
 * catalogue must excel on phones (§31).
 */
// Use an explicitly provided or pre-installed Chromium when it actually exists (its
// build may differ from the pinned @playwright/test) — otherwise leave it undefined so
// Playwright uses its own managed browser (what `playwright install` provides in CI).
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const CHROME_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);
const STOREFRONT_PORT = 3100;
const ADMIN_PORT = 3101;
const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/opticengine?schema=public",
  APP_SECRET: process.env.APP_SECRET ?? "e2e-secret-at-least-32-characters-000",
  SITE_SLUG: "aura-optique",
  STORAGE_LOCAL_DIR: resolve(__dirname, "../var/storage"),
  STORAGE_PUBLIC_URL: "/media",
  NEXT_PUBLIC_STOREFRONT_URL: `http://localhost:${STOREFRONT_PORT}`,
  NEXT_PUBLIC_ADMIN_URL: `http://localhost:${ADMIN_PORT}`,
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { baseURL: `http://localhost:${STOREFRONT_PORT}`, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: CHROME_PATH } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath: CHROME_PATH } }, testMatch: /checkout|catalogue/ },
  ],
  webServer: [
    {
      command: `pnpm --filter @optic/storefront start --port ${STOREFRONT_PORT}`,
      url: `http://localhost:${STOREFRONT_PORT}`,
      cwd: resolve(__dirname, ".."),
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env,
    },
    {
      command: `pnpm --filter @optic/admin start --port ${ADMIN_PORT}`,
      url: `http://localhost:${ADMIN_PORT}/login`,
      cwd: resolve(__dirname, ".."),
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env,
    },
  ],
});
