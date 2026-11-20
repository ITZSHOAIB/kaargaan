// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createInvite } from "../../src/lib/card";
import { CARD_DRAFT_KEY, loadCardDraft, saveCardDraft, startDraft } from "../../src/lib/cardDraft";

beforeEach(() => localStorage.clear());
const invite = createInvite({ theme: "Rain", songs: 3, host: "Sohab" });

describe("card drafts", () => {
  it("starts empty with one slot per song and a phone key", () => {
    const draft = startDraft(invite, null);
    expect(draft.links).toEqual(["", "", ""]);
    expect(draft.playerKey).toMatch(/.{8,}/);
    expect(draft.sealed).toBeNull();
  });

  it("keeps songs and key when the same invite is opened again", () => {
    const draft = { ...startDraft(invite, null), name: "Rupa", links: ["a", "b", "c"], sealed: "kg2.x" };
    expect(startDraft(invite, draft)).toEqual(draft);
  });

  it("keeps only the name and phone key for a new game", () => {
    const draft = { ...startDraft(invite, null), name: "Rupa", links: ["a", "b", "c"], sealed: "kg2.x" };
    const next = createInvite({ theme: "Other", songs: 2, host: "Arjun" });
    expect(startDraft(next, draft)).toEqual({ v: 2, invite: next, playerKey: draft.playerKey, name: "Rupa", links: ["", ""], sealed: null });
  });

  it("survives a reload and ignores broken saves", () => {
    const draft = { ...startDraft(invite, null), name: "Rupa" };
    expect(saveCardDraft(draft)).toBe("");
    expect(loadCardDraft()).toEqual(draft);
    localStorage.setItem(CARD_DRAFT_KEY, JSON.stringify({ ...draft, links: ["only one"] }));
    expect(loadCardDraft()).toBeNull();
    localStorage.setItem(CARD_DRAFT_KEY, "nope");
    expect(loadCardDraft()).toBeNull();
  });
});
