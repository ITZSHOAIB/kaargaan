import { describe, expect, it } from "vitest";
import { beginVoting, canRevealWithoutMissing, clearVote, createGame, recordVote, reveal, standings } from "../../src/lib/gameEngine";
import type { Game, Player, Submission } from "../../src/lib/types";

const players: Player[] = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, name: id.toUpperCase() }));
const submissions: Submission[] = players.map((p, i) => ({ id: `s${i}`, ownerId: p.id, videoId: `video${i}xxxx` }));
const start = () => beginVoting(createGame("Rain", players, submissions, () => 0));
const ownerOf = (g: Game) => g.submissions.find((s) => s.id === g.rounds[g.activeRoundIndex].submissionId)!.ownerId;

describe("open voting", () => {
  it("lets a voter change and take back a vote until the reveal", () => {
    let g = start();
    g = recordVote(g, "a", "b");
    g = recordVote(g, "a", "c");
    expect(g.rounds[0].votes.a).toBe("c");
    g = clearVote(g, "a");
    expect(g.rounds[0].votes).toEqual({});
  });

  it("refuses to clear a vote once the round is revealed", () => {
    let g = start();
    const owner = ownerOf(g);
    for (const p of players) g = recordVote(g, p.id, p.id === owner ? players.find((x) => x.id !== owner)!.id : owner);
    g = reveal(g);
    expect(() => clearVote(g, "a")).toThrow();
  });
});

describe("reveal without missing voters", () => {
  it("still needs everyone unless told to skip the missing", () => {
    let g = start();
    const owner = ownerOf(g);
    const voters = players.filter((p) => p.id !== owner).slice(0, 3);
    for (const v of voters) g = recordVote(g, v.id, owner);
    expect(() => reveal(g)).toThrow();
    const revealed = reveal(g, { withoutMissing: true });
    const result = revealed.rounds[0].result;
    expect(result?.kind).toBe("revealed");
    if (result?.kind !== "revealed") return;
    expect(result.absentIds?.sort()).toEqual(players.filter((p) => !voters.includes(p)).map((p) => p.id).sort());
    for (const v of voters) expect(result.awards[v.id]).toBe(5);
    expect(standings(revealed).filter((p) => !voters.some((v) => v.id === p.id)).every((p) => p.score === 0)).toBe(true);
  });

  it("needs at least half the room, and never fewer than two votes", () => {
    let g = start();
    const owner = ownerOf(g);
    const others = players.filter((p) => p.id !== owner);
    g = recordVote(g, others[0].id, others[1].id);
    expect(canRevealWithoutMissing(g)).toBe(false);
    expect(() => reveal(g, { withoutMissing: true })).toThrow(/half/);
    g = recordVote(g, others[1].id, others[2].id);
    expect(canRevealWithoutMissing(g)).toBe(false);
    g = recordVote(g, others[2].id, others[0].id);
    expect(canRevealWithoutMissing(g)).toBe(true);
    const result = reveal(g, { withoutMissing: true }).rounds[0].result;
    expect(result?.kind === "revealed" && result.awards).toEqual({ [owner]: 10 });
  });

  it("does not list anyone as absent when everyone voted", () => {
    let g = start();
    const owner = ownerOf(g);
    for (const p of players) g = recordVote(g, p.id, p.id === owner ? players.find((x) => x.id !== owner)!.id : owner);
    const result = reveal(g, { withoutMissing: true }).rounds[0].result;
    expect(result?.kind === "revealed" && result.absentIds).toBeUndefined();
  });
});
