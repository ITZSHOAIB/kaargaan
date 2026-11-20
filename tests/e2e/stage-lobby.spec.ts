import { expect, test, type Page } from "@playwright/test";
import { cardLink, createInvite, readInviteFragment, sealCard, type Invite } from "../../src/lib/card";
import { expectAccessible, expectNoSideScroll, mockOEmbed, withoutWebShare } from "./helpers";

/** Seals a card the way a player's phone would and returns the link they'd send. */
async function cardFrom(invite: Invite, name: string, videoIds: string[], playerKey = `key-${name}`) {
  return cardLink("", await sealCard({ v: 2, roomId: invite.roomId, playerKey, name, videoIds }, invite));
}

/** Captures what the host shares instead of opening a share sheet. */
async function stubShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: async (data: ShareData) => { (window as unknown as { shared: ShareData }).shared = data; } });
  });
}

async function openLobby(page: Page, host = "Sohab", songs: 2 | 3 = 2): Promise<Invite> {
  await page.goto("/stage");
  await page.getByLabel("Your name").fill(host);
  await page.getByLabel("Theme", { exact: true }).fill("Songs on repeat");
  await page.getByRole("radio", { name: `${songs} songs` }).check();
  await page.getByRole("button", { name: "Open the lobby" }).click();
  await expect(page.getByRole("heading", { name: "Collect the song cards" })).toBeVisible();
  await page.getByRole("button", { name: "Invite players" }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: ShareData }).shared);
  const read = readInviteFragment(new URL(shared.url!).hash);
  if (!read.ok) throw new Error(read.error);
  return read.invite;
}

const row = (page: Page, name: string) => page.getByRole("list", { name: "Players" }).getByRole("listitem").filter({ hasText: name });

test.beforeEach(async ({ page }) => {
  await mockOEmbed(page);
});

test("the home page sends hosts to the stage and players to their card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Whose song is it?");
  await expectAccessible(page);
  await expect(page.getByRole("link", { name: "I got an invite" })).toHaveAttribute("href", "/card");
  await page.getByRole("link", { name: "Host a game" }).click();
  await expect(page).toHaveURL(/\/stage$/);
  await page.goto("/player");
  await expect(page).toHaveURL(/\/card$/);
});

test("a host collects sealed cards from other phones and starts the game", async ({ page, browser }) => {
  await stubShare(page);
  await page.goto("/stage");
  await expect(page.getByRole("heading", { name: "Set up the game" })).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Your name").fill("Sohab");
  await page.getByLabel("Theme", { exact: true }).fill("Monsoon night");
  await page.getByRole("radio", { name: "3 songs" }).check();
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Sohab");
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("Monsoon night");
  await expect(page.getByRole("radio", { name: "3 songs" })).toBeChecked();
  await page.getByRole("radio", { name: "2 songs" }).check();
  await page.getByRole("button", { name: "Open the lobby" }).click();

  await expect(page.getByRole("heading", { name: "Collect the song cards" })).toBeVisible();
  await expect(row(page, "Sohab")).toContainText("Not in yet");
  await page.getByRole("button", { name: "Invite players" }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: ShareData }).shared);
  expect(shared.url).toMatch(/\/card#i=/);
  await page.getByRole("button", { name: "Show the invite QR" }).click();
  await expect(page.getByRole("img", { name: "QR code of the game invite" })).toBeVisible();
  await expectAccessible(page);

  // Rupa builds her card on her own phone.
  const phone = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const rupa = await phone.newPage();
  await mockOEmbed(rupa);
  await withoutWebShare(rupa);
  await rupa.goto(new URL(shared.url!).pathname + new URL(shared.url!).hash);
  await rupa.getByLabel("Your name").fill("Rupa");
  await rupa.getByLabel("Song 1 link").fill("https://youtu.be/dQw4w9WgXcQ");
  await rupa.getByLabel("Song 2 link").fill("https://youtu.be/9bZkp7q19f0");
  await rupa.getByRole("button", { name: "Seal my card" }).click();
  await rupa.getByRole("button", { name: "Send to Sohab" }).click();
  await expect(rupa.getByRole("status").filter({ hasText: "Card link copied" })).toBeVisible();
  const rupaLink = new URL(await rupa.evaluate(() => navigator.clipboard.readText()));
  await phone.close();

  // Sohab taps the link in the chat.
  await page.goto(rupaLink.pathname + rupaLink.hash);
  await expect(page.getByRole("status").filter({ hasText: "Rupa's card is in · 2 songs sealed" })).toBeVisible();
  await expect(page).toHaveURL(/\/stage$/);
  await expect(row(page, "Rupa")).toContainText("Sealed");
  await expect(page.getByText("Never Gonna Give You Up")).toHaveCount(0);

  await row(page, "Sohab").getByRole("button", { name: "Add my songs" }).click();
  await expect(page.getByRole("heading", { name: "Your songs" })).toBeVisible();
  await page.getByLabel("Song 1 link").fill("https://youtu.be/kJQP7kiw5Fk");
  await page.getByLabel("Song 2 link").fill("https://youtu.be/Zi_XLOBDo_Y");
  await expect(page.getByText("Despacito")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Seal my songs" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your songs are in · 2 songs sealed" })).toBeVisible();
  await expect(page.getByText("Despacito")).toHaveCount(0);

  const invite = readInviteFragment(new URL(shared.url!).hash);
  if (!invite.ok) throw new Error(invite.error);
  await expect(page.getByRole("button", { name: "Start the game" })).toBeDisabled();
  await expect(page.getByText("Need at least 3 players")).toBeVisible();
  await page.getByLabel("Paste a card link").fill(`Here's mine! ${await cardFrom(invite.invite, "Arjun", ["L_jWHffIx5E", "hTWKbfoikeg"])}`);
  await page.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Arjun's card is in" })).toBeVisible();
  await expect(page.getByLabel("Paste a card link")).toHaveValue("");

  await page.reload();
  await expect(row(page, "Rupa")).toContainText("Sealed");
  await expect(row(page, "Arjun")).toContainText("Sealed");
  await page.getByRole("button", { name: "Start the game" }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole("heading", { name: "Who picked this song?" })).toBeVisible();

  await page.goto("/stage");
  await expect(page.getByRole("link", { name: "Back to the game" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("Sohab");
  await expect(page.getByLabel("Same crew again")).toBeChecked();
  await page.getByRole("button", { name: "Open the lobby" }).click();
  await expect(row(page, "Rupa")).toContainText("Waiting for a card");
  await expect(row(page, "Arjun")).toContainText("Waiting for a card");
});

test("card links tapped in other tabs all land in the same lobby", async ({ page, context }) => {
  await stubShare(page);
  const invite = await openLobby(page);
  const other = await context.newPage();
  await mockOEmbed(other);
  await other.goto(await cardFrom(invite, "Rupa", ["dQw4w9WgXcQ", "9bZkp7q19f0"]));
  await expect(other.getByRole("status").filter({ hasText: "Rupa's card is in" })).toBeVisible();

  await expect(row(page, "Rupa")).toContainText("Sealed");
  await page.getByLabel("Add a player").fill("Mitali");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await other.goto(await cardFrom(invite, "Arjun", ["L_jWHffIx5E", "hTWKbfoikeg"]));
  await expect(other.getByRole("status").filter({ hasText: "Arjun's card is in" })).toBeVisible();

  await page.reload();
  await expect(row(page, "Rupa")).toContainText("Sealed");
  await expect(row(page, "Arjun")).toContainText("Sealed");
  await expect(row(page, "Mitali")).toContainText("Waiting for a card");
});

test("the lobby flags clashes and look-alike names without exposing anyone's songs", async ({ page }) => {
  await stubShare(page);
  const invite = await openLobby(page);
  const paste = async (link: string) => {
    await page.getByLabel("Paste a card link").fill(link);
    await page.getByRole("button", { name: "Add card" }).click();
  };

  await paste(await cardFrom(invite, "Rupa", ["dQw4w9WgXcQ", "9bZkp7q19f0"]));
  await paste(await cardFrom(invite, "Arjun", ["9bZkp7q19f0", "kJQP7kiw5Fk"]));
  await expect(page.getByRole("alert")).toHaveText("Arjun's song 1 is already in the game. Ask Arjun to swap it and send a fresh card.");
  await expect(row(page, "Arjun")).toContainText("Swap needed");
  await paste(await cardFrom(invite, "Arjun", ["L_jWHffIx5E", "kJQP7kiw5Fk"]));
  await expect(page.getByRole("status").filter({ hasText: "Arjun's card is in" })).toBeVisible();

  await page.getByLabel("Add a player").fill(" rupa ");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("There's already a Rupa");

  await paste(await cardFrom(invite, "RUPA", ["hTWKbfoikeg", "fJ9rUzIMcZQ"], "another-phone"));
  await expect(page.getByText("There's already a card from Rupa. Replace it with this one?")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Keep the old card" }).click();
  await expect(page.getByText("Replace it with this one?")).toHaveCount(0);
  await paste(await cardFrom(invite, "Rupa", ["hTWKbfoikeg", "fJ9rUzIMcZQ"], "another-phone"));
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Rupa's card was updated" })).toBeVisible();

  await paste(await cardFrom(createInvite({ theme: "x", songs: 2, host: "Other" }), "Tina", ["3JZ_D3ELwOQ", "dQw4w9WgXcQ"]));
  await expect(page.getByRole("alert")).toContainText("different game");
  await paste("hello there");
  await expect(page.getByRole("alert")).toContainText("no song card");

  await row(page, "Arjun").getByRole("button", { name: "Remove Arjun" }).click();
  await expect(row(page, "Arjun")).toHaveCount(0);
  await expect(row(page, "Sohab").getByRole("button", { name: /Remove/ })).toHaveCount(0);
});

test("a card link opened away from the host's phone says where it belongs", async ({ page }) => {
  const invite = createInvite({ theme: "x", songs: 2, host: "Sohab" });
  await page.goto(await cardFrom(invite, "Rupa", ["dQw4w9WgXcQ", "9bZkp7q19f0"]));
  await expect(page.getByRole("alert")).toContainText("Open it on the host's phone");
  await expect(page.getByRole("heading", { name: "Set up the game" })).toBeVisible();
  await expect(page).toHaveURL(/\/stage$/);
});

test("the lobby fits a 320px phone", async ({ page }) => {
  await stubShare(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openLobby(page, "Bartholomew-Alexander");
  await expectNoSideScroll(page);
  for (const target of await page.getByRole("button").all()) {
    const box = await target.boundingBox();
    if (box) expect(Math.min(box.width, box.height), await target.innerText()).toBeGreaterThanOrEqual(44);
  }
});

test("setup offers theme ideas that fill the theme in one tap", async ({ page }) => {
  await page.goto("/stage");
  const ideas = page.getByRole("group", { name: "Theme ideas" });
  await ideas.getByRole("button", { name: "Guilty pleasures" }).click();
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("Guilty pleasures");
  await expect(ideas.getByRole("button", { name: "Guilty pleasures" })).toHaveAttribute("aria-pressed", "true");
  await expectAccessible(page);
});
