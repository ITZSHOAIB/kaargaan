const COLOURS = ["#ffd23f", "#ff4f8b", "#3ddc97", "#ffffff", "#7ad7ff"];

/**
 * Confetti for a reveal or a win. The library loads on first use, never blocks taps,
 * and stays off for anyone who asked their phone for reduced motion.
 */
export function celebrate(kind: "reveal" | "bluff" | "win"): void {
  void import("canvas-confetti").then(({ default: confetti }) => {
    const base = { disableForReducedMotion: true, colors: COLOURS, zIndex: 40 };
    if (kind === "bluff") {
      void confetti({ ...base, particleCount: 60, spread: 120, startVelocity: 25, gravity: 1.4, colors: ["#ff4f8b", "#14185c"], shapes: ["circle"], origin: { y: 0.3 } });
      return;
    }
    void confetti({ ...base, particleCount: 90, spread: 75, origin: { x: 0.2, y: 0.7 }, angle: 60 });
    void confetti({ ...base, particleCount: 90, spread: 75, origin: { x: 0.8, y: 0.7 }, angle: 120 });
    if (kind === "win") setTimeout(() => void confetti({ ...base, particleCount: 160, spread: 160, origin: { y: 0.35 }, scalar: 1.2 }), 450);
  }).catch(() => { /* offline before the chunk was cached: no confetti, game carries on */ });
}

/** Fetch and parse the confetti code while votes are open, so the reveal itself never waits on it. */
export function warmCelebrate(): void {
  void import("canvas-confetti").catch(() => {});
}
