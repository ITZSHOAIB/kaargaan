import { describe, expect, it } from "vitest";
import { DRUMROLL_DELAYS, drumrollPath } from "../../src/lib/drumroll";

describe("drumrollPath", () => {
  it("steps through the seats and lands on the owner", () => {
    const path = drumrollPath(4, 2);
    expect(path).toHaveLength(DRUMROLL_DELAYS.length);
    expect(path.at(-1)).toBe(2);
    path.slice(1).forEach((seat, i) => expect(seat).toBe((path[i] + 1) % 4));
  });

  it("takes the same steps and time whoever the owner is", () => {
    const lengths = new Set([0, 1, 2, 3, 4].map((owner) => drumrollPath(5, owner).length));
    expect(lengths).toEqual(new Set([DRUMROLL_DELAYS.length]));
    expect(DRUMROLL_DELAYS.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(2600);
  });

  it("slows down towards the end", () => {
    DRUMROLL_DELAYS.slice(1).forEach((delay, i) => expect(delay).toBeGreaterThanOrEqual(DRUMROLL_DELAYS[i]));
  });
});
