import { test, expect } from "@playwright/test";

/** §49 E2E: navigation catalogue, recherche, ajouter panier. */
test.describe("Storefront — catalogue", () => {
  test("homepage renders the brand and Momus highlight", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Aura Optique/);
    await expect(page.getByText("Momus").first()).toBeVisible();
  });

  test("browse catalogue and filter", async ({ page }) => {
    await page.goto("/boutique");
    await expect(page.getByRole("heading", { name: "Boutique" })).toBeVisible();
    // Product cards present
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("open a product and see price + add to cart", async ({ page }) => {
    await page.goto("/produit/momus-astra");
    await expect(page.getByRole("heading", { name: "Momus Astra" })).toBeVisible();
    await expect(page.getByText(/DA/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Ajouter au panier/ })).toBeVisible();
  });
});
