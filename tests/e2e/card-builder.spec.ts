import { expect, test } from "@playwright/test";
import { createInvite, extractCardPayload, inviteLink, openCard } from "../../src/lib/card";
import { BLOCKED_ID, expectAccessible, expectNoSideScroll, mockOEmbed, withoutWebShare } from "./helpers";

const invite = createInvite({ theme: "Songs on repeat", songs: 2, host: "Sohab" });

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockOEmbed(page);
});

test("a player builds, seals and sends a song card from the invite link", async ({ page }) => {
  await withoutWebShare(page);
  await page.goto(inviteLink("", invite));
  await expect(page.getByRole("heading", { name: "Make your song card" })).toBeVisible();
  await expect(page.getByText("Songs on repeat")).toBeVisible();
  await expect(page.getByText("Sohab's game · 2 songs each")).toBeVisible();
  await expect(page).toHaveURL(/\/card$/);
  await expectAccessible(page);

  await page.getByLabel("Your name").fill("Rupa");
  await page.getByLabel("Song 1 link").fill("https://youtu.be/dQw4w9WgXcQ");
  await expect(page.getByText("Never Gonna Give You Up")).toBeVisible();
  await page.getByLabel("Song 2 link").fill("https://youtu.be/dQw4w9WgXcQ?si=share");
  await expect(page.getByText("Same song as song 1. Pick a different one.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Seal my card" })).toBeDisabled();
  await page.getByLabel("Song 2 link").fill(`https://www.youtube.com/watch?v=${BLOCKED_ID}`);
  await expect(page.getByText(/won't play inside KaarGaan/)).toBeVisible();
  await page.getByLabel("Song 2 link").fill("not a link");
  await expect(page.getByText("That doesn't look like a YouTube link.")).toBeVisible();
  await page.getByLabel("Song 2 link").fill("https://youtu.be/9bZkp7q19f0");
  await expect(page.getByText("Gangnam Style")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Seal my card" }).click();

  await expect(page.getByRole("heading", { name: "Your song card is ready!" })).toBeVisible();
  await expect(page.getByText("Never Gonna Give You Up")).toHaveCount(0);
  await expect(page.getByText(/nobody sees what's inside, not even Sohab/)).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Send to Sohab" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Card link copied" })).toBeVisible();
  const first = await openCard(extractCardPayload(await page.evaluate(() => navigator.clipboard.readText()))!, invite);
  expect(first).toEqual({ ok: true, card: expect.objectContaining({ name: "Rupa", videoIds: ["dQw4w9WgXcQ", "9bZkp7q19f0"] }) });

  await page.getByRole("button", { name: "Host is right here? Show a QR" }).click();
  await expect(page.getByRole("img", { name: "QR code of your sealed card" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Your song card is ready!" })).toBeVisible();
  await page.getByRole("button", { name: "Edit my songs" }).click();
  await expect(page.getByLabel("Song 2 link")).toHaveValue("https://youtu.be/9bZkp7q19f0");
  await page.getByLabel("Song 2 link").fill("https://youtu.be/kJQP7kiw5Fk");
  await page.getByRole("button", { name: "Seal my card" }).click();
  await page.getByRole("button", { name: "Send to Sohab" }).click();
  await expect(async () => {
    const second = await openCard(extractCardPayload(await page.evaluate(() => navigator.clipboard.readText()))!, invite);
    expect(second.ok && second.card.videoIds).toEqual(["dQw4w9WgXcQ", "kJQP7kiw5Fk"]);
    expect(second.ok && first.ok && second.card.playerKey).toBe(first.ok && first.card.playerKey);
  }).toPass();
});

test("the share sheet gets the card link when the phone has one", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: async (data: ShareData) => { (window as unknown as { shared: ShareData }).shared = data; } });
  });
  await page.goto(inviteLink("", invite));
  await page.getByLabel("Your name").fill("Arjun");
  await page.getByLabel("Song 1 link").fill("https://youtu.be/Zi_XLOBDo_Y");
  await page.getByLabel("Song 2 link").fill("https://youtu.be/L_jWHffIx5E");
  await page.getByRole("button", { name: "Seal my card" }).click();
  await page.getByRole("button", { name: "Send to Sohab" }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: ShareData }).shared);
  expect(shared.url).toMatch(/\/stage#c=kg2\./);
  expect(shared.text).not.toMatch(/Billie Jean|Zi_XLOBDo_Y/);
});

test("without an invite the page explains how to get one and accepts a pasted invite", async ({ page }) => {
  await page.goto("/card");
  await expect(page.getByRole("heading", { name: "Ask your host for the invite link" })).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Paste the invite link").fill("nonsense");
  await page.getByRole("button", { name: "Use this invite" }).click();
  await expect(page.getByRole("alert")).toContainText("no game invite");
  await page.getByLabel("Paste the invite link").fill(`Join my KaarGaan night! https://kaargaan.sohab.dev${inviteLink("", invite)}`);
  await page.getByRole("button", { name: "Use this invite" }).click();
  await expect(page.getByRole("heading", { name: "Make your song card" })).toBeVisible();
});

test("the card builder fits a 320px phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(inviteLink("", invite));
  await expect(page.getByRole("heading", { name: "Make your song card" })).toBeVisible();
  await expectNoSideScroll(page);
  for (const target of await page.getByRole("button").all()) {
    const box = await target.boundingBox();
    if (box) expect(Math.min(box.width, box.height), await target.innerText()).toBeGreaterThanOrEqual(44);
  }
});
