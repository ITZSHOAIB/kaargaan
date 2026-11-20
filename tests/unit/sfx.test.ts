// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buzz, cue, loadSoundOn, saveSoundOn, SOUND_KEY } from "../../src/lib/sfx";

beforeEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

describe("sound and buzz", () => {
  it("is on until someone switches it off, and remembers that", () => {
    expect(loadSoundOn()).toBe(true);
    saveSoundOn(false);
    expect(localStorage.getItem(SOUND_KEY)).toBe("off");
    expect(loadSoundOn()).toBe(false);
  });

  it("stays silent and still when switched off", () => {
    const vibrate = vi.fn();
    const ctor = vi.fn();
    vi.stubGlobal("AudioContext", ctor);
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
    saveSoundOn(false);
    cue("reveal");
    buzz([30]);
    expect(ctor).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("buzzes when on, and copes with phones that can't vibrate or play audio", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
    buzz([30]);
    expect(vibrate).toHaveBeenCalledWith([30]);
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined });
    vi.stubGlobal("AudioContext", undefined);
    expect(() => { buzz([30]); cue("vote"); }).not.toThrow();
  });
});
