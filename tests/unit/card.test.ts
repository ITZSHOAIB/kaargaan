import { describe, expect, it } from "vitest";
import { cardLink, cleanName, createInvite, extractCardPayload, inviteLink, openCard, readInviteFragment, sealCard, type SongCard } from "../../src/lib/card";

const invite = createInvite({ theme: "Songs on repeat", songs: 2, host: "Sohab" });
const card = (overrides: Partial<SongCard> = {}): SongCard => ({ v: 2, roomId: invite.roomId, playerKey: "key-rupa", name: "Rupa", videoIds: ["dQw4w9WgXcQ", "9bZkp7q19f0"], ...overrides });

describe("invite links", () => {
  it("round-trips the game details through the link fragment", () => {
    const link = inviteLink("https://kaargaan.sohab.dev", invite);
    expect(link.startsWith("https://kaargaan.sohab.dev/card#i=")).toBe(true);
    expect(readInviteFragment(new URL(link).hash)).toEqual({ ok: true, invite });
  });

  it("rejects broken or out-of-range invites", () => {
    expect(readInviteFragment("#i=garbage").ok).toBe(false);
    expect(readInviteFragment("").ok).toBe(false);
    const tooMany = inviteLink("https://x.dev", { ...invite, songs: 9 });
    expect(readInviteFragment(new URL(tooMany).hash).ok).toBe(false);
  });

  it("gives every invite its own room and key", () => {
    const other = createInvite({ theme: "t", songs: 3, host: "H" });
    expect(other.roomId).not.toBe(invite.roomId);
    expect(other.key).not.toBe(invite.key);
  });
});

describe("sealed cards", () => {
  it("opens a sealed card only with the matching invite", async () => {
    const sealed = await sealCard(card(), invite);
    expect(sealed).not.toContain("dQw4w9WgXcQ");
    expect(await openCard(sealed, invite)).toEqual({ ok: true, card: card() });
    const other = createInvite({ theme: "t", songs: 2, host: "H" });
    expect(await openCard(sealed, other)).toEqual({ ok: false, error: expect.stringMatching(/different game/) });
  });

  it("rejects a card whose song count does not match the game", async () => {
    const sealed = await sealCard(card({ videoIds: ["dQw4w9WgXcQ"] }), { ...invite, songs: 1 });
    const result = await openCard(sealed, invite);
    expect(result).toEqual({ ok: false, error: "Rupa's card has 1 song, but this game needs 2. Ask Rupa to open the newest invite link." });
  });

  it("rejects repeated songs inside one card", async () => {
    const sealed = await sealCard(card({ videoIds: ["dQw4w9WgXcQ", "dQw4w9WgXcQ"] }), invite);
    expect((await openCard(sealed, invite)).ok).toBe(false);
  });

  it("finds the card in a pasted link, in shared text, or as the bare code", async () => {
    const sealed = await sealCard(card(), invite);
    const link = cardLink("https://kaargaan.sohab.dev", sealed);
    expect(extractCardPayload(link)).toBe(sealed);
    expect(extractCardPayload(`Here's my card ${link} see you tonight`)).toBe(sealed);
    expect(extractCardPayload(`  ${sealed}\n`)).toBe(sealed);
    expect(extractCardPayload("hello")).toBeNull();
  });
});

describe("cleanName", () => {
  it("trims, collapses spaces and caps length", () => {
    expect(cleanName("  Rupa   Sen ")).toBe("Rupa Sen");
    expect(cleanName("   ")).toBe("");
    expect(cleanName("x".repeat(40))).toHaveLength(20);
  });
});
