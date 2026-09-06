// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "../../src/lib/snapshot";
import type { GameSnapshot } from "../../src/lib/types";

afterEach(() => {
  localStorage.clear();
});

describe("snapshot storage", () => {
  it("saves and restores a local snapshot", () => {
    const snapshot: GameSnapshot = {
      format: "kaargaan-phase1-snapshot",
      version: 1,
      createdAt: "2026-09-06T10:00:00.000Z",
      game: {
        title: "Friday friends night",
        theme: "Rain songs",
        currentPlayer: "Rohan",
        note: "saved",
        lastVideoId: "dQw4w9WgXcQ",
        submittedVideoIds: ["dQw4w9WgXcQ"]
      }
    };

    saveSnapshot(snapshot);
    expect(loadSnapshot()).toEqual(snapshot);
  });

  it("clears the local snapshot", () => {
    const snapshot: GameSnapshot = {
      format: "kaargaan-phase1-snapshot",
      version: 1,
      createdAt: "2026-09-06T10:00:00.000Z",
      game: {
        title: "Friday friends night",
        theme: "Rain songs",
        currentPlayer: "Rohan",
        note: "saved",
        lastVideoId: "dQw4w9WgXcQ",
        submittedVideoIds: ["dQw4w9WgXcQ"]
      }
    };

    saveSnapshot(snapshot);
    clearSnapshot();
    expect(loadSnapshot()).toBeNull();
  });
});
