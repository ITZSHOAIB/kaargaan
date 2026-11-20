import { expect, test } from "@playwright/test";
import { createGame, nextRound, recordVote, reveal } from "../../src/lib/gameEngine";
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

async function voteEveryone(page: import("@playwright/test").Page, g: Game) {
  const owner = players.find((p) => p.id === ownerOf(g))!;
  for (const p of players) {
    await page.getByRole("region", { name: "Votes" }).getByRole("button", { name: new RegExp(`^${p.name}\\b`) }).click();
    const pick = p.id === owner.id ? players.find((q) => q.id !== owner.id)! : owner;
    await page.getByRole("dialog").getByRole("button", { name: pick.name, exact: true }).click();
  }
  return owner;
}

test("the reveal builds suspense with a drumroll, then lands on the owner", async ({ page }) => {
  const g = game();
  await seedGame(page, g);
  await page.goto("/play");
  const owner = await voteEveryone(page, g);
  await page.getByRole("button", { name: "Reveal!" }).click();
  const skip = page.getByRole("button", { name: "Skip the drumroll" });
  await expect(skip).toBeFocused();
  await expect(page.locator(".kg-drumroll-wheel")).toHaveAttribute("aria-hidden", "true");
  await expectAccessible(page);
  const heading = page.getByRole("heading", { level: 1, name: `It was ${owner.name}'s song!` });
  await expect(heading).toBeVisible({ timeout: 4000 });
  await expect(heading).toBeFocused();
  await expect(skip).toHaveCount(0);
  for (const canvas of await page.locator("canvas").all()) await expect(canvas).toHaveCSS("pointer-events", "none");
  await page.waitForTimeout(800);
  await expectAccessible(page);
  await expectNoSideScroll(page);
});

test("the drumroll can be skipped", async ({ page }) => {
  const g = game();
  await seedGame(page, g);
  await page.goto("/play");
  const owner = await voteEveryone(page, g);
  await page.getByRole("button", { name: "Reveal!" }).click();
  await page.getByRole("button", { name: "Skip the drumroll" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `It was ${owner.name}'s song!` })).toBeFocused();
});

test("a reloaded reveal doesn't drum again", async ({ page }) => {
  const g = game();
  await seedGame(page, g);
  await page.goto("/play");
  const owner = await voteEveryone(page, g);
  await page.getByRole("button", { name: "Reveal!" }).click();
  await page.getByRole("button", { name: "Skip the drumroll" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: `It was ${owner.name}'s song!` })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip the drumroll" })).toHaveCount(0);
});

test("each round opens with a stamp and the round track fills as songs are played", async ({ page }) => {
  let g = game();
  for (const p of players) g = recordVote(g, p.id, ownerOf(g) === p.id ? players.find((q) => q.id !== p.id)!.id : ownerOf(g));
  await seedGame(page, g);
  await page.goto("/play");
  const track = page.locator(".kg-round-track");
  await expect(track).toHaveAttribute("aria-hidden", "true");
  await expect(track.locator("[data-state=now]")).toHaveCount(1);
  await page.getByRole("button", { name: "Reveal!" }).click();
  await page.getByRole("button", { name: "Skip the drumroll" }).click();
  await page.getByRole("button", { name: "Next song" }).click();
  await expect(page.getByText(/Round 2 of 3/)).toBeVisible();
  await expect(track.locator("[data-state=done]")).toHaveCount(1);
  await expect(page.locator(".kg-round-stamp")).toContainText("Round 2");
});

test("the last reveal opens a celebration: podium, crown and focus on the scores", async ({ page }) => {
  let g = game();
  for (let i = 0; i < g.rounds.length; i += 1) {
    const owner = ownerOf(g);
    for (const p of players) g = recordVote(g, p.id, p.id === owner ? players.find((q) => q.id !== p.id)!.id : owner);
    if (i < g.rounds.length - 1) g = nextRound(reveal(g));
  }
  await seedGame(page, g);
  await page.goto("/play");
  await page.getByRole("button", { name: "Reveal!" }).click();
  await page.getByRole("button", { name: "Skip the drumroll" }).click();
  await page.getByRole("button", { name: "See final scores" }).click();
  const heading = page.getByRole("heading", { level: 1, name: "Final scores" });
  await expect(heading).toBeFocused();
  const stage = page.locator(".kg-podium");
  await expect(stage).toHaveAttribute("aria-hidden", "true");
  await expect(stage).toHaveAttribute("data-fresh", "true");
  await expect(stage.locator(".kg-podium-crown")).toHaveCount(1);
  for (const canvas of await page.locator("canvas").all()) await expect(canvas).toHaveCSS("pointer-events", "none");
  // Check contrast once the awards have flipped in, not halfway through the fade.
  await page.locator(".kg-awards li").evaluateAll((items) => Promise.all(items.flatMap((li) => li.getAnimations().map((a) => a.finished))));
  await expectAccessible(page);
  await expectNoSideScroll(page);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Final scores" })).toBeVisible();
  await expect(page.locator(".kg-podium")).not.toHaveAttribute("data-fresh", "true");
});
