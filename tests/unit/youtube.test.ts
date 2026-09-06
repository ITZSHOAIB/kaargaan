import { describe, expect, it } from "vitest";
import { normalizeYouTubeLink } from "../../src/lib/youtube";

describe("normalizeYouTubeLink", () => {
  it("accepts watch links and strips extra parameters", () => {
    const result = normalizeYouTubeLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s");
    expect(result).toEqual({
      ok: true,
      videoId: "dQw4w9WgXcQ",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s"
    });
  });

  it("accepts youtu.be short links", () => {
    const result = normalizeYouTubeLink("https://youtu.be/dQw4w9WgXcQ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.videoId).toBe("dQw4w9WgXcQ");
    }
  });

  it("rejects unsupported hosts", () => {
    const result = normalizeYouTubeLink("https://example.com/watch?v=dQw4w9WgXcQ");
    expect(result.ok).toBe(false);
  });
});
