// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadScreen } from "../../src/lib/lazyRoute";

const Screen = () => null;
beforeEach(() => sessionStorage.clear());

describe("loading a screen", () => {
  it("hands the screen to React", async () => {
    await expect(loadScreen(async () => Screen)()).resolves.toEqual({ default: Screen });
  });

  it("reloads once when a screen's code is missing after a deploy, then gives up", async () => {
    const reload = vi.fn();
    const missing = loadScreen(() => Promise.reject(new Error("chunk gone")), reload);
    void missing();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await expect(missing()).rejects.toThrow("chunk gone");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("allows another reload after a screen loads fine", async () => {
    const reload = vi.fn();
    void loadScreen(() => Promise.reject(new Error("gone")), reload)();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await loadScreen(async () => Screen)();
    void loadScreen(() => Promise.reject(new Error("gone")), reload)();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
  });
});
