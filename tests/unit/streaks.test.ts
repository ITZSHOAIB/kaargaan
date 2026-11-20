import { describe, expect, it } from "vitest";
import { guessStreaks } from "../../src/lib/streaks";
import type { Game, Round } from "../../src/lib/types";

const players = [{ id: "a", name: "Asha" }, { id: "b", name: "Biren" }, { id: "c", name: "Chitra" }];
const round = (id: string, ownerId: string, votes: Record<string, string>, kind: "revealed" | "skipped" | "voting" = "revealed"): Round => ({
  id, submissionId: `s-${id}`, phase: kind, votes,
  result: kind === "revealed" ? { kind, ownerId, awards: {} } : kind === "skipped" ? { kind } : undefined
});
const game = (rounds: Round[]): Game => ({
  id: "g", theme: "t", songsPerPlayer: 2, players,
  submissions: rounds.map((r) => ({ id: r.submissionId, ownerId: r.result?.kind === "revealed" ? r.result.ownerId : "a", videoId: "dQw4w9WgXcQ" })),
  rounds, activeRoundIndex: rounds.length - 1, status: "playing", saveRevision: 0
});

describe("guessStreaks", () => {
  it("counts right guesses in a row up to the given round, only from two on", () => {
    const g = game([round("1", "a", { b: "a", c: "b" }), round("2", "c", { b: "c", c: "a" }), round("3", "a", { b: "a", c: "a" })]);
    expect(guessStreaks(g, 2)).toEqual({ b: 3 });
    expect(guessStreaks(g, 1)).toEqual({ b: 2 });
  });

  it("is broken by a wrong guess or a missed vote", () => {
    const g = game([round("1", "a", { b: "a" }), round("2", "a", { b: "c" }), round("3", "a", { b: "a" }), round("4", "c", { a: "c" })]);
    expect(guessStreaks(g, 2)).toEqual({});
    expect(guessStreaks(g, 3)).toEqual({});
  });

  it("isn't broken by skipped songs or by a player's own song", () => {
    const g = game([round("1", "a", { b: "a" }), round("2", "a", {}, "skipped"), round("3", "b", { b: "c" }), round("4", "c", { b: "c" })]);
    expect(guessStreaks(g, 3)).toEqual({ b: 2 });
  });

  it("ignores rounds that haven't been revealed", () => {
    const g = game([round("1", "a", { b: "a" }), round("2", "a", { b: "a" }), round("3", "a", { b: "a" }, "voting")]);
    expect(guessStreaks(g, 2)).toEqual({ b: 2 });
  });
});
