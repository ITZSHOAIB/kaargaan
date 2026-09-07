import { normalizeYouTubeLink } from "./youtube";

/** Return incoming song positions only. Never disclose a previous owner or song. */
export function conflictingSongNumbers(links: string[], existingLinks: string[]): number[] {
  const existing = new Set(existingLinks.flatMap(link => {
    const parsed = normalizeYouTubeLink(link);
    return parsed.ok ? [parsed.videoId] : [];
  }));
  const indicesById = new Map<string, number[]>();
  links.forEach((link, index) => {
    const parsed = normalizeYouTubeLink(link);
    if (parsed.ok) indicesById.set(parsed.videoId, [...(indicesById.get(parsed.videoId) ?? []), index + 1]);
  });
  return [...indicesById].flatMap(([id, positions]) => existing.has(id) || positions.length > 1 ? positions : []).sort((a, b) => a - b);
}

export function conflictMessage(name: string, positions: number[]): string {
  return `${name}: ${positions.length === 1 ? "Song" : "Songs"} ${positions.join(", ")} ${positions.length === 1 ? "uses" : "use"} the same YouTube video as another entry. Different YouTube URLs can still point to the same video. Replace ${positions.length === 1 ? "this song" : "these songs"}, generate a fresh QR or code, then import again. Keep the other songs.`;
}
