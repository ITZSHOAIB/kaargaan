import type { RoomInvite, SongSlip } from "./types";
import { normalizeYouTubeLink } from "./youtube";

const SLIP_MAX_BYTES = 2048;
export const ENCRYPTED_SLIP_PREFIX = "kaargaan-encrypted-slip:v1:";

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
  for (const [index, link] of input.links.entries()) {
    const normalized = normalizeYouTubeLink(link);
    if (!normalized.ok) {
      return normalized;
    }
    if (!videoIds.includes(normalized.videoId)) {
      videoIds.push(normalized.videoId);
    } else {
      const firstIndex = input.links.findIndex((candidate) => {
        const previous = normalizeYouTubeLink(candidate);
        return previous.ok && previous.videoId === normalized.videoId;
      });
      return {
        ok: false,
        error: `Song ${index + 1} duplicates song ${firstIndex + 1}. Replace one of these links.`
      };
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

/** Encrypt a slip for a room-key text handoff, such as Discord. */
export async function encodeEncryptedSongSlip(slip: SongSlip, roomSecret: string): Promise<string> {
  const key = await deriveRoomKey(roomSecret);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(slip));
  const ciphertext = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  return `${ENCRYPTED_SLIP_PREFIX}${encodeBytes(combined)}`;
}

export async function decodeEncryptedSongSlip(payload: string, roomSecret: string): Promise<{ ok: true; slip: SongSlip } | { ok: false; error: string }> {
  if (!payload.startsWith(ENCRYPTED_SLIP_PREFIX)) {
    return { ok: false, error: "This is not an encrypted KaarGaan song slip." };
  }

  try {
    const combined = decodeBytes(payload.slice(ENCRYPTED_SLIP_PREFIX.length));
    if (combined.length <= 12) {
      return { ok: false, error: "The encrypted song slip is incomplete." };
    }
    const key = await deriveRoomKey(roomSecret);
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: combined.slice(0, 12) },
      key,
      combined.slice(12)
    );
    return decodeSongSlip(new TextDecoder().decode(plaintext));
  } catch {
    return { ok: false, error: "Could not decrypt this song slip for the current room." };
  }
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
      const positions = parsed.videoIds.flatMap((id, index, ids) => ids.filter(other => other === id).length > 1 ? [index + 1] : []);
      return { ok: false, error: `Songs ${positions.join(", ")} repeat within this entry. Keep one copy of each song, replace the others, and generate a fresh QR or code.` };
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
      typeof parsed.roomId !== "string" || !parsed.roomId.trim() ||
      typeof parsed.roomToken !== "string" || !parsed.roomToken.trim() ||
      typeof parsed.theme !== "string" ||
      !Number.isInteger(parsed.songsPerPlayer) || Number(parsed.songsPerPlayer) < 1 || Number(parsed.songsPerPlayer) > 5 ||
      !Number.isInteger(parsed.playerCount) || Number(parsed.playerCount) < 3 || Number(parsed.playerCount) > 10
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

  return importDecodedSlip(decoded.slip, expectedSongCount);
}

export async function importEncryptedSongSlip(
  payload: string,
  roomSecret: string,
  expectedSongCount: number
): Promise<{ ok: true; links: string[]; playerName: string; roomId?: string; roomToken?: string } | { ok: false; error: string }> {
  const decoded = await decodeEncryptedSongSlip(payload, roomSecret);
  if (!decoded.ok) {
    return decoded;
  }

  return importDecodedSlip(decoded.slip, expectedSongCount);
}

function importDecodedSlip(
  slip: SongSlip,
  expectedSongCount: number
): { ok: true; links: string[]; playerName: string; roomId?: string; roomToken?: string } | { ok: false; error: string } {

  if (slip.videoIds.length !== expectedSongCount) {
    const actualLabel = slip.videoIds.length === 1 ? "song" : "songs";
    const expectedLabel = expectedSongCount === 1 ? "song" : "songs";
    return {
      ok: false,
      error: `This slip contains ${slip.videoIds.length} ${actualLabel}, but the room needs ${expectedSongCount} ${expectedLabel}.`
    };
  }

  return {
    ok: true,
    links: slip.videoIds.map((videoId) => `https://www.youtube.com/watch?v=${videoId}`),
    playerName: slip.playerName,
    ...(slip.roomId ? { roomId: slip.roomId } : {}),
    ...(slip.roomToken ? { roomToken: slip.roomToken } : {})
  };
}

async function deriveRoomKey(roomSecret: string): Promise<CryptoKey> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(roomSecret));
  return globalThis.crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
