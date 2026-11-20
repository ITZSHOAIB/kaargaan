import { createGame } from "./gameEngine";
import { cleanName, createInvite, plural, sameName, type Invite, type SongCard } from "./card";
import type { Game, Submission } from "./types";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export type LobbyPlayer = { id: string; name: string; card?: { playerKey: string; videoIds: string[] }; swap?: number[] };
export type Notice = { kind: "added" | "replaced" | "unchanged" | "swap" | "confirm-replace" | "error"; text: string };
/** The stage's waiting room. Cards stay sealed here: no screen shows a song next to its owner. */
export type Lobby = { v: 2; invite: Invite; hostId: string; players: LobbyPlayer[]; notice: Notice | null; pendingCard: SongCard | null };
export type LobbyAction =
  | { type: "addPlayer"; name: string }
  | { type: "removePlayer"; playerId: string }
  | { type: "importCard"; card: SongCard }
  | { type: "setHostSongs"; videoIds: string[] }
  | { type: "confirmReplace" }
  | { type: "cancelReplace" }
  | { type: "dismissNotice" };

export function createLobby(input: { theme: string; songs: number; hostName: string; crew: string[] }): Lobby {
  const invite = createInvite({ theme: input.theme, songs: input.songs, host: input.hostName });
  const hostId = newPlayerId();
  const players: LobbyPlayer[] = [{ id: hostId, name: invite.host }];
  for (const raw of input.crew) {
    const name = cleanName(raw);
    if (name && players.length < MAX_PLAYERS && !players.some((p) => sameName(p.name, name))) players.push({ id: newPlayerId(), name });
  }
  return { v: 2, invite, hostId, players, notice: null, pendingCard: null };
}

export function lobbyReducer(lobby: Lobby, action: LobbyAction): Lobby {
  switch (action.type) {
    case "addPlayer": {
      const name = cleanName(action.name);
      if (!name) return notice(lobby, "error", "Type a name first.");
      if (lobby.players.some((p) => sameName(p.name, name))) return notice(lobby, "error", `There's already a ${existingName(lobby, name)}. Add an initial to tell them apart.`);
      if (lobby.players.length >= MAX_PLAYERS) return notice(lobby, "error", `A game holds up to ${MAX_PLAYERS} players.`);
      return { ...lobby, players: [...lobby.players, { id: newPlayerId(), name }], notice: null };
    }
    case "removePlayer":
      if (action.playerId === lobby.hostId) return lobby;
      return { ...lobby, players: lobby.players.filter((p) => p.id !== action.playerId), notice: null };
    case "importCard":
      return importCard(lobby, action.card);
    case "setHostSongs": {
      const host = lobby.players.find((p) => p.id === lobby.hostId)!;
      return applyCard(lobby, { v: 2, roomId: lobby.invite.roomId, playerKey: lobby.hostId, name: host.name, videoIds: action.videoIds }, host);
    }
    case "confirmReplace": {
      const card = lobby.pendingCard;
      const target = card && lobby.players.find((p) => sameName(p.name, card.name));
      return card && target ? applyCard({ ...lobby, pendingCard: null }, card, target) : { ...lobby, pendingCard: null };
    }
    case "cancelReplace":
      return { ...lobby, pendingCard: null, notice: null };
    case "dismissNotice":
      return { ...lobby, notice: null };
  }
}

export function lobbyReady(lobby: Lobby): boolean {
  return lobby.players.length >= MIN_PLAYERS && lobby.players.every((p) => p.card && !p.swap);
}

export function lobbyToGame(lobby: Lobby, random = Math.random): Game {
  if (!lobbyReady(lobby)) throw new Error("Every player needs a sealed card before the game starts.");
  const submissions: Submission[] = lobby.players.flatMap((p) => p.card!.videoIds.map((videoId, i) => ({ id: `submission-${p.id}-${i + 1}`, ownerId: p.id, videoId })));
  return createGame(lobby.invite.theme, lobby.players.map(({ id, name }) => ({ id, name })), submissions, random, lobby.invite.roomId);
}

function importCard(lobby: Lobby, card: SongCard): Lobby {
  if (card.roomId !== lobby.invite.roomId) return notice(lobby, "error", "This card is for a different game. Ask them to open your newest invite link and send a fresh card.");
  const byKey = lobby.players.find((p) => p.card?.playerKey === card.playerKey);
  if (byKey) return applyCard(lobby, card, byKey);
  const byName = lobby.players.find((p) => sameName(p.name, card.name));
  if (byName?.id === lobby.hostId) return notice(lobby, "error", `${byName.name} is the host's name. Ask this player to add an initial to their name and send a fresh card.`);
  if (byName?.card) {
    return { ...lobby, pendingCard: card, notice: { kind: "confirm-replace", text: `There's already a card from ${byName.name}. Replace it with this one? If it's from someone else, ask them to add an initial to their name.` } };
  }
  if (!byName && lobby.players.length >= MAX_PLAYERS) return notice(lobby, "error", `This game is full at ${MAX_PLAYERS} players.`);
  return applyCard(lobby, card, byName);
}

/** Puts a card into a slot. A clash names only the incoming player, never who already has the song. */
function applyCard(lobby: Lobby, card: SongCard, target: LobbyPlayer | undefined): Lobby {
  const isHost = target?.id === lobby.hostId;
  if (card.videoIds.length !== lobby.invite.songs) return notice(lobby, "error", `This game needs ${plural(lobby.invite.songs, "song")} from everyone.`);
  // A resend from the same phone may carry a new name; a roster slot otherwise keeps the host's spelling.
  const renamed = target?.card?.playerKey === card.playerKey && !lobby.players.some((p) => p.id !== target.id && sameName(p.name, card.name));
  const name = target && !renamed ? target.name : cleanName(card.name);
  const taken = new Set(lobby.players.filter((p) => p.id !== target?.id).flatMap((p) => p.card?.videoIds ?? []));
  const clashes = card.videoIds.flatMap((id, i) => (taken.has(id) ? [i + 1] : []));
  const slot: LobbyPlayer = target ? { ...target, name } : { id: newPlayerId(), name };
  const upsert = (player: LobbyPlayer) => target ? lobby.players.map((p) => (p.id === target.id ? player : p)) : [...lobby.players, player];

  if (clashes.length) {
    const songs = `song${clashes.length === 1 ? "" : "s"} ${listJoin(clashes)} ${clashes.length === 1 ? "is" : "are"}`;
    const text = isHost
      ? `Your ${songs} already in the game. Swap ${clashes.length === 1 ? "it" : "them"} for another song.`
      : `${name}'s ${songs} already in the game. Ask ${name} to swap ${clashes.length === 1 ? "it" : "them"} and send a fresh card.`;
    const player = slot.card ? slot : { ...slot, swap: clashes };
    return { ...lobby, players: upsert(player), notice: { kind: "swap", text } };
  }

  const unchanged = target?.card?.playerKey === card.playerKey && target.card.videoIds.join() === card.videoIds.join() && target.name === name;
  if (unchanged) return notice(lobby, "unchanged", isHost ? "Your songs are already sealed." : `${name}'s card is already in.`);
  const replaced = Boolean(target?.card);
  const player: LobbyPlayer = { id: slot.id, name, card: { playerKey: card.playerKey, videoIds: [...card.videoIds] } };
  const sealed = plural(card.videoIds.length, "song");
  const text = isHost
    ? `Your songs are ${replaced ? "updated" : "in"} · ${sealed} sealed`
    : replaced ? `${name}'s card was updated · ${sealed} sealed` : `${name}'s card is in · ${sealed} sealed`;
  return { ...lobby, players: upsert(player), pendingCard: null, notice: { kind: replaced ? "replaced" : "added", text } };
}

function notice(lobby: Lobby, kind: Notice["kind"], text: string): Lobby {
  return { ...lobby, notice: { kind, text } };
}

function existingName(lobby: Lobby, name: string): string {
  return lobby.players.find((p) => sameName(p.name, name))?.name ?? name;
}

function listJoin(items: number[]): string {
  return items.length < 2 ? String(items[0]) : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function newPlayerId(): string {
  return `p-${crypto.randomUUID()}`;
}
