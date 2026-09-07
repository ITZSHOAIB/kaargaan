import { describe, expect, it } from "vitest";
import { revealMoment } from "../../src/lib/revealMoment";
import type { Game } from "../../src/lib/types";

const base = (votes: Record<string, string>): Game => ({
  id: "g", roomId: "room", theme: "test", songsPerPlayer: 1,
  players: [{ id: "owner", name: "Owner" }, { id: "guess-a", name: "A" }, { id: "guess-b", name: "B" }],
  submissions: [{ id: "song", ownerId: "owner", videoId: "video" }],
  rounds: [{ id: "r", submissionId: "song", phase: "revealed", votes, result: { kind: "revealed", ownerId: "owner", awards: {} } }],
  activeRoundIndex: 0, status: "playing", saveRevision: 0
});

describe("revealMoment", () => {
  it("recognizes a perfect bluff", () => expect(revealMoment(base({ owner: "guess-a", "guess-a": "guess-b", "guess-b": "guess-a" }), base({ owner: "guess-a", "guess-a": "guess-b", "guess-b": "guess-a" }).rounds[0])).toBe("perfect-bluff"));
  it("recognizes one sharp guess", () => {
    const game = base({ owner: "guess-a", "guess-a": "owner", "guess-b": "guess-a" });
    expect(revealMoment(game, game.rounds[0])).toBe("solo-guess");
  });
  it("recognizes a shared read", () => {
    const game = base({ owner: "guess-a", "guess-a": "owner", "guess-b": "owner" });
    expect(revealMoment(game, game.rounds[0])).toBe("room-read");
  });
});
