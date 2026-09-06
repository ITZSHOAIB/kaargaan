import type { GameSnapshot } from "./types";

const SNAPSHOT_KEY = "kaargaan.phase1.snapshot.v1";

export function saveSnapshot(snapshot: GameSnapshot): void {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function loadSnapshot(): GameSnapshot | null {
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as GameSnapshot;
    if (
      parsed?.format !== "kaargaan-phase1-snapshot" ||
      parsed.version !== 1 ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.game?.title !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  localStorage.removeItem(SNAPSHOT_KEY);
}

export function snapshotKey(): string {
  return SNAPSHOT_KEY;
}
