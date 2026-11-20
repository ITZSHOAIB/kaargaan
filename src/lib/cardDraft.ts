import { parseInvite, type Invite } from "./card";

export const CARD_DRAFT_KEY = "kaargaan.card-draft.v2";

/** A player's card in progress on their own phone. `sealed` is the last card they sealed. */
export type CardDraft = { v: 2; invite: Invite; playerKey: string; name: string; links: string[]; sealed: string | null };

/** Reopening the same invite keeps the songs; a new game keeps only the name and the phone's key. */
export function startDraft(invite: Invite, previous: CardDraft | null): CardDraft {
  if (previous?.invite.roomId === invite.roomId && previous.links.length === invite.songs) return previous;
  return {
    v: 2,
    invite,
    playerKey: previous?.playerKey ?? crypto.randomUUID(),
    name: previous?.name ?? "",
    links: Array.from({ length: invite.songs }, () => ""),
    sealed: null
  };
}

export function saveCardDraft(draft: CardDraft): string {
  try {
    localStorage.setItem(CARD_DRAFT_KEY, JSON.stringify(draft));
    return "";
  } catch {
    return "This phone could not save your card. Keep this page open until you've sent it.";
  }
}

export function loadCardDraft(): CardDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(CARD_DRAFT_KEY) ?? "null") as Partial<CardDraft> | null;
    const invite = parseInvite(value?.invite);
    if (!value || value.v !== 2 || !invite || typeof value.playerKey !== "string" || typeof value.name !== "string") return null;
    if (!Array.isArray(value.links) || value.links.length !== invite.songs || !value.links.every((l) => typeof l === "string")) return null;
    if (value.sealed !== null && typeof value.sealed !== "string") return null;
    return { v: 2, invite, playerKey: value.playerKey, name: value.name, links: value.links, sealed: value.sealed };
  } catch {
    return null;
  }
}
