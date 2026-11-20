import { expect, test } from "@playwright/test";
import { createGame, recordVote } from "../../src/lib/gameEngine";
import type { Game, Player } from "../../src/lib/types";
import { expectAccessible, expectNoSideScroll, mockOEmbed, mockYouTube, seedGame } from "./helpers";

// Every other spec runs with reduced motion; these check the app with motion on.
test.use({ reducedMotion: "no-preference" });

const players: Player[] = ["Asha", "Biren", "Chitra"].map((name) => ({ id: `p-${name}`, name }));
const ids = ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"];
const game = () => createGame("Songs on repeat", players, players.map((p, i) => ({ id: `s${i}`, ownerId: p.id, videoId: ids[i] })), () => 0);
const ownerOf = (g: Game) => g.submissions.find((s) => s.id === g.rounds[g.activeRoundIndex].submissionId)!.ownerId;

test.beforeEach(async ({ page }) => {
  await mockOEmbed(page);
  await mockYouTube(page);
});

test("one YouTube player lives through votes, reveals and the next song", async ({ page }) => {
  let g = game();
  for (const p of players) if (p.id !== players[2].id) g = recordVote(g, p.id, players.find((q) => q.id !== p.id && q.id !== ownerOf(g))?.id ?? players.find((q) => q.id !== p.id)!.id);
  await seedGame(page, g);
  await page.goto("/play");
  await page.getByRole("button", { name: "Play song" }).click();
  for (let round = 0; round < 2; round += 1) {
    for (const name of players.map((p) => p.name)) {
      const tile = page.getByRole("region", { name: "Votes" }).getByRole("button", { name: new RegExp(`^${name}\\b`) });
      if ((await tile.innerText()).includes("Not voted")) {
        await tile.click();
        await page.getByRole("dialog").getByRole("button").first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal!" }).click();
    await page.getByRole("button", { name: /Next song|See final scores/ }).click();
  }
  expect(await page.evaluate(() => (window as unknown as { __ytCreated: number }).__ytCreated)).toBe(1);
});

test("the stage background is decoration only and never blocks or widens the page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  const stage = page.locator(".kg-stage-bg");
  await expect(stage).toHaveAttribute("aria-hidden", "true");
  await expect(stage).toHaveCSS("pointer-events", "none");
  await expectNoSideScroll(page);
  await page.getByRole("link", { name: "Host a game" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Set up the game");
  await page.waitForTimeout(600);
  await expectAccessible(page);
});

test("sound and buzz can be switched off, and it stays off", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Sound and buzz" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("button", { name: "Sound and buzz" })).toHaveAttribute("aria-pressed", "false");
});

test("each screen loads as its own chunk, and the offline cache holds them all", async ({ page, request }) => {
  const scripts: string[] = [];
  page.on("response", (r) => { if (r.url().endsWith(".js")) scripts.push(r.url()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Whose song");
  expect(scripts.some((u) => /PlayPage-[\w-]+\.js$/.test(u))).toBe(false);
  const sw = await (await request.get("/sw.js")).text();
  for (const chunk of ["PlayPage", "StagePage", "CardPage"]) expect(sw, chunk).toMatch(new RegExp(`${chunk}-[\\w-]+\\.js`));
});
