import { expect, test } from "@playwright/test";

test("home, player, and host pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KaarGaan" })).toBeVisible();

  await page.getByRole("link", { name: "Join as a player" }).click();
  await expect(page.getByRole("heading", { name: "Scan the host's room QR" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Host a game" }).click();
  await expect(page.getByRole("heading", { name: "Set up the room" })).toBeVisible();
});
