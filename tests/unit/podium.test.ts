import { describe, expect, it } from "vitest";
import { podium } from "../../src/lib/podium";

const row = (name: string, score: number) => ({ id: name.toLowerCase(), name, score });

describe("podium", () => {
  it("puts the top three scores on steps one to three", () => {
    expect(podium([row("Asha", 30), row("Biren", 20), row("Chitra", 10), row("Dev", 5)])).toEqual([
      { place: 1, score: 30, names: ["Asha"] },
      { place: 2, score: 20, names: ["Biren"] },
      { place: 3, score: 10, names: ["Chitra"] }
    ]);
  });

  it("lets ties share a step, and the next step follows on", () => {
    expect(podium([row("Asha", 15), row("Biren", 15), row("Chitra", 10), row("Dev", 10), row("Esha", 5)])).toEqual([
      { place: 1, score: 15, names: ["Asha", "Biren"] },
      { place: 2, score: 10, names: ["Chitra", "Dev"] },
      { place: 3, score: 5, names: ["Esha"] }
    ]);
  });

  it("leaves nobody on the podium for zero points", () => {
    expect(podium([row("Asha", 10), row("Biren", 0)])).toEqual([{ place: 1, score: 10, names: ["Asha"] }]);
    expect(podium([row("Asha", 0), row("Biren", 0)])).toEqual([]);
  });
});
