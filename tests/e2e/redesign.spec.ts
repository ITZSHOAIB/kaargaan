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
    await page.getByRole("button", { name: "Save and pass" }).click();
    await page.getByRole("button", { name: "Scan Player 2 submission" }).click();
    for (const [index, id] of ["Zi_XLOBDo_Y", "L_jWHffIx5E", "hTWKbfoikeg"].entries()) {
      await page.getByRole("textbox", { name: new RegExp(`Player 2 song ${index + 1}`) }).fill(`https://www.youtube.com/watch?v=${id}`);
    }
    await page.getByRole("button", { name: "Save and pass" }).click();
    await page.getByRole("button", { name: "Scan Player 3 submission" }).click();
    for (const [index, id] of ["fJ9rUzIMcZQ", "3JZ_D3ELwOQ", "2Vv-BfVoq4g"].entries()) {
      await page.getByRole("textbox", { name: new RegExp(`Player 3 song ${index + 1}`) }).fill(`https://www.youtube.com/watch?v=${id}`);
    }
    await page.getByRole("button", { name: "Save and pass" }).click();
    await page.getByRole("button", { name: "Scan Player 4 submission" }).click();
    for (const [index, id] of ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"].entries()) {
      await page.getByRole("textbox", { name: new RegExp(`Player 4 song ${index + 1}`) }).fill(`https://www.youtube.com/watch?v=${id}`);
    }
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
