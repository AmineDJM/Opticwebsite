import { test, expect } from "@playwright/test";

/** §49 E2E: Quiz Verres — start and answer the first questions. */
test("lens quiz runs one question per screen", async ({ page }) => {
  await page.goto("/quiz");
  await expect(page.getByText(/Opticien virtuel/).first()).toBeVisible();
  await page.getByRole("button", { name: /Commencer le quiz/ }).click();
  // First question visible with options.
  await expect(page.getByText(/Question 1\/20|Question .*20/)).toBeVisible();
  // Answer the first (single choice) and advance.
  await page.getByRole("button", { name: /25 à 40 ans/ }).click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await expect(page.getByText(/correction connue/i)).toBeVisible();
});
