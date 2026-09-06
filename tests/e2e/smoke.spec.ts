import { expect, test } from "@playwright/test";

test("home, player, and host pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KaarGaan" })).toBeVisible();

  await page.getByRole("link", { name: "Join as a player" }).click();
  await expect(page.getByRole("heading", { name: "Join the room" })).toBeVisible();
  await page.screenshot({ path: "/tmp/kaargaan-player-join.png", fullPage: true });
  await page.getByText("Can't use the camera? Paste the invite").click();
  await page.getByPlaceholder("Paste the room invite payload").fill(JSON.stringify({
    format: "kaargaan-room-invite",
    version: 1,
    roomId: "room-smoke",
    roomToken: "token-smoke",
    theme: "Monsoon night",
    songsPerPlayer: 2,
    playerCount: 4
  }));
  await page.getByRole("button", { name: "Use invite" }).click();
  await expect(page.getByRole("heading", { name: "Prepare songs for the host" })).toBeVisible();
  await expect(page.getByText("Monsoon night")).toBeVisible();
  await page.screenshot({ path: "/tmp/kaargaan-player-prepare.png", fullPage: true });

  await page.goto("/");
  await page.getByRole("link", { name: "Host a game" }).click();
  await expect(page.getByRole("heading", { name: "Set up the room" })).toBeVisible();
});
