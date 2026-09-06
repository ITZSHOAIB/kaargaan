import { test, expect } from "@playwright/test";

test("tabletop screens and round controls fit phone and desktop", async ({ page }) => {
  await page.route("https://www.youtube.com/**", route => route.fulfill({ body: "Playback preview" }));
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.screenshot({ path: `/tmp/kaargaan-home-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Gather the room" }).click();
    await expect(page.getByRole("heading", { name: "Build the roster before the private handoff starts" })).toBeVisible();
    await page.getByRole("button", { name: "Begin private handoff" }).click();
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
