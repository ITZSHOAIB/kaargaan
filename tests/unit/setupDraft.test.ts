// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { HOST_DRAFT_KEY, PLAYER_DRAFT_KEY, loadHostDraft, loadPlayerDraft, saveDraft, type HostDraft } from "../../src/lib/setupDraft";
const draft: HostDraft = {
  version: 1, theme: "Theme", songCount: 1, hostName: "Host", playerCount: 3,
  players: [{ id: "host", name: "Host", links: ["https://youtu.be/dQw4w9WgXcQ"] }, { id: "p2", name: "Player 2", links: [""] }, { id: "p3", name: "Player 3", links: [""] }],
  lockedPlayerIds: ["host"], screen: "private", currentPlayerIndex: 1, pendingNextPlayerIndex: null,
  roomId: "room", roomToken: "token", importedPlayerId: "p2", pendingEntry: { id: "p2", name: "New name", links: ["https://youtu.be/9bZkp7q19f0"] }
};
beforeEach(() => localStorage.clear());
describe("setup recovery", () => {
  it("preserves room identity, locked entries and a pending confirmation separately", () => {
    saveDraft(HOST_DRAFT_KEY, draft);
    expect(loadHostDraft()).toEqual(draft);
    expect(loadHostDraft()?.players[1].links).toEqual([""]);
  });
  it("rejects malformed or out of range host state", () => {
    for (const bad of ["broken", { ...draft, currentPlayerIndex: 99 }, { ...draft, pendingEntry: { ...draft.pendingEntry, id: "other" } }, { ...draft, lockedPlayerIds: ["unknown"] }, { ...draft, songCount: 0 }, { ...draft, pendingEntry: null }]) {
      localStorage.setItem(HOST_DRAFT_KEY, JSON.stringify(bad));
      expect(loadHostDraft()).toBeNull();
    }
  });
  it("restores player drafts and rejects invalid room settings", () => {
    const player = { version: 1 as const, invite: { format: "kaargaan-room-invite" as const, version: 1 as const, roomId: "room", roomToken: "token", theme: "Theme", songsPerPlayer: 1, playerCount: 3 }, playerName: "Player", links: [{ value: "https://youtu.be/dQw4w9WgXcQ" }] };
    saveDraft(PLAYER_DRAFT_KEY, player);
    expect(loadPlayerDraft()).toEqual(player);
    localStorage.setItem(PLAYER_DRAFT_KEY, JSON.stringify({ ...player, invite: { ...player.invite, songsPerPlayer: 500 } }));
    expect(loadPlayerDraft()).toBeNull();
  });
});
