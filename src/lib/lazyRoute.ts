import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "kaargaan.chunkReload.v1";

/**
 * Loads a screen on demand. After a deploy, an open tab can ask for a chunk that no longer exists;
 * reloading once picks up the new build. The flag stops a broken network from reloading forever.
 */
export function loadScreen<T extends ComponentType>(load: () => Promise<T>, reload = () => location.reload()): () => Promise<{ default: T }> {
  return () => load().then(
    (screen) => { try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* fine */ } return { default: screen }; },
    (error: unknown) => {
      let reloaded = true;
      try { reloaded = sessionStorage.getItem(RELOAD_KEY) === "1"; sessionStorage.setItem(RELOAD_KEY, "1"); } catch { /* no storage: don't loop */ }
      if (!reloaded) { reload(); return new Promise<never>(() => {}); }
      throw error;
    }
  );
}

export function lazyScreen<T extends ComponentType>(load: () => Promise<T>) {
  const loader = loadScreen(load);
  return Object.assign(lazy(loader), { preload: loader });
}
