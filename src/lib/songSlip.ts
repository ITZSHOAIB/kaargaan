import type { RoomInvite, SongSlip } from "./types";
import { normalizeYouTubeLink } from "./youtube";

const SLIP_MAX_BYTES = 2048;

export function createSongSlip(input: {
  playerName: string;
  theme: string;
  links: string[];
  roomId?: string;
  roomToken?: string;
  songsPerPlayer?: number;
}): { ok: true; slip: SongSlip } | { ok: false; error: string } {
  const playerName = input.playerName.trim();
  const theme = input.theme.trim();
  if (!playerName) {
    return { ok: false, error: "Player name is required." };
  }
  if (!theme) {
    return { ok: false, error: "Theme is required." };
  }
  if (input.links.length < 1) {
    return { ok: false, error: "Add at least one link." };
  }
  if (input.links.length > 5) {
    return { ok: false, error: "Song slips support up to 5 songs." };
  }

  const videoIds: string[] = [];
  for (const link of input.links) {
    const normalized = normalizeYouTubeLink(link);
    if (!normalized.ok) {
      return normalized;
    }
    if (!videoIds.includes(normalized.videoId)) {
      videoIds.push(normalized.videoId);
    }
  }

  const slip: SongSlip = {
    format: "kaargaan-song-slip",
    version: 1,
    playerName,
    theme,
    videoIds,
    ...(input.roomId ? { roomId: input.roomId } : {}),
    ...(input.roomToken ? { roomToken: input.roomToken } : {}),
    ...(input.songsPerPlayer ? { songsPerPlayer: input.songsPerPlayer } : {})
  };

  const encoded = JSON.stringify(slip);
  if (new TextEncoder().encode(encoded).length > SLIP_MAX_BYTES) {
    return { ok: false, error: "That slip is too large for a compact QR transfer." };
  }

  return { ok: true, slip };
}

export function encodeSongSlip(slip: SongSlip): string {
  return encodeText(JSON.stringify(slip));
}

export function decodeSongSlip(payload: string): { ok: true; slip: SongSlip } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(decodePayload(payload)) as Partial<SongSlip>;
    if (
      parsed?.format !== "kaargaan-song-slip" ||
      parsed.version !== 1 ||
      typeof parsed.playerName !== "string" ||
      typeof parsed.theme !== "string" ||
      !Array.isArray(parsed.videoIds)
    ) {
      return { ok: false, error: "This QR payload is not a KaarGaan song slip." };
    }
    if (parsed.videoIds.length < 1 || parsed.videoIds.length > 5) {
      return { ok: false, error: "Imported slips must contain 1 to 5 songs." };
    }
    if (new Set(parsed.videoIds).size !== parsed.videoIds.length) {
      return { ok: false, error: "Duplicate songs are not allowed inside one slip." };
    }
    if (parsed.videoIds.some((id) => !/^[A-Za-z0-9_-]{11}$/.test(id))) {
      return { ok: false, error: "The slip contains an invalid video id." };
    }
    return { ok: true, slip: parsed as SongSlip };
  } catch {
    return { ok: false, error: "Could not read that QR payload." };
  }
}

export function createRoomInvite(input: Omit<RoomInvite, "format" | "version">): RoomInvite {
  return { format: "kaargaan-room-invite", version: 1, ...input };
}

export function encodeRoomInvite(invite: RoomInvite): string {
  return encodeText(JSON.stringify(invite));
}

export function decodeRoomInvite(payload: string): { ok: true; invite: RoomInvite } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(decodePayload(payload)) as Partial<RoomInvite>;
    if (
      parsed.format !== "kaargaan-room-invite" ||
      parsed.version !== 1 ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.roomToken !== "string" ||
      typeof parsed.theme !== "string" ||
      !Number.isInteger(parsed.songsPerPlayer) ||
      !Number.isInteger(parsed.playerCount)
    ) {
      return { ok: false, error: "This QR is not a KaarGaan room invite." };
    }
    return { ok: true, invite: parsed as RoomInvite };
  } catch {
    return { ok: false, error: "Could not read that room QR." };
  }
}

function encodeText(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeText(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodePayload(value: string): string {
  try {
    return decodeText(value);
  } catch {
    return value;
  }
}

export function importSongSlip(
  payload: string,
  expectedSongCount: number
): { ok: true; links: string[]; playerName: string; roomId?: string; roomToken?: string } | { ok: false; error: string } {
  const decoded = decodeSongSlip(payload);
  if (!decoded.ok) {
    return decoded;
  }

  if (decoded.slip.videoIds.length !== expectedSongCount) {
    const actualLabel = decoded.slip.videoIds.length === 1 ? "song" : "songs";
    const expectedLabel = expectedSongCount === 1 ? "song" : "songs";
    return {
      ok: false,
      error: `This slip contains ${decoded.slip.videoIds.length} ${actualLabel}, but the room needs ${expectedSongCount} ${expectedLabel}.`
    };
  }

  return {
    ok: true,
    links: decoded.slip.videoIds.map((videoId) => `https://www.youtube.com/watch?v=${videoId}`),
    playerName: decoded.slip.playerName,
    ...(decoded.slip.roomId ? { roomId: decoded.slip.roomId } : {}),
    ...(decoded.slip.roomToken ? { roomToken: decoded.slip.roomToken } : {})
  };
}
