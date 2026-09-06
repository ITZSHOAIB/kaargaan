import type { Game, Player, Round, RoundResult, Submission } from "./types";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function createGame(theme: string, players: Player[], submissions: Submission[], random = Math.random, roomId?: string): Game {
  const shuffled = [...submissions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  const rounds = shuffled.map((submission): Round => ({ id: id("round"), submissionId: submission.id, phase: "listening", votes: {} }));
  return { id: id("game"), ...(roomId ? { roomId } : {}), theme: theme.trim(), songsPerPlayer: submissions.length / Math.max(players.length, 1), players, submissions, rounds, activeRoundIndex: 0, status: "playing", saveRevision: 0 };
}

export function beginVoting(game: Game): Game {
  const round = currentRound(game);
  if (!round || round.phase !== "listening") throw new Error("Round is not ready for voting.");
  return updateRound(game, { ...round, phase: "voting" });
}

export function recordVote(game: Game, voterId: string, ownerId: string): Game {
  const round = currentRound(game);
  if (!round || round.phase !== "voting") throw new Error("Voting is not open.");
  if (!game.players.some((p) => p.id === voterId) || !game.players.some((p) => p.id === ownerId)) throw new Error("Unknown player.");
  if (voterId === ownerId) throw new Error("Players cannot vote for themselves.");
  return updateRound(game, { ...round, votes: { ...round.votes, [voterId]: ownerId } });
}

export function reveal(game: Game): Game {
  const round = currentRound(game);
  if (round?.phase === "revealed" && round.result) return game;
  if (!round || round.phase !== "voting") throw new Error("Reveal is not available.");
  if (game.players.some((p) => !round.votes[p.id])) throw new Error("Every player must vote before reveal.");
  const ownerId = game.submissions.find((s) => s.id === round.submissionId)?.ownerId;
  if (!ownerId) throw new Error("Round owner is missing.");
  const correct = game.players.filter((p) => p.id !== ownerId && round.votes[p.id] === ownerId);
  const awards: Record<string, number> = {};
  if (correct.length === 0) awards[ownerId] = 10;
  else correct.forEach((p) => { awards[p.id] = correct.length === 1 ? 10 : 5; });
  const result: RoundResult = { kind: "revealed", ownerId, awards };
  return updateRound(game, { ...round, phase: "revealed", result });
}

export function skip(game: Game): Game {
  const round = currentRound(game);
  if (round?.phase === "skipped" && round.result?.kind === "skipped") return game;
  if (!round || round.phase === "revealed" || round.phase === "skipped") throw new Error("Round cannot be skipped.");
  return updateRound(game, { ...round, phase: "skipped", result: { kind: "skipped" } });
}

export function nextRound(game: Game): Game {
  const round = currentRound(game);
  if (!round || !round.result) throw new Error("Resolve or skip the current round first.");
  const next = game.activeRoundIndex + 1;
  return next >= game.rounds.length ? { ...game, status: "completed" } : { ...game, activeRoundIndex: next };
}

export function currentRound(game: Game) { return game.rounds[game.activeRoundIndex]; }
export function voteOrder(game: Game): Player[] {
  if (game.players.length === 0) return [];
  const start = game.activeRoundIndex % game.players.length;
  return [...game.players.slice(start), ...game.players.slice(0, start)];
}
export function standings(game: Game) {
  const scores = Object.fromEntries(game.players.map((p) => [p.id, 0]));
  game.rounds.forEach((r) => { if (r.result?.kind === "revealed") Object.entries(r.result.awards).forEach(([playerId, points]) => { scores[playerId] = (scores[playerId] ?? 0) + points; }); });
  return game.players.map((p) => ({ ...p, score: scores[p.id] ?? 0 })).sort((a, b) => b.score - a.score);
}

function updateRound(game: Game, round: Round): Game { return { ...game, rounds: game.rounds.map((r, i) => i === game.activeRoundIndex ? round : r) }; }
