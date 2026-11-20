import { useEffect } from "react";

/** Keeps the stage phone's screen on while a game runs. Browsers drop the lock when the tab hides, so it's taken again on return. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const take = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then((taken) => {
        if (stopped) void taken.release();
        else lock = taken;
      }, () => { /* the screen may still sleep; the game carries on */ });
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", take);
      void lock?.release();
    };
  }, [active]);
}
