// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateBanner } from "../../src/ui/UpdateBanner";
import { createGame } from "../../src/lib/gameEngine";
import { saveCurrentGame } from "../../src/lib/gamePersistence";
import { signalUpdateReady } from "../../src/lib/updateSignal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const players = [{ id: "a", name: "Asha" }, { id: "b", name: "Biren" }, { id: "c", name: "Chitra" }];

describe("update banner", () => {
  it("offers a waiting version and applies it on tap", () => {
    act(() => root.render(createElement(UpdateBanner)));
    expect(host.textContent).toBe("");
    const apply = vi.fn();
    act(() => signalUpdateReady(apply));
    expect(host.querySelector("[role=status]")?.textContent).toContain("A new version of KaarGaan is ready.");
    act(() => host.querySelector("button")!.click());
    expect(apply).toHaveBeenCalledOnce();
  });

  it("waits while a game is in play, because updating reloads the page", () => {
    saveCurrentGame(createGame("t", players, players.map((p, i) => ({ id: `s${i}`, ownerId: p.id, videoId: `vid${i}xxxxxxx`.slice(0, 11) }))));
    act(() => signalUpdateReady(() => {}));
    act(() => root.render(createElement(UpdateBanner)));
    expect(host.textContent).toBe("");
  });
});
