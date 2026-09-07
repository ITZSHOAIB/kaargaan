import { test, expect, type Page } from "@playwright/test";
import { importEncryptedSongSlip } from "../../src/lib/songSlip";

const invite = { format: "kaargaan-room-invite", version: 1, roomId: "retry-room", roomToken: "retry-test-token", theme: "Monsoon night", songsPerPlayer: 2, playerCount: 3 };
async function join(page: Page) {
  await page.goto("/player");
  await page.getByText("Can't use the camera? Paste the invite").click();
  await page.getByPlaceholder("Paste the room invite payload").fill(JSON.stringify(invite));
  await page.getByRole("button", { name: "Use invite" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill("Retry player");
  await page.getByRole("textbox", { name: "Song 1", exact: true }).fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("textbox", { name: "Song 2", exact: true }).fill("https://youtu.be/9bZkp7q19f0");
}

test("editing a song retires its previously generated QR and code immediately", async ({ page }) => {
  await join(page);
  await page.getByRole("button", { name: "Generate submission QR" }).click();
  await expect(page.getByRole("button", { name: "Copy encrypted entry" })).toBeVisible();
  await page.getByRole("textbox", { name: "Song 2", exact: true }).fill("https://youtu.be/kJQP7kiw5Fk");
  await expect(page.getByRole("button", { name: "Copy encrypted entry" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /Generated encrypted song entry QR code/i })).toHaveCount(0);
});

test("an older encryption request cannot overwrite a newer song edit", async ({ page }) => {
  await page.addInitScript(() => {
    const original = SubtleCrypto.prototype.encrypt;
    let first = true;
    SubtleCrypto.prototype.encrypt = async function (...args: Parameters<SubtleCrypto["encrypt"]>) {
      const isOld = first;
      if (isOld) {
        first = false;
        await new Promise<void>(resolve => { Object.assign(window, { releaseOldEncryption: resolve }); });
      }
      const result = await original.apply(this, args);
      if (isOld) Object.assign(window, { oldEncryptionFinished: true });
      return result;
    };
  });
  await join(page);
  await page.getByRole("button", { name: "Generate submission QR" }).click();
  await expect.poll(() => page.evaluate(() => "releaseOldEncryption" in window)).toBe(true);
  await page.getByRole("textbox", { name: "Song 2", exact: true }).fill("https://youtu.be/kJQP7kiw5Fk");
  await page.getByRole("button", { name: "Generate submission QR" }).click();
  await expect(page.getByRole("button", { name: "Copy encrypted entry" })).toBeVisible();
  await page.evaluate(() => (window as unknown as { releaseOldEncryption: () => void }).releaseOldEncryption());
  // Drain the old WebCrypto task by waiting for its actual completion marker.
  await expect.poll(() => page.evaluate(() => "oldEncryptionFinished" in window)).toBe(true);
  await page.getByText("Show the encrypted text", { exact: true }).click();
  const payload = await page.getByRole("textbox", { name: "Encrypted song entry" }).inputValue();
  const decoded = await importEncryptedSongSlip(payload, `${invite.roomId}:${invite.roomToken}`, 2);
  expect(decoded.ok && decoded.links[1]).toBe("https://www.youtube.com/watch?v=kJQP7kiw5Fk");
});

async function roomSetup(host: Page) {
  await host.goto("/host");
  await host.getByRole("combobox", { name: "Songs per player" }).click();
  await host.getByRole("option", { name: "2 songs", exact: true }).click();
  await host.getByRole("combobox", { name: "Total players, including you" }).click();
  await host.getByRole("option", { name: "3 players", exact: true }).click();
  await host.getByRole("button", { name: "Generate room QR" }).click();
  await host.getByText("Show invite text", { exact: true }).click();
  const payload = await host.getByRole("textbox", { name: "Room invite payload" }).inputValue();
  await host.getByRole("button", { name: "Everyone has scanned — add my songs" }).click();
  await host.getByRole("textbox", { name: "Host song 1" }).fill("https://youtu.be/dQw4w9WgXcQ");
  await host.getByRole("textbox", { name: "Host song 2" }).fill("https://youtu.be/9bZkp7q19f0");
  await host.getByRole("button", { name: "Save my songs" }).click();
  await host.getByRole("button", { name: "Scan Player 2 submission" }).click();
  return payload;
}

async function generatedCode(player: Page) {
  await player.getByRole("button", { name: "Generate submission QR" }).click();
  await expect(player.getByRole("img", { name: "Generated encrypted song entry QR code" })).toBeVisible();
  await player.getByText("Show the encrypted text", { exact: true }).click();
  return player.getByRole("textbox", { name: "Encrypted song entry" }).inputValue();
}

async function pasteEntry(host: Page, payload: string) {
  if (!(await host.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).isVisible())) await host.getByText("Paste encrypted entry instead").click();
  await host.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(payload);
  await host.getByRole("button", { name: "Import entry", exact: true }).click();
}

test("real player retries report exact conflicts, preserve the room, and survive reloads", async ({ page: host, context }) => {
  await host.setViewportSize({ width: 390, height: 844 });
  const roomPayload = await roomSetup(host);
  const room = await host.locator("header .room-subheader strong").innerText();
  const player = await context.newPage();
  await player.goto("/player");
  await player.getByText("Can't use the camera? Paste the invite").click();
  await player.getByPlaceholder("Paste the room invite payload").fill(roomPayload);
  await player.getByRole("button", { name: "Use invite" }).click();
  await player.getByRole("textbox", { name: "Your name" }).fill("Madhurima");
  await player.getByRole("textbox", { name: "Song 1", exact: true }).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=different-url");
  await player.getByRole("textbox", { name: "Song 2", exact: true }).fill("https://youtu.be/9bZkp7q19f0");
  await pasteEntry(host, await generatedCode(player));
  await expect(host.getByRole("alert")).toContainText("Madhurima: Songs 1, 2 conflict");
  await expect(host.locator(".entry-confirmation")).toHaveCount(0);
  await player.getByRole("textbox", { name: "Song 1", exact: true }).fill("https://youtu.be/kJQP7kiw5Fk");
  await pasteEntry(host, await generatedCode(player));
  await expect(host.getByRole("alert")).toContainText("Madhurima: Song 2 conflicts");
  await host.screenshot({ path: "/tmp/kaargaan-song-conflict.png", fullPage: true });
  await player.getByRole("textbox", { name: "Song 2", exact: true }).fill("https://youtu.be/Zi_XLOBDo_Y");
  await player.reload();
  await expect(player.getByRole("textbox", { name: "Song 1", exact: true })).toHaveValue("https://youtu.be/kJQP7kiw5Fk");
  await expect(player.getByRole("textbox", { name: "Your name" })).toHaveValue("Madhurima");
  await pasteEntry(host, await generatedCode(player));
  await expect(host.getByRole("button", { name: "Confirm player submission" })).toBeVisible();
  await expect(host.getByRole("alert")).toHaveCount(0);
  await host.reload();
  await expect(host.getByRole("heading", { name: "Madhurima is in." })).toBeVisible();
  await host.getByRole("button", { name: "Confirm player submission" }).click();
  await host.getByRole("button", { name: "Scan Player 3 submission" }).click();
  await host.getByRole("button", { name: "Room & players", exact: true }).click();
  await host.getByText("Show invite text", { exact: true }).click();
  await expect(host.getByRole("textbox", { name: "Room invite payload" })).toHaveValue(roomPayload);
  await expect(host.getByText("Songs already collected. No need to resubmit.")).toHaveCount(2);
  await host.screenshot({ path: "/tmp/kaargaan-room-rejoin.png", fullPage: true });
  await host.getByRole("button", { name: "Replace Madhurima entry" }).click();
  // A replacement is compared against OTHER players, not its own accepted songs.
  const replacement = await player.getByRole("textbox", { name: "Encrypted song entry" }).inputValue();
  await pasteEntry(host, replacement);
  await expect(host.getByRole("button", { name: "Confirm player submission" })).toBeVisible();
  await host.getByRole("button", { name: "Discard and scan again" }).click();
  await host.getByRole("button", { name: "Room & players", exact: true }).click();
  await expect(host.getByRole("button", { name: "Replace Madhurima entry" })).toBeVisible();
  await host.getByRole("button", { name: "Collect Player 3 entry" }).click();
  await host.reload();
  await expect(host.getByRole("heading", { name: "Collect songs from Player 3" })).toBeVisible();
  await expect(host.locator("header .room-subheader strong")).toHaveText(room);
  await host.getByRole("link", { name: "KaarGaan home" }).click();
  await host.getByRole("link", { name: "Continue room setup" }).click();
  await expect(host.getByRole("heading", { name: "Collect songs from Player 3" })).toBeVisible();
});
