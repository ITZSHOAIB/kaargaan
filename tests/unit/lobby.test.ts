import { describe, expect, it } from "vitest";
import { createLobby, lobbyReducer, lobbyReady, lobbyToGame, type Lobby, type LobbyAction } from "../../src/lib/lobby";
import type { SongCard } from "../../src/lib/card";

const ids = ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk", "Zi_XLOBDo_Y", "L_jWHffIx5E", "hTWKbfoikeg", "fJ9rUzIMcZQ", "3JZ_D3ELwOQ"];
const base = () => createLobby({ theme: "Songs on repeat", songs: 2, hostName: "Sohab", crew: ["Rupa", "Arjun"] });
const card = (lobby: Lobby, name: string, videoIds: string[], playerKey = `key-${name.toLowerCase()}`): SongCard => ({ v: 2, roomId: lobby.invite.roomId, playerKey, name, videoIds });
const run = (lobby: Lobby, ...actions: LobbyAction[]) => actions.reduce(lobbyReducer, lobby);
const named = (lobby: Lobby, name: string) => lobby.players.find((p) => p.name === name)!;

describe("creating a lobby", () => {
  it("puts the host first and keeps crew names, without songs", () => {
    const lobby = base();
    expect(lobby.players.map((p) => p.name)).toEqual(["Sohab", "Rupa", "Arjun"]);
    expect(lobby.players[0].id).toBe(lobby.hostId);
    expect(lobby.players.every((p) => !p.card)).toBe(true);
  });

  it("drops blank and repeated crew names", () => {
    const lobby = createLobby({ theme: "t", songs: 2, hostName: "Sohab", crew: ["rupa", " ", "Rupa", "sohab"] });
    expect(lobby.players.map((p) => p.name)).toEqual(["Sohab", "rupa"]);
  });
});

describe("roster", () => {
  it("rejects blank and duplicate names, ignoring case and spaces", () => {
    let lobby = run(base(), { type: "addPlayer", name: "  " });
    expect(lobby.notice).toEqual(expect.objectContaining({ kind: "error" }));
    lobby = run(lobby, { type: "addPlayer", name: " rupa " });
    expect(lobby.notice?.text).toMatch(/already a Rupa/);
    expect(lobby.players).toHaveLength(3);
  });

  it("keys players by id so two cards never share a slot", () => {
    const lobby = run(base(), { type: "addPlayer", name: "Tanvi" });
    expect(new Set(lobby.players.map((p) => p.id)).size).toBe(4);
  });

  it("never removes the host", () => {
    const lobby = base();
    expect(run(lobby, { type: "removePlayer", playerId: lobby.hostId }).players).toHaveLength(3);
  });
});

describe("importing cards", () => {
  it("fills the matching roster slot and reports only the name and count", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: card(lobby, "rupa", ids.slice(0, 2)) });
    const rupa = lobby.players.find((p) => p.name.toLowerCase() === "rupa")!;
    expect(rupa.card?.videoIds).toEqual(ids.slice(0, 2));
    expect(lobby.notice).toEqual({ kind: "added", text: "Rupa's card is in · 2 songs sealed" });
  });

  it("adds a newcomer who is not on the crew list", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Tanvi", ids.slice(0, 2)) });
    expect(lobby.players.map((p) => p.name)).toEqual(["Sohab", "Rupa", "Arjun", "Tanvi"]);
  });

  it("replaces a resent card from the same phone, and ignores an identical one", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(0, 2)) });
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(0, 2)) });
    expect(lobby.notice?.kind).toBe("unchanged");
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(2, 4)) });
    expect(lobby.notice).toEqual({ kind: "replaced", text: "Rupa's card was updated · 2 songs sealed" });
    expect(named(lobby, "Rupa").card?.videoIds).toEqual(ids.slice(2, 4));
  });

  it("follows a renamed resend from the same phone instead of adding a new player", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(0, 2), "rupa-phone") });
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa S", ids.slice(0, 2), "rupa-phone") });
    expect(lobby.players.map((p) => p.name)).toEqual(["Sohab", "Rupa S", "Arjun"]);
  });

  it("asks before letting a different phone overwrite a card with the same name", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(0, 2)) });
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(2, 4), "other-phone") });
    expect(lobby.notice?.kind).toBe("confirm-replace");
    expect(lobby.pendingCard?.playerKey).toBe("other-phone");
    expect(named(run(lobby, { type: "cancelReplace" }), "Rupa").card?.videoIds).toEqual(ids.slice(0, 2));
    lobby = run(lobby, { type: "confirmReplace" });
    expect(lobby.pendingCard).toBeNull();
    expect(named(lobby, "Rupa").card).toEqual({ playerKey: "other-phone", videoIds: ids.slice(2, 4) });
  });

  it("asks for a swap without naming who already has the song", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(0, 2)) });
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Arjun", [ids[2], ids[1]]) });
    expect(lobby.notice).toEqual({ kind: "swap", text: "Arjun's song 2 is already in the game. Ask Arjun to swap it and send a fresh card." });
    expect(lobby.notice?.text).not.toMatch(/Rupa/);
    expect(named(lobby, "Arjun").card).toBeUndefined();
    expect(named(lobby, "Arjun").swap).toEqual([2]);
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Arjun", ids.slice(2, 4)) });
    expect(named(lobby, "Arjun").swap).toBeUndefined();
  });

  it("checks the host's own songs the same way", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: card(lobby, "Rupa", ids.slice(0, 2)) });
    lobby = run(lobby, { type: "setHostSongs", videoIds: [ids[0], ids[5]] });
    expect(lobby.notice).toEqual({ kind: "swap", text: "Your song 1 is already in the game. Swap it for another song." });
    lobby = run(lobby, { type: "setHostSongs", videoIds: ids.slice(4, 6) });
    expect(lobby.players[0].card?.videoIds).toEqual(ids.slice(4, 6));
  });

  it("rejects cards for another game and refuses an eleventh player", () => {
    let lobby = base();
    lobby = run(lobby, { type: "importCard", card: { ...card(lobby, "Rupa", ids.slice(0, 2)), roomId: "other" } });
    expect(lobby.notice?.kind).toBe("error");
    let full = createLobby({ theme: "t", songs: 2, hostName: "H", crew: Array.from({ length: 9 }, (_, i) => `P${i}`) });
    full = run(full, { type: "importCard", card: card(full, "Late", ids.slice(0, 2)) });
    expect(full.notice?.text).toMatch(/10 players/);
  });
});

describe("starting", () => {
  it("is ready only when at least 3 players all have cards and no swap is waiting", () => {
    let lobby = base();
    expect(lobbyReady(lobby)).toBe(false);
    lobby = run(lobby,
      { type: "setHostSongs", videoIds: ids.slice(0, 2) },
      { type: "importCard", card: card(lobby, "Rupa", ids.slice(2, 4)) },
      { type: "importCard", card: card(lobby, "Arjun", ids.slice(4, 6)) });
    expect(lobbyReady(lobby)).toBe(true);
    const game = lobbyToGame(lobby, () => 0);
    expect(game.players.map((p) => p.name)).toEqual(["Sohab", "Rupa", "Arjun"]);
    expect(game.rounds).toHaveLength(6);
    expect(game.roomId).toBe(lobby.invite.roomId);
    expect(new Set(game.submissions.map((s) => s.videoId)).size).toBe(6);
  });

  it("can drop a player who never sent a card", () => {
    let lobby = run(base(), { type: "addPlayer", name: "Tanvi" });
    lobby = run(lobby, { type: "removePlayer", playerId: named(lobby, "Tanvi").id });
    expect(lobby.players.map((p) => p.name)).toEqual(["Sohab", "Rupa", "Arjun"]);
  });
});

describe("notices from outside the reducer", () => {
  it("shows a card that couldn't be opened as an error, and clears it on the next action", () => {
    let lobby = run(base(), { type: "showError", text: "This card is for a different game." });
    expect(lobby.notice).toEqual({ kind: "error", text: "This card is for a different game." });
    lobby = run(lobby, { type: "addPlayer", name: "Tanvi" });
    expect(lobby.notice).toBeNull();
  });
});
