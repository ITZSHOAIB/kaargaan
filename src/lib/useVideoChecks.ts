import { useEffect, useReducer } from "react";
import { checkVideo, type VideoCheck } from "./youtube";

const cache = new Map<string, VideoCheck>();

/** Checks each video id once, a moment after typing stops. A missing entry means "still checking". */
export function useVideoChecks(videoIds: string[]): Map<string, VideoCheck> {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const key = [...new Set(videoIds)].join(",");

  useEffect(() => {
    const pending = key.split(",").filter((id) => id && !cache.has(id));
    if (!pending.length) return;
    let live = true;
    const timer = setTimeout(() => {
      pending.forEach((id) => void checkVideo(id).then((result) => {
        cache.set(id, result);
        if (live) refresh();
      }));
    }, 350);
    return () => { live = false; clearTimeout(timer); };
  }, [key]);

  return new Map(key.split(",").flatMap((id) => (cache.has(id) ? [[id, cache.get(id)!] as const] : [])));
}
