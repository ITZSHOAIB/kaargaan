import { describe, expect, it } from "vitest";
import { createSongSlip, decodeSongSlip, importSongSlip } from "../../src/lib/songSlip";

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
      links: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]
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
