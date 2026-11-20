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
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Whose song is it?");
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toEqual(["kaargaan.crew.v1"]);
});
