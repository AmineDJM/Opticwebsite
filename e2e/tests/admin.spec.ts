import { test, expect } from "@playwright/test";

/** §49 E2E: admin login → view product → order status. Scenario B core. */
const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3101";

test("admin login and product list", async ({ page }) => {
  await page.goto(`${ADMIN}/login`);
  await page.getByLabel("E-mail").fill("admin@aura-optique.demo");
  await page.getByLabel("Mot de passe").fill("AuraOptique2026!");
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page.getByRole("heading", { name: /Tableau de bord/ })).toBeVisible({ timeout: 20000 });

  // Navigate to products.
  await page.getByRole("link", { name: "Produits" }).click();
  await expect(page.getByText("Momus Astra")).toBeVisible();
});
