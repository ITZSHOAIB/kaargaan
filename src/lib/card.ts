/**
 * Sealed song cards. The host shares an invite link; each player builds a card on their own
 * phone and sends the sealed card link back. The seal keeps songs off every screen until the
 * reveal. It's AES-GCM keyed by the invite, so it keeps out people outside the game, not the
 * host's own phone (see docs/adr/0006-sealed-song-cards.md).
 */
export type Invite = { v: 2; roomId: string; key: string; theme: string; songs: number; host: string };
export type SongCard = { v: 2; roomId: string; playerKey: string; name: string; videoIds: string[] };
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

export const MAX_NAME_LENGTH = 20;
export const MAX_SONGS = 5;
const CARD_PREFIX = "kg2.";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const DIFFERENT_GAME = "This card is for a different game. Ask them to open your newest invite link and send a fresh card.";

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH).trim();
}

export function sameName(a: string, b: string): boolean {
  return cleanName(a).toLocaleLowerCase() === cleanName(b).toLocaleLowerCase();
}

export function createInvite(input: { theme: string; songs: number; host: string }): Invite {
  return { v: 2, roomId: crypto.randomUUID(), key: toBase64Url(crypto.getRandomValues(new Uint8Array(16))), theme: input.theme.trim(), songs: input.songs, host: cleanName(input.host) };
}

export function inviteLink(origin: string, invite: Invite): string {
  return `${origin}/card#i=${toBase64Url(new TextEncoder().encode(JSON.stringify(invite)))}`;
}

export function readInviteFragment(hash: string): Result<{ invite: Invite }> {
  const raw = new URLSearchParams(hash.replace(/^#/, "")).get("i");
  if (!raw) return { ok: false, error: "This link has no game invite in it." };
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(raw)));
    const invite = parseInvite(value);
    return invite ? { ok: true, invite } : { ok: false, error: "This invite link is broken. Ask the host to send it again." };
  } catch {
    return { ok: false, error: "This invite link is broken. Ask the host to send it again." };
  }
}

export function parseInvite(value: unknown): Invite | null {
  if (!isRecord(value) || value.v !== 2) return null;
  const { roomId, key, theme, songs, host } = value;
  if (typeof roomId !== "string" || !roomId || typeof key !== "string" || !key) return null;
  if (typeof theme !== "string" || typeof host !== "string") return null;
  if (!Number.isInteger(songs) || Number(songs) < 1 || Number(songs) > MAX_SONGS) return null;
  return { v: 2, roomId, key, theme, songs: Number(songs), host };
}

export function cardLink(origin: string, sealed: string): string {
  return `${origin}/stage#c=${sealed}`;
}

/** Finds a sealed card in a pasted link, in shared text, or as the bare code. */
export function extractCardPayload(text: string): string | null {
  return text.match(/kg2\.[A-Za-z0-9_-]{16,}/)?.[0] ?? null;
}

export async function sealCard(card: SongCard, invite: Invite): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(card));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cardKey(invite), plain));
  const bytes = new Uint8Array(iv.length + sealed.length);
  bytes.set(iv);
  bytes.set(sealed, iv.length);
  return CARD_PREFIX + toBase64Url(bytes);
}

export async function openCard(sealed: string, invite: Pick<Invite, "roomId" | "key" | "songs">): Promise<Result<{ card: SongCard }>> {
  let value: unknown;
  try {
    const bytes = fromBase64Url(sealed.slice(CARD_PREFIX.length));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, await cardKey(invite), bytes.slice(12));
    value = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return { ok: false, error: DIFFERENT_GAME };
  }
  if (!isRecord(value) || value.v !== 2 || value.roomId !== invite.roomId) return { ok: false, error: DIFFERENT_GAME };
  const name = typeof value.name === "string" ? cleanName(value.name) : "";
  const { playerKey, videoIds } = value;
  if (!name || typeof playerKey !== "string" || !playerKey || !Array.isArray(videoIds) || !videoIds.every((id) => typeof id === "string" && VIDEO_ID.test(id))) {
    return { ok: false, error: "This card is damaged. Ask the player to send it again." };
  }
  if (videoIds.length !== invite.songs) {
    return { ok: false, error: `${name}'s card has ${plural(videoIds.length, "song")}, but this game needs ${invite.songs}. Ask ${name} to open the newest invite link.` };
  }
  if (new Set(videoIds).size !== videoIds.length) {
    return { ok: false, error: `${name}'s card repeats a song. Ask ${name} to pick a different one and send a fresh card.` };
  }
  return { ok: true, card: { v: 2, roomId: invite.roomId, playerKey, name, videoIds: videoIds as string[] } };
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

async function cardKey(invite: Pick<Invite, "roomId" | "key">): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`kaargaan-card:${invite.roomId}:${invite.key}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
