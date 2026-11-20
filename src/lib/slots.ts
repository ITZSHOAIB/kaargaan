import { normalizeYouTubeLink } from "./youtube";

export type Slots = { videoIds: (string | null)[]; firstCopy: number[]; complete: boolean };

/** Reads the song links a player typed: each slot's video, and the earlier slot holding the same song, or -1. */
export function readSlots(links: string[]): Slots {
  const videoIds = links.map((link) => { const r = normalizeYouTubeLink(link); return r.ok ? r.videoId : null; });
  const firstCopy = videoIds.map((id, i) => { const first = id ? videoIds.indexOf(id) : -1; return first < i ? first : -1; });
  return { videoIds, firstCopy, complete: videoIds.every(Boolean) && firstCopy.every((f) => f < 0) };
}
