import { beforeEach, describe, expect, it } from "vitest";
import { clearCurrentGame, loadCurrentGame, loadCurrentGameState, saveCurrentGame } from "../../src/lib/gamePersistence";
import { createGame } from "../../src/lib/gameEngine";

describe("current game persistence", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
      clear: () => data.clear(),
      key: (index) => [...data.keys()][index] ?? null,
      get length() { return data.size; }
    } as Storage;
    localStorage.clear();
  });

  it("round-trips an active game", () => {
    const game = createGame("Rain", [{ id: "a", name: "Asha" }, { id: "b", name: "Biren" }, { id: "c", name: "Chitra" }], [
      { id: "s1", ownerId: "a", videoId: "abcdefghijk" },
      { id: "s2", ownerId: "b", videoId: "lmnopqrstuv" },
      { id: "s3", ownerId: "c", videoId: "12345678_-0" }
    ]);
    const saved = saveCurrentGame(game);
    expect(saved.saveRevision).toBe(1);
    expect(loadCurrentGame()).toEqual(saved);
  });

  it("clears the current game and rejects malformed data", () => {
    localStorage.setItem("kaargaan.current-game.v1", "{\"format\":\"wrong\"}");
    expect(loadCurrentGame()).toBeNull();
    expect(loadCurrentGameState()).toEqual({
      game: null,
      error: "A saved game could not be restored. Clear the current game and start over."
    });
    clearCurrentGame();
    expect(loadCurrentGame()).toBeNull();
  });

  it("rejects stale saves from another tab", () => {
    const game = createGame("Rain", [{ id: "a", name: "Asha" }, { id: "b", name: "Biren" }, { id: "c", name: "Chitra" }], [
      { id: "s1", ownerId: "a", videoId: "abcdefghijk" },
      { id: "s2", ownerId: "b", videoId: "lmnopqrstuv" },
      { id: "s3", ownerId: "c", videoId: "12345678_-0" }
    ]);
    const saved = saveCurrentGame(game);
    localStorage.setItem(
      "kaargaan.current-game.v1",
      JSON.stringify({
        format: "kaargaan-current-game",
        version: 1,
        savedAt: new Date().toISOString(),
        game: { ...saved, saveRevision: saved.saveRevision + 1 }
      })
    );
    expect(() => saveCurrentGame(saved)).toThrow("This game changed in another tab. Reload before saving.");
  });
});
