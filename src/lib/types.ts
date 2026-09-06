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

export type SongSlip = {
  format: "kaargaan-song-slip";
  version: 1;
  playerName: string;
  theme: string;
  videoIds: string[];
  roomId?: string;
  roomToken?: string;
  songsPerPlayer?: number;
};

export type RoomInvite = {
  format: "kaargaan-room-invite";
  version: 1;
  roomId: string;
  roomToken: string;
  theme: string;
  songsPerPlayer: number;
  playerCount: number;
};

export type GameSnapshot = {
  format: "kaargaan-phase1-snapshot";
  version: 1;
  createdAt: string;
  game: {
    title: string;
    theme: string;
    currentPlayer: string;
    note: string;
    lastVideoId: string;
    submittedVideoIds: string[];
  };
};

export type Player = { id: string; name: string };
export type Submission = { id: string; ownerId: string; videoId: string };
export type RoundPhase = "listening" | "voting" | "revealed" | "skipped";
export type RoundResult =
  | { kind: "revealed"; ownerId: string; awards: Record<string, number> }
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
  saveRevision: number;
};
