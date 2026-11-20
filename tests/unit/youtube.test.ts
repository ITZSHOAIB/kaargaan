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

describe("normalizeYouTubeLink link shapes", () => {
  it.each([
    ["live stream", "https://www.youtube.com/live/dQw4w9WgXcQ?si=abc"],
    ["shorts", "https://youtube.com/shorts/dQw4w9WgXcQ"],
    ["mobile watch", "https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share"],
    ["music", "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM"],
    ["short link with share id", "https://youtu.be/dQw4w9WgXcQ?si=XyZ"],
    ["no scheme", "youtu.be/dQw4w9WgXcQ"],
    ["link inside shared text", "Listen to this https://youtu.be/dQw4w9WgXcQ"]
  ])("accepts a %s link", (_, link) => {
    const result = normalizeYouTubeLink(link);
    expect(result.ok && result.videoId).toBe("dQw4w9WgXcQ");
  });

  it("rejects http and playlist-only links", () => {
    expect(normalizeYouTubeLink("http://www.youtube.com/watch?v=dQw4w9WgXcQ").ok).toBe(false);
    expect(normalizeYouTubeLink("https://www.youtube.com/playlist?list=PL123").ok).toBe(false);
  });
});
