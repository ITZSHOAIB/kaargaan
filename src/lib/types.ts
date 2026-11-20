export type YouTubeLinkCheck =
  | {
      ok: true;
      videoId: string;
      canonicalUrl: string;
      sourceUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

export type Player = { id: string; name: string };
export type Submission = { id: string; ownerId: string; videoId: string };
export type RoundPhase = "voting" | "revealed" | "skipped";
export type RoundResult =
  | { kind: "revealed"; ownerId: string; awards: Record<string, number>; absentIds?: string[] }
  | { kind: "skipped" };
export type Round = {
  id: string;
  submissionId: string;
  phase: RoundPhase;
  votes: Record<string, string>;
  result?: RoundResult;
};
export type Game = {
  id: string;
  roomId?: string;
  theme: string;
  songsPerPlayer: number;
  players: Player[];
  submissions: Submission[];
  rounds: Round[];
  activeRoundIndex: number;
  status: "setup" | "playing" | "completed";
  endedEarly?: boolean;
  saveRevision: number;
};
