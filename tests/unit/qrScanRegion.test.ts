// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { qrScanRegion } from "../../src/lib/qrScanRegion";

describe("QR scan region", () => {
  it("scans the full centered square shown by the camera preview", () => {
    expect(qrScanRegion({ videoWidth: 1920, videoHeight: 1080 })).toEqual({ x: 420, y: 0, width: 1080, height: 1080, downScaledWidth: 1024, downScaledHeight: 1024 });
    expect(qrScanRegion({ videoWidth: 720, videoHeight: 1280 })).toEqual({ x: 0, y: 280, width: 720, height: 720, downScaledWidth: 720, downScaledHeight: 720 });
  });
});
