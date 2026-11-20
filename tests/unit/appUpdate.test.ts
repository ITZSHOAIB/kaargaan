import { describe, expect, it } from "vitest";
import { canApplyUpdate } from "../../src/lib/appUpdate";

describe("canApplyUpdate", () => {
  it("waits while a game is being played", () => {
    expect(canApplyUpdate("playing")).toBe(false);
  });

  it("updates when no game is running or the game is over", () => {
    expect(canApplyUpdate(null)).toBe(true);
    expect(canApplyUpdate("completed")).toBe(true);
  });
});
