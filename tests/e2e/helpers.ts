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
