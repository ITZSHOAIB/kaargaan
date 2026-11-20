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

test("opening the app forgets saves from the old pass-the-phone flow but keeps tonight's game", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    for (const key of ["kaargaan.host-setup.v1", "kaargaan.player-setup.v1", "kaargaan.phase1.snapshot.v1"]) localStorage.setItem(key, "{}");
    localStorage.setItem("kaargaan.crew.v1", JSON.stringify({ hostName: "Rupa", names: ["Arjun"], theme: "t", songs: 2 }));
    localStorage.setItem("kaargaan.current-game.v1", "tonight");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Whose song is it?");
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toEqual(["kaargaan.crew.v1", "kaargaan.current-game.v1"]);
});

test("the installed app and browser bar use Buzzer Night blue", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#2430d9");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: "KaarGaan", theme_color: "#2430d9", background_color: "#2430d9", start_url: "/" });
});
