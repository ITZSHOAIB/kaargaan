import { describe, expect, it } from "vitest";
import { checkVideo, playlistUrl } from "../../src/lib/youtube";

const respond = (status: number, body: unknown = {}) => async () => new Response(JSON.stringify(body), { status });

describe("checkVideo", () => {
  it("returns the title when YouTube knows the video", async () => {
    const seen: string[] = [];
    const result = await checkVideo("dQw4w9WgXcQ", async (url) => { seen.push(String(url)); return respond(200, { title: "Never Gonna Give You Up" })(); });
    expect(result).toEqual({ status: "ok", title: "Never Gonna Give You Up" });
    expect(seen[0]).toBe("https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ");
  });

  it("flags videos that refuse to play inside other sites", async () => {
    expect(await checkVideo("dQw4w9WgXcQ", respond(401))).toEqual({ status: "blocked" });
    expect(await checkVideo("dQw4w9WgXcQ", respond(403))).toEqual({ status: "blocked" });
  });

  it("flags missing or private videos", async () => {
    expect(await checkVideo("dQw4w9WgXcQ", respond(404))).toEqual({ status: "missing" });
    expect(await checkVideo("dQw4w9WgXcQ", respond(400))).toEqual({ status: "missing" });
  });

  it("stays quiet when the check itself fails", async () => {
    expect(await checkVideo("dQw4w9WgXcQ", async () => { throw new TypeError("offline"); })).toEqual({ status: "unknown" });
    expect(await checkVideo("dQw4w9WgXcQ", respond(500))).toEqual({ status: "unknown" });
  });
});

describe("playlistUrl", () => {
  it("builds a YouTube playlist link of up to 50 songs", () => {
    expect(playlistUrl(["dQw4w9WgXcQ", "9bZkp7q19f0"])).toBe("https://www.youtube.com/watch_videos?video_ids=dQw4w9WgXcQ,9bZkp7q19f0");
    expect(playlistUrl(Array.from({ length: 60 }, () => "dQw4w9WgXcQ")).split(",")).toHaveLength(50);
  });
});
