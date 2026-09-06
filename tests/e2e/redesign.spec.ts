import { test, expect } from "@playwright/test";

test("tabletop screens and round controls fit phone and desktop", async ({ page }) => {
  await page.route("https://www.youtube.com/**", route => route.fulfill({ body: "Playback preview" }));
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.screenshot({ path: `/tmp/kaargaan-home-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Host a game" }).click();
    await expect(page.getByRole("heading", { name: "Set up the room" })).toBeVisible();
    await page.getByRole("button", { name: "Generate room QR" }).click();
    await expect(page.getByRole("heading", { name: "Everyone: scan this room QR" })).toBeVisible();
    await page.getByRole("button", { name: "Everyone has scanned — add my songs" }).click();
    for (const [index, id] of ["abcdefghijk", "lmnopqrstuv", "12345678_-0"].entries()) {
      await page.getByRole("textbox", { name: new RegExp(`Host song ${index + 1}`) }).fill(`https://www.youtube.com/watch?v=${id}`);
    }
    await page.getByRole("button", { name: "Save my songs" }).click();
    await page.getByRole("button", { name: "Scan Player 2 submission" }).click();
    await page.screenshot({ path: `/tmp/kaargaan-collect-player-${width}.png`, fullPage: true });
    await page.getByText("Paste encrypted entry instead").click();
    await page.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(JSON.stringify({ format: "kaargaan-song-slip", version: 1, playerName: "Asha", theme: "Monsoon night", videoIds: ["Zi_XLOBDo_Y", "L_jWHffIx5E", "hTWKbfoikeg"] }));
    await page.getByRole("button", { name: "Import entry" }).click();
    await page.getByRole("button", { name: "Confirm player submission" }).click();
    await page.getByRole("button", { name: "Scan Player 3 submission" }).click();
    await page.getByText("Paste encrypted entry instead").click();
    await page.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(JSON.stringify({ format: "kaargaan-song-slip", version: 1, playerName: "Biren", theme: "Monsoon night", videoIds: ["fJ9rUzIMcZQ", "3JZ_D3ELwOQ", "2Vv-BfVoq4g"] }));
    await page.getByRole("button", { name: "Import entry" }).click();
    await page.getByRole("button", { name: "Confirm player submission" }).click();
    await page.getByRole("button", { name: "Scan Player 4 submission" }).click();
    await page.getByText("Paste encrypted entry instead").click();
    await page.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(JSON.stringify({ format: "kaargaan-song-slip", version: 1, playerName: "Chitra", theme: "Monsoon night", videoIds: ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"] }));
    await page.getByRole("button", { name: "Import entry" }).click();
    await page.getByRole("button", { name: "Confirm player submission" }).click();
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    await expect(page.locator(".stage-sheet .phase-chip")).toHaveText("Listen first");
    await expect(page.getByRole("button", { name: "Reveal song owner" })).not.toBeVisible();
    await page.getByRole("button", { name: "Open voting", exact: true }).click();
    const voteRows = page.locator("[data-voter-id]");
    for (let i = 0; i < await voteRows.count(); i++) {
      await voteRows.nth(i).locator("button.vote-option").first().click();
    }
    await page.screenshot({ path: `/tmp/kaargaan-voting-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Reveal song owner" }).click();
    await expect(page.locator(".reveal")).toContainText("brought this song");
    await page.reload();
    await expect(page.locator(".reveal")).toContainText("brought this song");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => localStorage.clear());
  }
});
