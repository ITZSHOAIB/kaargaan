import type { Game, Round } from "./types";

export type RevealMoment = "perfect-bluff" | "solo-guess" | "room-read" | null;

/** Returns the short story beat that makes a reveal feel like a game moment. */
export function revealMoment(game: Game, round: Round): RevealMoment {
  const result = round.result;
  if (!result || result.kind !== "revealed") return null;
  const correctVoters = game.players.filter(
    (player) => player.id !== result.ownerId && round.votes[player.id] === result.ownerId
  );
  if (correctVoters.length === 0) return "perfect-bluff";
  if (correctVoters.length === 1) return "solo-guess";
  return "room-read";
}
