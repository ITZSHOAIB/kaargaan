import { expect, test } from "@playwright/test";

test("home, prepare, and game pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KaarGaan" })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Prepare songs" }).click();
  await expect(page.getByRole("heading", { name: "Create a local song slip" })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Game" }).click();
  await expect(page.getByRole("heading", { name: "Build the roster before the private handoff starts" })).toBeVisible();
});
