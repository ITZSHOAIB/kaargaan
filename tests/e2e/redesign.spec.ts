import { test, expect } from "@playwright/test";

test("tabletop screens and round controls fit phone and desktop", async ({ page }) => {
  await page.route("https://www.youtube.com/**", route => route.fulfill({ body: "Playback preview" }));
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.screenshot({ path: `/tmp/kaargaan-home-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Host a game" }).click();
    await expect(page.getByRole("heading", { name: "Set up the room" })).toBeVisible();
    await page.getByRole("button", { name: "Continue to player songs" }).click();
    await page.getByRole("textbox", { name: /Asha song 1/ }).fill("https://www.youtube.com/watch?v=abcdefghijk");
    await page.getByRole("textbox", { name: /Asha song 2/ }).fill("https://www.youtube.com/watch?v=lmnopqrstuv");
    await page.getByRole("textbox", { name: /Asha song 3/ }).fill("https://www.youtube.com/watch?v=12345678_-0");
    await page.getByText("Host: scan the player's QR").click();
    await page.getByRole("textbox", { name: "Paste a KaarGaan song slip JSON payload" }).fill(JSON.stringify({
      format: "kaargaan-song-slip",
      version: 1,
      playerName: "Asha",
      theme: "Monsoon night",
      videoIds: ["abcdefghijk", "lmnopqrstuv", "12345678_-0"]
    }));
    await page.getByRole("button", { name: "Import slip" }).click();
    await expect(page.getByText("3 songs received")).toBeVisible();
    await page.getByRole("button", { name: "Save and pass" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Save and pass" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Save and pass" }).click();
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    await page.getByRole("button", { name: "Open voting", exact: true }).click();
    const selects = page.locator("select");
    for (let i = 0; i < await selects.count(); i++) await selects.nth(i).selectOption({ index: 1 });
    await page.screenshot({ path: `/tmp/kaargaan-voting-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Reveal song owner" }).click();
    await expect(page.getByRole("status")).toContainText("brought this song");
    await page.reload();
    await expect(page.getByRole("status")).toContainText("brought this song");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => localStorage.clear());
  }
});
