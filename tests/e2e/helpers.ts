import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const titles: Record<string, string> = {
  dQw4w9WgXcQ: "Never Gonna Give You Up",
  "9bZkp7q19f0": "Gangnam Style",
  kJQP7kiw5Fk: "Despacito",
  Zi_XLOBDo_Y: "Billie Jean",
  L_jWHffIx5E: "All Star",
  hTWKbfoikeg: "Smells Like Teen Spirit",
  fJ9rUzIMcZQ: "Bohemian Rhapsody",
  "3JZ_D3ELwOQ": "Chandelier"
};
export const BLOCKED_ID = "BLOCKEDvid1";

/** Answers YouTube's oEmbed checks offline, with one video that refuses to embed. */
export async function mockOEmbed(page: Page) {
  await page.route("https://www.youtube.com/oembed**", (route) => {
    const watch = new URL(route.request().url()).searchParams.get("url") ?? "";
    const id = new URL(watch).searchParams.get("v") ?? "";
    const headers = { "access-control-allow-origin": "*", "content-type": "application/json" };
    if (id === BLOCKED_ID) return route.fulfill({ status: 401, headers, body: "Unauthorized" });
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ title: titles[id] ?? `Song ${id}` }) });
  });
}

/** Removes the Web Share API so the copy-link fallback runs, as on desktop Linux. */
export async function withoutWebShare(page: Page) {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }));
}

export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);
}

/**
 * Stands in for YouTube's iframe API. Tests drive it through window.__yt: fail(code) and failFor(code, id)
 * fire player errors, `time` moves playback, and window.__ytBlockPlay makes play() do nothing, the way
 * a phone ignores scripted play until someone taps the video.
 */
const FAKE_YOUTUBE = `(function () {
  function Player(el, opts) {
    var frame = document.createElement("iframe");
    frame.title = "YouTube player";
    el.replaceWith(frame);
    this.videoId = opts.videoId; this.state = -1; this.time = 0; this.events = opts.events || {};
    window.__yt = this;
    var self = this;
    setTimeout(function () { self.events.onReady && self.events.onReady({ target: self }); }, 0);
  }
  Player.prototype.emit = function (s) { this.state = s; this.events.onStateChange && this.events.onStateChange({ data: s, target: this }); };
  Player.prototype.playVideo = function () { window.__ytPlays = (window.__ytPlays || 0) + 1; if (!window.__ytBlockPlay) this.emit(1); };
  Player.prototype.pauseVideo = function () { this.emit(2); };
  Player.prototype.seekTo = function (t) { this.time = t; };
  Player.prototype.getCurrentTime = function () { return this.time; };
  Player.prototype.getDuration = function () { return 200; };
  Player.prototype.getPlayerState = function () { return this.state; };
  Player.prototype.cueVideoById = function (id) { this.videoId = typeof id === "string" ? id : id.videoId; this.time = 0; this.emit(5); };
  Player.prototype.loadVideoById = function (id) { this.videoId = typeof id === "string" ? id : id.videoId; this.time = 0; this.emit(1); };
  Player.prototype.getVideoData = function () { return { video_id: this.videoId }; };
  Player.prototype.destroy = function () {};
  Player.prototype.fail = function (code) { this.events.onError && this.events.onError({ data: code, target: this }); };
  Player.prototype.failFor = function (code, id) { var real = this.videoId; this.videoId = id; this.fail(code); this.videoId = real; };
  window.YT = { Player: Player, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } };
  if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
})();`;

export async function mockYouTube(page: Page) {
  await page.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ contentType: "text/javascript", body: FAKE_YOUTUBE }));
}

/** Puts a game on the host phone as if the lobby had just started it. */
export async function seedGame(page: Page, game: unknown) {
  await page.goto("/");
  await page.evaluate((g) => localStorage.setItem("kaargaan.current-game.v1", JSON.stringify({ format: "kaargaan-current-game", version: 1, savedAt: new Date().toISOString(), game: g })), game);
}
