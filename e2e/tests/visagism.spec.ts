import { test, expect } from "@playwright/test";

/** §49 E2E: parcours Visagisme manuel (no camera) → recommendations. */
test("manual visagism yields recommendations", async ({ page }) => {
  await page.goto("/visagisme");
  await page.getByRole("button", { name: /Choisir manuellement|Commencer/ }).first().click();
  // Face shape step.
  await expect(page.getByText(/forme de votre visage/i)).toBeVisible();
  await page.getByRole("button", { name: "Rond", exact: false }).first().click();
  // Advance through remaining optional steps to the end.
  for (let i = 0; i < 5; i++) {
    const next = page.getByRole("button", { name: /Suivant|Voir mes recommandations|Passer/ }).first();
    if (await next.isVisible().catch(() => false)) await next.click();
  }
  await expect(page.getByText(/montures recommandées|recommandation/i)).toBeVisible({ timeout: 20000 });
});
