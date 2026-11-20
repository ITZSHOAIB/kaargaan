import { expect, test, type Page } from "@playwright/test";
import { cardLink, readInviteFragment, sealCard } from "../../src/lib/card";
import { createGame, nextRound, recordVote, reveal, skip } from "../../src/lib/gameEngine";
import type { Game, Player } from "../../src/lib/types";
import { expectAccessible, expectNoSideScroll, mockOEmbed, mockYouTube, seedGame, titles } from "./helpers";

const players: Player[] = [
  { id: "p-asha", name: "Asha" },
  { id: "p-biren", name: "Biren" },
  { id: "p-chitra", name: "Chitra" },
  { id: "p-dev", name: "Dev" }
];
const videoIds = ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk", "Zi_XLOBDo_Y"];
const fourRounds = (list = players) => createGame("Songs on repeat", list, list.map((p, i) => ({ id: `submission-${p.id}-1`, ownerId: p.id, videoId: videoIds[i] })), () => 0, "room-1");

function ownerOf(game: Game, index: number): Player {
  const ownerId = game.submissions.find((s) => s.id === game.rounds[index].submissionId)!.ownerId;
  return game.players.find((p) => p.id === ownerId)!;
}
function videoOf(game: Game, index: number): string {
  return game.submissions.find((s) => s.id === game.rounds[index].submissionId)!.videoId;
}

const tiles = (page: Page) => page.getByRole("region", { name: "Votes" }).getByRole("button");
const tile = (page: Page, name: string) => page.getByRole("region", { name: "Votes" }).getByRole("button", { name: new RegExp(`^${name}\\b`) });

async function vote(page: Page, voter: string, pick: string) {
  await tile(page, voter).click();
  await page.getByRole("dialog", { name: `${voter}, whose song is it?` }).getByRole("button", { name: pick, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await mockOEmbed(page);
  await mockYouTube(page);
});

test("the host phone plays a song, takes open votes and reveals the owner", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "wakeLock", { configurable: true, value: { request: async () => { (window as unknown as { locks: number }).locks = ((window as unknown as { locks?: number }).locks ?? 0) + 1; return { release: async () => {}, addEventListener() {} }; } } });
  });
  const game = fourRounds();
  const owner = ownerOf(game, 0);
  const others = players.filter((p) => p.id !== owner.id);
  await seedGame(page, game);
  await page.goto("/play");

  await expect(page.getByText("Round 1 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who picked this song?");
  await expect.poll(() => page.evaluate(() => (window as unknown as { locks?: number }).locks ?? 0)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Play song" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.evaluate(() => { (window as unknown as { __yt: { time: number } }).__yt.time = 100; });
  await expect(page.getByRole("progressbar", { name: "Song progress" })).toHaveAttribute("aria-valuenow", "50");
  await expectAccessible(page);

  // Nothing on screen tells the owner apart before the reveal.
  const shapes = await tiles(page).evaluateAll((els) => els.map((el) => el.outerHTML.replace(/Asha|Biren|Chitra|Dev|>[A-D]</g, "")));
  expect(new Set(shapes).size).toBe(1);
  const html = await page.locator("main").innerHTML();
  for (const p of players) expect(html).not.toContain(p.id);

  await tile(page, "Asha").click();
  const sheet = page.getByRole("dialog", { name: "Asha, whose song is it?" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Asha", exact: true })).toHaveCount(0);
  await expectAccessible(page);
  await sheet.getByRole("button", { name: "Biren", exact: true }).click();
  await expect(tile(page, "Asha")).toBeFocused();
  await expect(tile(page, "Asha")).toContainText("Voted");
  await expect(page.getByRole("status").filter({ hasText: "1 of 4 voted" })).toBeVisible();

  await tile(page, "Asha").click();
  await expect(sheet.getByRole("button", { pressed: true })).toHaveCount(0);
  await expect(sheet.locator("[aria-current], .is-picked")).toHaveCount(0);
  await sheet.getByRole("button", { name: "Take back my vote" }).click();
  await expect(tile(page, "Asha")).toContainText("Not voted");
  await tile(page, "Asha").click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(tile(page, "Asha")).toBeFocused();

  await expect(page.getByRole("button", { name: "Reveal!" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Reveal without them/ })).toHaveCount(0);
  await vote(page, others[0].name, owner.name);
  await vote(page, others[1].name, owner.name);
  await vote(page, owner.name, others[2].name);
  await page.getByRole("button", { name: "Someone stepped out? Reveal without them" }).click();
  await expect(page.getByRole("dialog", { name: `Reveal without ${others[2].name}?` })).toBeVisible();
  await page.getByRole("button", { name: "Wait for them" }).click();
  await vote(page, others[2].name, others[0].name);
  await page.getByRole("button", { name: "Reveal!" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`It was ${owner.name}'s song!`);
  await expect(page.getByText(titles[videoOf(game, 0)])).toBeVisible();
  await expect(page.getByText("The room read")).toBeVisible();
  const guesses = page.getByRole("list", { name: "Guesses" });
  await expect(guesses).toContainText(`${others[0].name} guessed ${owner.name}`);
  await expect(guesses).toContainText(`${owner.name} bluffed: ${others[2].name}`);
  await expect(guesses).toContainText("+5");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Next song" }).click();
  await expect(page.getByText("Round 2 of 4")).toBeVisible();
  await expect(tile(page, "Asha")).toContainText("Not voted");

  await page.reload();
  await expect(page.getByText("Round 2 of 4")).toBeVisible();
  await page.goto("/host");
  await expect(page).toHaveURL(/\/play$/);
});

test("a song that won't play is skipped without a hint of whose it was", async ({ page }) => {
  const game = fourRounds();
  await seedGame(page, game);
  await page.goto("/play");
  await expect(page.getByRole("button", { name: "Play song" })).toBeVisible();

  // A late error from another video changes nothing.
  await page.evaluate((id) => (window as unknown as { __yt: { failFor(code: number, id: string): void } }).__yt.failFor(150, id), videoOf(game, 2));
  await expect(page.getByText("Round 1 of 4")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who picked this song?");

  await page.evaluate(() => (window as unknown as { __yt: { fail(code: number): void } }).__yt.fail(5));
  await expect(page.getByRole("alert")).toContainText("This song didn't load");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.evaluate(() => (window as unknown as { __yt: { fail(code: number): void } }).__yt.fail(150));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Song skipped");
  const main = page.locator("main");
  await expect(main).toContainText("This song wouldn't play here, so it's skipped. Nobody scores.");
  await expect(main).not.toContainText(ownerOf(game, 0).name + "'s");
  await expect(main).not.toContainText(titles[videoOf(game, 0)]);
  await page.getByRole("button", { name: "Next song" }).click();
  await expect(page.getByText("Round 2 of 4")).toBeVisible();
});

test("when the phone ignores the play button, the host is told to tap the video", async ({ page }) => {
  await seedGame(page, fourRounds());
  await page.addInitScript(() => { (window as unknown as { __ytBlockPlay: boolean }).__ytBlockPlay = true; });
  await page.goto("/play");
  await page.getByRole("button", { name: "Play song" }).click();
  await expect(page.getByText("Tap the video to start it.")).toBeVisible();
  await expect(page.getByTitle("YouTube player")).toBeVisible();
});

test("the host can check scores, skip a song and end the night early", async ({ page }) => {
  let game = fourRounds();
  const owner = ownerOf(game, 0);
  for (const p of players) game = recordVote(game, p.id, p.id === owner.id ? players.find((q) => q.id !== owner.id)!.id : owner.id);
  game = nextRound(reveal(game));
  await seedGame(page, game);
  await page.goto("/play");

  await page.getByRole("button", { name: "Scores" }).click();
  const scores = page.getByRole("dialog", { name: "Scores" });
  await expect(scores.getByRole("listitem").first()).toContainText("5");
  await scores.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Skip this song" }).click();
  await page.getByRole("dialog", { name: "Skip this song?" }).getByRole("button", { name: "Skip it" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Song skipped");
  await expect(page.locator("main")).toContainText("Nobody scores this round.");
  await page.getByRole("button", { name: "Next song" }).click();

  await page.getByRole("button", { name: "End game" }).click();
  await page.getByRole("dialog", { name: "End the game now?" }).getByRole("button", { name: "End it" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Final scores");
  await expect(page.getByText("Game ended early. Only revealed rounds count.")).toBeVisible();
});

test("final scores handle a shared crown, a scoreless night and long names on any screen", async ({ page }) => {
  const long: Player[] = [...players.slice(0, 3), { id: "p-long", name: "Bartholomew-Alexand" }];
  // Everyone who isn't the owner guesses right: shared 5s each round.
  let tied = fourRounds(long);
  for (let i = 0; i < 4; i += 1) {
    const owner = ownerOf(tied, i);
    for (const p of long) tied = recordVote(tied, p.id, p.id === owner.id ? long.find((q) => q.id !== owner.id)!.id : owner.id);
    tied = nextRound(reveal(tied));
  }
  await seedGame(page, tied);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/play");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Final scores");
    await expectNoSideScroll(page);
  }
  await expect(page.getByText("Share the crown. 15 points.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Standings" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("region", { name: "Awards" })).toContainText("Sharpest ear");
  await expect(page.getByRole("region", { name: "Who picked what" })).toContainText(`${titles[videoIds[0]]}`);
  await expect(page.getByRole("link", { name: "Open tonight's playlist" })).toHaveAttribute("href", /watch_videos\?video_ids=/);
  await expectAccessible(page);

  let scoreless = fourRounds();
  for (let i = 0; i < 4; i += 1) scoreless = nextRound(skip(scoreless));
  await seedGame(page, scoreless);
  await page.goto("/play");
  await expect(page.getByText("Nobody scored tonight.")).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  await seedGame(page, fourRounds(long));
  await page.goto("/play");
  await expectNoSideScroll(page);
  for (const target of await page.getByRole("button").all()) {
    const box = await target.boundingBox();
    if (box) expect(Math.min(box.width, box.height), await target.innerText()).toBeGreaterThanOrEqual(44);
  }
});

test("a phone with no game points the host to setup", async ({ page }) => {
  await page.goto("/play");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No game on this phone yet");
  await page.getByRole("link", { name: "Set up a game" }).click();
  await expect(page).toHaveURL(/\/stage$/);
});

test("a whole night: lobby, every round, final scores and a rematch with the same crew", async ({ page, browser }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: async (data: ShareData) => { (window as unknown as { shared: ShareData }).shared = data; } });
  });
  await page.goto("/stage");
  await page.getByLabel("Your name").fill("Sohab");
  await page.getByRole("radio", { name: "2 songs" }).check();
  await page.getByRole("button", { name: "Open the lobby" }).click();
  await page.getByRole("button", { name: "Invite players" }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: ShareData }).shared);
  const read = readInviteFragment(new URL(shared.url!).hash);
  if (!read.ok) throw new Error(read.error);

  const phone = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const rupa = await phone.newPage();
  await mockOEmbed(rupa);
  await rupa.addInitScript(() => Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }));
  await rupa.goto(new URL(shared.url!).pathname + new URL(shared.url!).hash);
  await rupa.getByLabel("Your name").fill("Rupa");
  await rupa.getByLabel("Song 1 link").fill("https://youtu.be/dQw4w9WgXcQ");
  await rupa.getByLabel("Song 2 link").fill("https://youtu.be/9bZkp7q19f0");
  await rupa.getByRole("button", { name: "Seal my card" }).click();
  await rupa.getByRole("button", { name: "Send to Sohab" }).click();
  await expect(rupa.getByRole("status").filter({ hasText: "Card link copied" })).toBeVisible();
  const rupaLink = new URL(await rupa.evaluate(() => navigator.clipboard.readText()));
  await phone.close();

  await page.goto(rupaLink.pathname + rupaLink.hash);
  await expect(page.getByRole("status").filter({ hasText: "Rupa's card is in" })).toBeVisible();
  const arjun = cardLink("", await sealCard({ v: 2, roomId: read.invite.roomId, playerKey: "arjun-phone", name: "Arjun", videoIds: ["L_jWHffIx5E", "hTWKbfoikeg"] }, read.invite));
  await page.goto(arjun);
  await expect(page.getByRole("status").filter({ hasText: "Arjun's card is in" })).toBeVisible();
  await page.getByRole("button", { name: "Add my songs" }).click();
  await page.getByLabel("Song 1 link").fill("https://youtu.be/kJQP7kiw5Fk");
  await page.getByLabel("Song 2 link").fill("https://youtu.be/Zi_XLOBDo_Y");
  await page.getByRole("button", { name: "Seal my songs" }).click();
  await page.getByRole("button", { name: "Start the game" }).click();

  await expect(page).toHaveURL(/\/play$/);
  const names = ["Sohab", "Rupa", "Arjun"];
  for (let round = 1; round <= 6; round += 1) {
    await expect(page.getByText(`Round ${round} of 6`)).toBeVisible();
    for (const voter of names) {
      await tile(page, voter).click();
      await page.getByRole("dialog").getByRole("button", { name: names.find((n) => n !== voter)!, exact: true }).click();
    }
    await page.getByRole("button", { name: "Reveal!" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("'s song!");
    await page.getByRole("button", { name: round === 6 ? "See final scores" : "Next song" }).click();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Final scores");
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page).toHaveURL(/\/stage$/);
  await expect(page.getByLabel("Same crew again")).toBeChecked();
  await expect(page.getByRole("link", { name: "Back to the game" })).toHaveCount(0);
});
