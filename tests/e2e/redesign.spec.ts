import { test, expect, type Page } from "@playwright/test";
import { beginVoting, createGame, currentRound, nextRound, recordVote, reveal, skip } from "../../src/lib/gameEngine";

test("tabletop screens and round controls fit phone and desktop", async ({ page }) => {
  await page.route("https://www.youtube.com/**", route => route.fulfill({ body: "Playback preview" }));
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await capture(page, { path: `/tmp/kaargaan-home-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Host a game" }).click();
    await expect(page.getByRole("heading", { name: "Set up the room" })).toBeVisible();
    await page.getByRole("button", { name: "Generate room QR" }).click();
    await expect(page.getByRole("heading", { name: "Everyone: scan this room QR" })).toBeVisible();
    const roomCode = await page.locator("header .room-subheader strong").innerText();
    await page.getByRole("button", { name: "Everyone has scanned — add my songs" }).click();
    for (const [index, id] of ["abcdefghijk", "lmnopqrstuv", "12345678_-0"].entries()) {
      await page.getByRole("textbox", { name: new RegExp(`Host song ${index + 1}`) }).fill(`https://www.youtube.com/watch?v=${id}`);
    }
    await page.getByRole("button", { name: "Save my songs" }).click();
    await expect(page.locator("header .room-subheader strong")).toHaveText(roomCode);
    await page.getByRole("button", { name: "Scan Player 2 submission" }).click();
    await checkSurface(page);
    await capture(page, { path: `/tmp/kaargaan-collect-player-${width}.png`, fullPage: true });
    await page.getByText("Paste encrypted entry instead").click();
    await page.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(JSON.stringify({ format: "kaargaan-song-slip", version: 1, playerName: "Asha", theme: "Monsoon night", videoIds: ["Zi_XLOBDo_Y", "L_jWHffIx5E", "hTWKbfoikeg"] }));
    await page.getByRole("button", { name: "Import entry" }).click();
    await expect(page.locator(".collection-scanner")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Confirm player submission" })).toBeInViewport();
    await checkSurface(page);
    await capture(page, { path: `/tmp/kaargaan-confirm-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Discard and scan again" }).click();
    await expect(page.locator(".collection-scanner")).toBeVisible();
    await expect(page.locator(".entry-confirmation")).toHaveCount(0);
    await page.getByText("Paste encrypted entry instead").click();
    await page.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(JSON.stringify({ format: "kaargaan-song-slip", version: 1, playerName: "Asha", theme: "Monsoon night", videoIds: ["Zi_XLOBDo_Y", "L_jWHffIx5E", "hTWKbfoikeg"] }));
    await page.getByRole("button", { name: "Import entry" }).click();
    await page.getByRole("button", { name: "Confirm player submission" }).click();
    await page.getByRole("button", { name: "Scan Player 3 submission" }).click();
    await page.getByText("Paste encrypted entry instead").click();
    await page.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(JSON.stringify({ format: "kaargaan-song-slip", version: 1, playerName: "Biren", theme: "Monsoon night", videoIds: ["fJ9rUzIMcZQ", "3JZ_D3ELwOQ", "2Vv-BfVoq4g"] }));
    await page.getByRole("button", { name: "Import entry" }).click();
    await page.getByRole("button", { name: "Confirm player submission" }).click();
    await page.getByRole("button", { name: "Scan Player 4 submission" }).click();
    await page.getByText("Paste encrypted entry instead").click();
    await page.getByRole("textbox", { name: "Paste the encrypted entry from Discord" }).fill(JSON.stringify({ format: "kaargaan-song-slip", version: 1, playerName: "Chitra", theme: "Monsoon night", videoIds: ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"] }));
    await page.getByRole("button", { name: "Import entry" }).click();
    await page.getByRole("button", { name: "Confirm player submission" }).click();
    await expect(page.locator("header .room-subheader strong")).toHaveText(roomCode);
    await capture(page, { path: `/tmp/kaargaan-ready-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    await checkSurface(page);
    await capture(page, { path: `/tmp/kaargaan-listen-${width}.png`, fullPage: true });
    await expect(page.locator(".stage-sheet .phase-chip")).toHaveText("Listen first");
    await expect(page.getByRole("button", { name: "Reveal song owner" })).not.toBeVisible();
    await page.getByRole("button", { name: "Open voting", exact: true }).click();
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Who picked the song?" })).toBeFocused();
    await checkSurface(page);
    const voteRows = page.locator("[data-voter-id]");
    for (let i = 0; i < await voteRows.count(); i++) {
      await voteRows.nth(i).locator("button.vote-option").first().click();
    }
    await checkSurface(page);
    await capture(page, { path: `/tmp/kaargaan-voting-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Reveal song owner" }).click();
    await expect(page.getByRole("heading", { name: /brought this song/ })).toBeVisible();
    await checkSurface(page);
    await capture(page, { path: `/tmp/kaargaan-result-${width}.png`, fullPage: true });
    await page.reload();
    await expect(page.getByRole("heading", { name: /brought this song/ })).toBeVisible();
    await page.getByText("Game controls", { exact: true }).click();
    await page.getByRole("button", { name: "End game", exact: true }).click();
    await page.getByRole("button", { name: "End game", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Final standings" })).toBeVisible();
    await expect(page.locator("header .room-subheader strong")).toHaveText(roomCode);
    await checkSurface(page);
    await capture(page, { path: `/tmp/kaargaan-final-${width}.png`, fullPage: true });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("header .room-subheader")).toBeInViewport();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".trophy-seal")).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => localStorage.clear());
  }
});

// Measure rendered text against its actual opaque ancestor surface, including disabled controls.
async function checkSurface(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const failures = await page.evaluate(() => {
    function rgb(value: string) { return (value.match(/[\d.]+/g) ?? []).map(Number); }
    function luminance(values: number[]) {
      const [r, g, b] = values.map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
      return .2126 * r + .7152 * g + .0722 * b;
    }
    return Array.from(document.querySelectorAll<HTMLElement>("header *, main *")).flatMap(element => {
      const style = getComputedStyle(element);
      if (!element.checkVisibility() || element.closest(".sr-only") || !Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) return [];
      let parent: HTMLElement | null = element;
      let background = [255,255,255];
      while (parent) {
        const color = rgb(getComputedStyle(parent).backgroundColor);
        if (color.length === 3 || color[3] === 1) { background = color; break; }
        parent = parent.parentElement;
      }
      const a = luminance(rgb(style.color)), b = luminance(background);
      const ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700);
      return ratio + .01 < (large ? 3 : 4.5) ? [{ text: element.textContent?.slice(0,60), foreground: style.color, background, ratio }] : [];
    });
  });
  expect(failures, "WCAG AA text contrast").toEqual([]);
}


test("standings handle tied winners, zero scores, long names, and a new game", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const players = [{ id: "a", name: "Madhurima" }, { id: "b", name: "Sohab" }, { id: "c", name: "A very long player name for the score sheet" }];
  for (const scored of [true, false]) {
    let game = createGame("Party", players, players.map((player, index) => ({ id: `song-${index}`, ownerId: player.id, videoId: ["abcdefghijk", "lmnopqrstuv", "12345678_-0"][index] })), () => .5, "test-room-1234");
    while (game.status !== "completed") {
      if (scored) {
        game = beginVoting(game);
        const owner = game.submissions.find(song => song.id === currentRound(game)?.submissionId)!.ownerId;
        for (const player of players) game = recordVote(game, player.id, player.id === owner ? players.find(other => other.id !== owner)!.id : owner);
        game = reveal(game);
      } else game = skip(game);
      game = nextRound(game);
    }
    await page.goto("/");
    await page.evaluate(game => localStorage.setItem("kaargaan.current-game.v1", JSON.stringify({ format: "kaargaan-current-game", version: 1, savedAt: new Date().toISOString(), game })), game);
    await page.goto("/host");
    await expect(page.getByRole("heading", { name: "Final standings" })).toBeVisible();
    await expect(page.locator("header .room-subheader")).toBeVisible();
    await checkSurface(page);
    if (scored) {
      await expect(page.locator(".winner-line")).toContainText("Share the crown. 10 points.");
      await expect(page.locator(".winner-row")).toHaveCount(3);
      await expect(page.locator(".final-rank")).toHaveText(["1", "1", "1"]);
    } else {
      await expect(page.locator(".winner-row")).toHaveCount(0);
      await expect(page.locator(".confetti")).toHaveCount(0);
      await expect(page.locator(".winner-line")).toContainText("No points yet");
    }
    await capture(page, { path: `/tmp/kaargaan-final-${scored ? "tied" : "zero"}.png`, fullPage: true });
    await page.getByRole("button", { name: "New game" }).click();
    await expect(page.getByRole("heading", { name: "Set up the room" })).toBeVisible();
    await expect(page.locator("header .room-subheader")).toHaveCount(0);
  }
});


async function capture(page: Page, options: { path: string; fullPage: boolean }) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot(options);
}
