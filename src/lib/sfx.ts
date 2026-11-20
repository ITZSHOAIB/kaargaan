import { useSyncExternalStore } from "react";

/**
 * Game-show sounds, synthesised with Web Audio so there are no files to download, plus phone buzzes.
 * One switch covers both. Cues stay quiet under the music and never say anything about who picked what:
 * every vote sounds the same.
 */
export const SOUND_KEY = "kaargaan.sound.v1";

export type Cue = "tap" | "vote" | "tick" | "reveal" | "bluff" | "seal" | "win" | "whoosh";

const listeners = new Set<() => void>();
let soundOn = readSoundOn();
let context: AudioContext | null = null;

function readSoundOn(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}

export function loadSoundOn(): boolean {
  soundOn = readSoundOn();
  return soundOn;
}

export function saveSoundOn(on: boolean): void {
  soundOn = on;
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* the switch still works until reload */ }
  listeners.forEach((listener) => listener());
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => soundOn
  );
}

export function buzz(pattern: number[]): void {
  if (!loadSoundOn() || typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(pattern); } catch { /* some browsers refuse outside a tap */ }
}

/** Phones only start audio from a tap, so the first cue after one creates or wakes the context. */
function audio(): AudioContext | null {
  if (!loadSoundOn()) return null;
  const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

type Note = { freq: number; at: number; length: number; type?: OscillatorType; slideTo?: number; volume?: number };

function play(ctx: AudioContext, notes: Note[]): void {
  const start = ctx.currentTime + 0.01;
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = start + note.at;
    osc.type = note.type ?? "triangle";
    osc.frequency.setValueAtTime(note.freq, t);
    if (note.slideTo) osc.frequency.exponentialRampToValueAtTime(note.slideTo, t + note.length);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(note.volume ?? 0.09, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + note.length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + note.length + 0.02);
  }
}

const CUES: Record<Cue, Note[]> = {
  tap: [{ freq: 660, at: 0, length: 0.05, volume: 0.05 }],
  vote: [{ freq: 523, at: 0, length: 0.08 }, { freq: 784, at: 0.07, length: 0.12 }],
  tick: [{ freq: 1200, at: 0, length: 0.03, type: "square", volume: 0.03 }],
  whoosh: [{ freq: 220, at: 0, length: 0.25, type: "sawtooth", slideTo: 880, volume: 0.03 }],
  seal: [{ freq: 180, at: 0, length: 0.18, type: "sine", slideTo: 70, volume: 0.16 }, { freq: 1046, at: 0.12, length: 0.15, volume: 0.05 }],
  reveal: [
    { freq: 523, at: 0, length: 0.12, type: "square", volume: 0.05 },
    { freq: 659, at: 0.1, length: 0.12, type: "square", volume: 0.05 },
    { freq: 784, at: 0.2, length: 0.12, type: "square", volume: 0.05 },
    { freq: 1046, at: 0.3, length: 0.4, type: "square", volume: 0.06 }
  ],
  bluff: [
    { freq: 392, at: 0, length: 0.3, type: "sawtooth", slideTo: 370, volume: 0.05 },
    { freq: 370, at: 0.32, length: 0.3, type: "sawtooth", slideTo: 349, volume: 0.05 },
    { freq: 349, at: 0.64, length: 0.6, type: "sawtooth", slideTo: 262, volume: 0.05 }
  ],
  win: [
    { freq: 523, at: 0, length: 0.15 }, { freq: 659, at: 0.15, length: 0.15 }, { freq: 784, at: 0.3, length: 0.15 },
    { freq: 1046, at: 0.45, length: 0.2 }, { freq: 784, at: 0.65, length: 0.12 }, { freq: 1046, at: 0.78, length: 0.6 }
  ]
};

/**
 * iPhone only lets audio start inside a tap, and some cues fire later (after sealing, on a reveal).
 * So the first tap or key press anywhere wakes the audio with a silent sample.
 */
function unlockOnFirstTap(): void {
  if (typeof window === "undefined") return;
  const unlock = () => {
    const ctx = audio();
    if (!ctx) return;
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start();
    } catch { /* nothing to wake */ }
  };
  window.addEventListener("pointerdown", unlock, { capture: true, once: true });
  window.addEventListener("keydown", unlock, { capture: true, once: true });
}
unlockOnFirstTap();

export function cue(name: Cue): void {
  const ctx = audio();
  if (ctx) play(ctx, CUES[name]);
}
