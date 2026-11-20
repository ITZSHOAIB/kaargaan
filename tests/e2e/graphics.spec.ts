import { expect, test, type Page } from "@playwright/test";
import { cardLink, createInvite, inviteLink, readInviteFragment, sealCard, type Invite } from "../../src/lib/card";
import { expectAccessible, expectNoSideScroll, mockOEmbed, withoutWebShare } from "./helpers";

// Illustrations and their animations, checked with motion on at a small phone width.
test.use({ reducedMotion: "no-preference", viewport: { width: 320, height: 700 } });

test.beforeEach(async ({ page }) => {
  await mockOEmbed(page);
});

const settle = (page: Page) => page.waitForTimeout(900);

test("the home page has a stage illustration that's decoration only", async ({ page }) => {
  await page.goto("/");
  const art = page.locator(".kg-hero-art");
  await expect(art).toBeVisible();
  await expect(art).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("list").filter({ hasText: "The host opens a game" }).getByRole("listitem")).toHaveCount(4);
  await settle(page);
  await expectNoSideScroll(page);
  await expectAccessible(page);
});

test("sealing a card stamps it with wax, once", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await withoutWebShare(page);
  const invite = createInvite({ theme: "Songs on repeat", songs: 2, host: "Sohab" });
  await page.goto(inviteLink("", invite));
  await page.getByLabel("Your name").fill("Rupa");
  await page.getByLabel("Song 1 link").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByLabel("Song 2 link").fill("https://youtu.be/9bZkp7q19f0");
  await expect(page.locator(".kg-slot-disc")).toHaveCount(2);
  await expect(page.locator(".kg-slot-disc").first()).toHaveAttribute("aria-hidden", "true");
  await page.getByRole("button", { name: "Seal my card" }).click();
  const wax = page.locator(".kg-wax");
  await expect(wax).toHaveAttribute("aria-hidden", "true");
  await expect(wax).toHaveAttribute("data-fresh", "true");
  await settle(page);
  await expectNoSideScroll(page);
  await expectAccessible(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your song card is ready!" })).toBeVisible();
  await expect(page.locator(".kg-wax")).not.toHaveAttribute("data-fresh", "true");
});

test("the lobby counts cards in with envelopes as they arrive", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: async (data: ShareData) => { (window as unknown as { shared: ShareData }).shared = data; } });
  });
  await page.goto("/stage");
  await page.getByLabel("Your name").fill("Sohab");
  await page.getByRole("button", { name: "Open the lobby" }).click();
  await page.getByRole("button", { name: "Invite players" }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: ShareData }).shared);
  const read = readInviteFragment(new URL(shared.url!).hash);
  if (!read.ok) throw new Error(read.error);
  const invite: Invite = read.invite;

  await expect(page.locator(".kg-mailbox")).toHaveAttribute("aria-hidden", "true");
  const tally = page.locator(".kg-tally");
  await expect(tally).toHaveAttribute("aria-hidden", "true");
  await expect(tally.locator("[data-in]")).toHaveCount(0);

  const link = cardLink("", await sealCard({ v: 2, roomId: invite.roomId, playerKey: "key-Rupa", name: "Rupa", videoIds: ["dQw4w9WgXcQ", "9bZkp7q19f0"] }, invite));
  await page.getByLabel("Paste a card link").fill(new URL(link, "https://x.test").toString());
  await page.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByRole("list", { name: "Players" }).getByRole("listitem").filter({ hasText: "Rupa" })).toContainText("Sealed");
  await expect(tally.locator("[data-in]")).toHaveCount(1);
  await expect(tally.locator("span")).toHaveCount(2);
  await settle(page);
  await expectNoSideScroll(page);
  await expectAccessible(page);
});
