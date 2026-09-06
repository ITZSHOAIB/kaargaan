import { describe, expect, it } from "vitest";
import { beginVoting, createGame, nextRound, recordVote, reveal, skip, standings, voteOrder } from "../../src/lib/gameEngine";
import type { Player, Submission } from "../../src/lib/types";

const players: Player[] = [{ id: "a", name: "Asha" }, { id: "b", name: "Biren" }, { id: "c", name: "Chitra" }];
const submissions: Submission[] = players.map((p, i) => ({ id: `s${i}`, ownerId: p.id, videoId: `video-${i}` }));
const game = () => createGame("Rain", players, submissions, () => 0.5);

describe("game engine", () => {
  it("awards 10 to a sole correct guesser", () => {
    let g = beginVoting(game()); const owner = g.submissions.find((s) => s.id === g.rounds[0].submissionId)!.ownerId; const guesser = players.find((p) => p.id !== owner)!.id; const other = players.find((p) => p.id !== owner && p.id !== guesser)!.id;
    g = recordVote(g, owner, other); g = recordVote(g, guesser, owner); g = recordVote(g, other, guesser); const result = reveal(g);
    expect(result.rounds[0].result).toEqual(expect.objectContaining({ kind: "revealed", ownerId: owner }));
    expect(standings(result).find((p) => p.id === guesser)?.score).toBe(10);
  });
  it("rotates the first voter by round", () => {
    const g = game();
    expect(voteOrder(g).map((player) => player.id)).toEqual(["a", "b", "c"]);
    expect(voteOrder({ ...g, activeRoundIndex: 1 }).map((player) => player.id)).toEqual(["b", "c", "a"]);
  });

  it("rejects self votes and preserves skipped rounds", () => { expect(() => recordVote(beginVoting(game()), "a", "a")).toThrow(); const skipped = skip(game()); expect(skipped.rounds[0].result).toEqual({ kind: "skipped" }); expect(() => nextRound(game())).toThrow(); });

  it("keeps repeated reveal idempotent", () => {
    let g = beginVoting(game());
    const owner = g.submissions.find((s) => s.id === g.rounds[0].submissionId)!.ownerId;
    const otherPlayers = players.filter((player) => player.id !== owner);
    g = recordVote(g, owner, otherPlayers[0].id);
    g = recordVote(g, otherPlayers[0].id, owner);
    g = recordVote(g, otherPlayers[1].id, owner);
    const revealed = reveal(g);
    expect(reveal(revealed)).toEqual(revealed);
  });
});
