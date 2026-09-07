import { describe, expect, it } from "vitest";
import { conflictingSongNumbers, conflictMessage } from "../../src/lib/songConflicts";

describe("incoming song conflicts", () => {
  it("reports every incoming position across URL formats, then accepts a corrected retry", () => {
    const accepted = ["https://youtu.be/dQw4w9WgXcQ", "https://youtu.be/9bZkp7q19f0"];
    const incoming = ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=new", "https://youtu.be/kJQP7kiw5Fk", "https://www.youtube.com/watch?v=9bZkp7q19f0"];
    expect(conflictingSongNumbers(incoming, accepted)).toEqual([1, 3]);
    expect(conflictingSongNumbers(["https://youtu.be/Zi_XLOBDo_Y", incoming[1], "https://youtu.be/L_jWHffIx5E"], accepted)).toEqual([]);
    expect(conflictMessage("Player", [1, 3])).toContain("Songs 1, 3 use the same YouTube video");
  });
  it("also identifies repeated positions inside an entry", () => {
    expect(conflictingSongNumbers(["https://youtu.be/dQw4w9WgXcQ", "https://youtu.be/9bZkp7q19f0", "https://youtube.com/watch?v=dQw4w9WgXcQ"], [])).toEqual([1, 3]);
  });
});
