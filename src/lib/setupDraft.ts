import { useSyncExternalStore } from "react";
import { decodeRoomInvite } from "./songSlip";
import type { RoomInvite } from "./types";

export type SetupPlayer = { id: string; name: string; links: string[] };
export type SetupScreen = "roster" | "invite" | "private" | "handoff" | "ready";
export type HostDraft = {
  version: 1;
  theme: string; songCount: number; hostName: string; playerCount: number;
  players: SetupPlayer[]; lockedPlayerIds: string[];
  screen: SetupScreen; currentPlayerIndex: number; pendingNextPlayerIndex: number | null;
  roomId: string; roomToken: string; importedPlayerId: string | null; pendingEntry: SetupPlayer | null;
};
export type PlayerDraft = { version: 1; invite: RoomInvite; playerName: string; links: { value: string }[] };
export const HOST_DRAFT_KEY = "kaargaan.host-setup.v1";
export const PLAYER_DRAFT_KEY = "kaargaan.player-setup.v1";
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const boundedInteger = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

export function loadHostDraft(): HostDraft | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HOST_DRAFT_KEY) ?? "null");
    if (!isObject(value) || value.version !== 1 || typeof value.roomId !== "string" || !value.roomId || typeof value.roomToken !== "string" || !value.roomToken || typeof value.theme !== "string" || typeof value.hostName !== "string" || !boundedInteger(value.songCount, 1, 5) || !boundedInteger(value.playerCount, 3, 10)) return null;
    if (!Array.isArray(value.players) || value.players.length !== value.playerCount || !value.players.every(p => isObject(p) && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.links) && p.links.length === value.songCount && p.links.every((link: unknown) => typeof link === "string"))) return null;
    const ids = value.players.map(p => p.id);
    if (new Set(ids).size !== ids.length || !Array.isArray(value.lockedPlayerIds) || !value.lockedPlayerIds.every(id => ids.includes(id))) return null;
    if (!boundedInteger(value.currentPlayerIndex, 0, ids.length - 1) || (value.pendingNextPlayerIndex !== null && !boundedInteger(value.pendingNextPlayerIndex, 0, ids.length - 1))) return null;
    if (!["roster", "invite", "private", "handoff", "ready"].includes(String(value.screen)) || (value.screen === "handoff" && value.pendingNextPlayerIndex === null) || (value.importedPlayerId !== null && value.importedPlayerId !== ids[value.currentPlayerIndex])) return null;
    if (value.pendingEntry !== null && (!isObject(value.pendingEntry) || value.pendingEntry.id !== ids[value.currentPlayerIndex] || typeof value.pendingEntry.name !== "string" || !Array.isArray(value.pendingEntry.links) || value.pendingEntry.links.length !== value.songCount || !value.pendingEntry.links.every(link => typeof link === "string"))) return null;
    if ((value.pendingEntry === null) !== (value.importedPlayerId === null)) return null;
    return value as HostDraft;
  } catch { return null; }
}

export function loadPlayerDraft(): PlayerDraft | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PLAYER_DRAFT_KEY) ?? "null");
    if (!isObject(value) || value.version !== 1 || typeof value.playerName !== "string" || !Array.isArray(value.links)) return null;
    const decoded = decodeRoomInvite(JSON.stringify(value.invite));
    if (!decoded.ok || value.links.length !== decoded.invite.songsPerPlayer || !value.links.every(link => isObject(link) && typeof link.value === "string")) return null;
    return { version: 1, invite: decoded.invite, playerName: value.playerName, links: value.links as { value: string }[] };
  } catch { return null; }
}

const errors = new Map<string, string>();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useDraftStatus(key: string) {
  return useSyncExternalStore(subscribe, () => errors.get(key) ?? "");
}
export function saveDraft(key: string, value: HostDraft | PlayerDraft): void {
  let error = "";
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { error = "This browser could not save setup progress. Keep this page open until the game starts."; }
  if (error !== (errors.get(key) ?? "")) {
    errors.set(key, error);
    listeners.forEach(listener => listener());
  }
}
