import type { Game } from "./types";

/** A new app version may reload the page, so it waits until no round is in play. */
export function canApplyUpdate(status: Game["status"] | null): boolean {
  return status !== "playing";
}
