import { describe, expect, it } from "vitest";
import { gameAwards, guessesForRound } from "../../src/lib/awards";
import type { Game, Round } from "../../src/lib/types";

const players = [{ id: "a", name: "Asha" }, { id: "b", name: "Biren" }, { id: "c", name: "Chitra" }];
const round = (id: string, ownerId: string, votes: Record<string, string>, kind: "revealed" | "skipped" = "revealed"): Round => ({
  id, submissionId: `s-${id}`, phase: kind, votes,
  result: kind === "revealed" ? { kind, ownerId, awards: {} } : { kind }
});
const game = (rounds: Round[]): Game => ({
  id: "g", theme: "t", songsPerPlayer: 1, players,
  submissions: rounds.map((r) => ({ id: r.submissionId, ownerId: r.result?.kind === "revealed" ? r.result.ownerId : "a", videoId: "dQw4w9WgXcQ" })),
  rounds, activeRoundIndex: rounds.length - 1, status: "completed", saveRevision: 0
});

describe("guessesForRound", () => {
  it("lists every voter with their guess, marking right guesses and the owner's bluff", () => {
    const g = game([round("1", "a", { a: "b", b: "a", c: "b" })]);
    expect(guessesForRound(g, g.rounds[0])).toEqual([
      { voter: players[0], guess: players[1], correct: false, isOwner: true },
      { voter: players[1], guess: players[0], correct: true, isOwner: false },
      { voter: players[2], guess: players[1], correct: false, isOwner: false }
    ]);
  });

  it("returns nothing for skipped rounds", () => {
    const g = game([round("1", "a", {}, "skipped")]);
    expect(guessesForRound(g, g.rounds[0])).toEqual([]);
  });
});

describe("gameAwards", () => {
  it("names the sharpest ear, the master bluffer and the most suspected, sharing ties", () => {
    const g = game([
      round("1", "a", { a: "b", b: "c", c: "b" }),
      round("2", "b", { a: "b", b: "a", c: "b" }),
      round("3", "c", { a: "c", b: "a", c: "a" }),
      round("4", "a", {}, "skipped")
    ]);
    const awards = gameAwards(g);
    expect(awards.find((a) => a.id === "sharpest-ear")).toEqual(expect.objectContaining({ playerIds: ["a"], count: 2 }));
    expect(awards.find((a) => a.id === "master-bluffer")).toEqual(expect.objectContaining({ playerIds: ["a"], count: 1 }));
    expect(awards.find((a) => a.id === "most-suspected")).toEqual(expect.objectContaining({ playerIds: ["b"], count: 4 }));
  });

  it("leaves out awards nobody earned", () => {
    expect(gameAwards(game([round("1", "a", {}, "skipped")]))).toEqual([]);
  });
});
