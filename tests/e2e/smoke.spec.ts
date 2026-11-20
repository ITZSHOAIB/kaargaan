import { expect, test } from "@playwright/test";

test("every screen loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const [path, heading] of [["/", "Whose song is it?"], ["/stage", "Set up the game"], ["/card", "Ask your host for the invite link"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
  expect(errors).toEqual([]);
});
