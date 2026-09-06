import { describe, expect, it } from "vitest";
import { createRoomInvite, createSongSlip, decodeEncryptedSongSlip, decodeRoomInvite, decodeSongSlip, encodeEncryptedSongSlip, encodeRoomInvite, encodeSongSlip, importEncryptedSongSlip, importSongSlip } from "../../src/lib/songSlip";

describe("song slip", () => {
  it("creates a compact slip from valid links", () => {
    const result = createSongSlip({
      playerName: "Asha",
      theme: "Monsoon",
      links: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slip.videoIds).toEqual(["dQw4w9WgXcQ"]);
    }
  });

  it("rejects duplicate IDs inside one slip", () => {
    const decoded = decodeSongSlip(
      JSON.stringify({
        format: "kaargaan-song-slip",
        version: 1,
        playerName: "Asha",
        theme: "Monsoon",
        videoIds: ["dQw4w9WgXcQ", "dQw4w9WgXcQ"]
      })
    );

    expect(decoded.ok).toBe(false);
  });

  it("rejects duplicate links before generating a slip", () => {
    expect(
      createSongSlip({
        playerName: "Asha",
        theme: "Monsoon",
        links: [
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          "https://youtu.be/dQw4w9WgXcQ"
        ]
      })
    ).toEqual({
      ok: false,
      error: "Song 2 duplicates song 1. Replace one of these links."
    });
  });

  it("round-trips the compact encoded submission and room invite payloads", () => {
    const slip = createSongSlip({
      playerName: "Asha",
      theme: "Monsoon",
      links: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
      roomId: "room-1",
      roomToken: "token-1",
      songsPerPlayer: 1
    });
    expect(slip.ok).toBe(true);
    if (slip.ok) expect(decodeSongSlip(encodeSongSlip(slip.slip))).toEqual(slip);

    const invite = createRoomInvite({ roomId: "room-1", roomToken: "token-1", theme: "Monsoon", songsPerPlayer: 1, playerCount: 4 });
    expect(decodeRoomInvite(encodeRoomInvite(invite))).toEqual({ ok: true, invite });
  });

  it("round-trips an encrypted entry with the room secret", async () => {
    const slip = createSongSlip({
      playerName: "Asha",
      theme: "Monsoon",
      links: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
      roomId: "room-1",
      roomToken: "token-1",
      songsPerPlayer: 1
    });
    expect(slip.ok).toBe(true);
    if (!slip.ok) return;

    const payload = await encodeEncryptedSongSlip(slip.slip, "room-1:token-1");
    expect(payload).toMatch(/^kaargaan-encrypted-slip:v1:/);
    expect(await decodeEncryptedSongSlip(payload, "room-1:token-1")).toEqual({ ok: true, slip: slip.slip });
    expect((await decodeEncryptedSongSlip(payload, "room-1:wrong-token")).ok).toBe(false);
    expect(await importEncryptedSongSlip(payload, "room-1:token-1", 1)).toEqual({
      ok: true,
      links: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
      playerName: "Asha",
      roomId: "room-1",
      roomToken: "token-1"
    });
  });

  it("imports slips only when the song count matches", () => {
    const imported = importSongSlip(
      JSON.stringify({
        format: "kaargaan-song-slip",
        version: 1,
        playerName: "Asha",
        theme: "Monsoon",
        videoIds: ["dQw4w9WgXcQ"]
      }),
      1
    );

    expect(imported).toEqual({
      ok: true,
      links: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
      playerName: "Asha"
    });

    expect(
      importSongSlip(
        JSON.stringify({
          format: "kaargaan-song-slip",
          version: 1,
          playerName: "Asha",
          theme: "Monsoon",
          videoIds: ["dQw4w9WgXcQ"]
        }),
        2
      )
    ).toEqual({
      ok: false,
      error: "This slip contains 1 song, but the room needs 2 songs."
    });
  });
});
