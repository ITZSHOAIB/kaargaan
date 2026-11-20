import type { Game } from "./types";

/**
 * Right guesses in a row for each player, up to and including round `upTo`. Only streaks of two or more
 * are listed. Skipped songs and a player's own song don't break a streak. Streaks are for show and never score.
 */
export function guessStreaks(game: Game, upTo: number): Record<string, number> {
  const streaks: Record<string, number> = {};
  for (const player of game.players) {
    let run = 0;
    for (const round of game.rounds.slice(0, upTo + 1)) {
      const result = round.result;
      if (result?.kind !== "revealed" || result.ownerId === player.id) continue;
      run = round.votes[player.id] === result.ownerId ? run + 1 : 0;
    }
    if (run >= 2) streaks[player.id] = run;
  }
  return streaks;
}
