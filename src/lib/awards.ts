import type { Game, Player, Round } from "./types";

export type Guess = { voter: Player; guess: Player; correct: boolean; isOwner: boolean };
export type AwardId = "sharpest-ear" | "master-bluffer" | "most-suspected";
export type Award = { id: AwardId; playerIds: string[]; count: number };

/** Who guessed whom in a revealed round, in seating order. The owner's own vote is their bluff. */
export function guessesForRound(game: Game, round: Round): Guess[] {
  const result = round.result;
  if (result?.kind !== "revealed") return [];
  const byId = new Map(game.players.map((p) => [p.id, p]));
  return game.players.flatMap((voter) => {
    const guess = byId.get(round.votes[voter.id] ?? "");
    if (!guess) return [];
    const isOwner = voter.id === result.ownerId;
    return [{ voter, guess, correct: !isOwner && guess.id === result.ownerId, isOwner }];
  });
}

/** End-of-night awards. Ties share an award, and an award nobody earned is left out. */
export function gameAwards(game: Game): Award[] {
  const correct = new Map<string, number>();
  const bluffs = new Map<string, number>();
  const suspected = new Map<string, number>();
  const bump = (map: Map<string, number>, id: string) => map.set(id, (map.get(id) ?? 0) + 1);

  for (const round of game.rounds) {
    if (round.result?.kind !== "revealed") continue;
    const guesses = guessesForRound(game, round);
    guesses.forEach((g) => { bump(suspected, g.guess.id); if (g.correct) bump(correct, g.voter.id); });
    if (!guesses.some((g) => g.correct)) bump(bluffs, round.result.ownerId);
  }

  const leaders = (id: AwardId, map: Map<string, number>): Award[] => {
    const count = Math.max(0, ...map.values());
    if (count === 0) return [];
    return [{ id, count, playerIds: game.players.filter((p) => map.get(p.id) === count).map((p) => p.id) }];
  };
  return [...leaders("sharpest-ear", correct), ...leaders("master-bluffer", bluffs), ...leaders("most-suspected", suspected)];
}
