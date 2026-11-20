import { useSyncExternalStore } from "react";

let applyUpdate: (() => void) | null = null;
const listeners = new Set<() => void>();

/** Called by the service worker registration when a new version is waiting. */
export function signalUpdateReady(apply: () => void): void {
  applyUpdate = apply;
  listeners.forEach((listener) => listener());
}

export function useUpdateReady(): (() => void) | null {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => applyUpdate
  );
}
