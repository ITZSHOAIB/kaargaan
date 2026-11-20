import { cleanName, MAX_SONGS, parseInvite } from "./card";
import { MAX_PLAYERS, type Lobby, type LobbyPlayer } from "./lobby";

export const LOBBY_KEY = "kaargaan.stage-lobby.v2";
export const CREW_KEY = "kaargaan.crew.v1";
const LEGACY_KEYS = ["kaargaan.host-setup.v1", "kaargaan.player-setup.v1", "kaargaan.phase1.snapshot.v1"];

export type Crew = { hostName: string; names: string[]; theme: string; songs: number };

/** Saves the lobby without its passing notice, so a reload restores the cards but not a stale message. */
export function saveLobby(lobby: Lobby): string {
  try {
    localStorage.setItem(LOBBY_KEY, JSON.stringify({ ...lobby, notice: null, pendingCard: null }));
    return "";
  } catch {
    return "This phone could not save the lobby. Keep this page open until the game starts.";
  }
}

export function loadLobby(): Lobby | null {
  const value = readJson(LOBBY_KEY);
  if (!isRecord(value) || value.v !== 2 || typeof value.hostId !== "string" || !Array.isArray(value.players)) return null;
  const invite = parseInvite(value.invite);
  if (!invite || value.players.length > MAX_PLAYERS || !value.players.every((p) => isPlayer(p, invite.songs))) return null;
  const players = value.players as LobbyPlayer[];
  if (!players.some((p) => p.id === value.hostId) || new Set(players.map((p) => p.id)).size !== players.length) return null;
  return { v: 2, invite, hostId: value.hostId, players, notice: null, pendingCard: null };
}

export function clearLobby(): void {
  try { localStorage.removeItem(LOBBY_KEY); } catch { /* storage unavailable */ }
}

export function saveCrew(crew: Crew): void {
  try { localStorage.setItem(CREW_KEY, JSON.stringify(crew)); } catch { /* remembering the crew is a convenience */ }
}

export function loadCrew(): Crew | null {
  const value = readJson(CREW_KEY);
  if (!isRecord(value) || typeof value.hostName !== "string" || typeof value.theme !== "string" || !Array.isArray(value.names)) return null;
  if (!Number.isInteger(value.songs) || Number(value.songs) < 1 || Number(value.songs) > MAX_SONGS) return null;
  const names = value.names.filter((n): n is string => typeof n === "string" && Boolean(cleanName(n)));
  return { hostName: value.hostName, names, theme: value.theme, songs: Number(value.songs) };
}

/** Drops saves from the old pass-the-phone setup, which the new flow can't resume. */
export function forgetLegacySaves(): void {
  try { LEGACY_KEYS.forEach((key) => localStorage.removeItem(key)); } catch { /* storage unavailable */ }
}

function isPlayer(value: unknown, songs: number): boolean {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !cleanName(value.name)) return false;
  if (value.card !== undefined) {
    const card = value.card;
    if (!isRecord(card) || typeof card.playerKey !== "string" || !Array.isArray(card.videoIds) || card.videoIds.length !== songs || !card.videoIds.every((id) => typeof id === "string")) return false;
  }
  return value.swap === undefined || (Array.isArray(value.swap) && value.swap.every((n) => Number.isInteger(n)));
}

function readJson(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
