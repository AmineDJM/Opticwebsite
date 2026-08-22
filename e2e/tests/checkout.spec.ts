import { test, expect } from "@playwright/test";

/** §49 E2E: ajouter panier → checkout COD → création commande. Scenario A core. */
test("cash-on-delivery checkout creates an order", async ({ page }) => {
  // Add a product to the cart.
  await page.goto("/produit/momus-astra");
  await page.getByRole("button", { name: /Ajouter au panier/ }).click();
  // Wait for the add-to-cart server action to confirm before navigating.
  await expect(page.getByRole("button", { name: /Ajouté/ })).toBeVisible();
  // Go to cart.
  await page.goto("/panier");
  await expect(page.getByText("Momus Astra").first()).toBeVisible();
  // Proceed to checkout.
  await page.getByRole("link", { name: /Passer la commande/ }).click();
  await expect(page).toHaveURL(/checkout/);

  // Fill the COD form (target by name attribute — unambiguous).
  await page.locator('input[name="firstName"]').fill("Test");
  await page.locator('input[name="lastName"]').fill("Client");
  await page.locator('input[name="phone"]').fill("0550112233");
  await page.locator('select[name="wilayaCode"]').selectOption("16");
  await page.locator('input[name="addressLine"]').fill("12 rue de test, Alger centre");

  // Confirm — the COD notice must be present.
  await expect(page.getByText("Paiement à la livraison").first()).toBeVisible();
  await page.getByRole("button", { name: /Confirmer la commande/ }).click();

  // Order confirmation page.
  await expect(page).toHaveURL(/\/commande\//, { timeout: 20000 });
  await expect(page.getByText(/Merci pour votre commande/)).toBeVisible();
  await expect(page.locator("text=/AURA-\\d{6}-/")).toBeVisible();
});
