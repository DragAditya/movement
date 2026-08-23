import { describe, expect, it } from "vitest";
import { adaptiveObjectFit, containedImageFrame, fullscreenPresentationState, orientationLockTarget, playbackDefaults, resolveImmersiveGesture, shouldRevealControls } from "./immersive-policy";

describe("immersive playback policy", () => {
  it("autoplays immersive and kiosk while starting their chrome hidden", () => {
    expect(playbackDefaults("immersive")).toEqual({ autoplay: true, controlsVisible: false });
    expect(playbackDefaults("kiosk")).toEqual({ autoplay: true, controlsVisible: false });
  });

  it("reveals immersive controls only for intentional interaction, never automatic slide changes", () => {
    expect(shouldRevealControls("immersive", "intent")).toBe(true);
    expect(shouldRevealControls("immersive", "automatic")).toBe(false);
    expect(shouldRevealControls("kiosk", "intent")).toBe(false);
  });

  it("locks only supported manual fullscreen orientation and otherwise preserves the system orientation", () => {
    expect(orientationLockTarget(true, "portrait", true)).toBe("portrait");
    expect(orientationLockTarget(true, "landscape", true)).toBe("landscape");
    expect(orientationLockTarget(true, "system", true)).toBeNull();
    expect(orientationLockTarget(false, "portrait", true)).toBeNull();
    expect(orientationLockTarget(true, "portrait", false)).toBeNull();
  });

  it("keeps the clean viewport player when a native fullscreen request is blocked", () => {
    expect(fullscreenPresentationState(true)).toBe("native-fullscreen");
    expect(fullscreenPresentationState(false)).toBe("viewport-fallback");
  });

  it("uses upward swipe for the next slide, downward swipe for immersive exit, and ignores holds", () => {
    const base = { mode: "immersive" as const, verticalNavigation: true, swipeDownExit: true, threshold: 72 };
    expect(resolveImmersiveGesture({ ...base, deltaX: 0, deltaY: -96, elapsedMs: 180 })).toBe("next");
    expect(resolveImmersiveGesture({ ...base, deltaX: 0, deltaY: 96, elapsedMs: 180 })).toBe("exit");
    expect(resolveImmersiveGesture({ ...base, deltaX: 0, deltaY: -96, elapsedMs: 720 })).toBe("none");
  });

  it("always contains the full image, including matching and mismatched portrait and landscape frames", () => {
    expect(adaptiveObjectFit(390 / 844, 390 / 844)).toBe("contain");
    expect(adaptiveObjectFit(16 / 9, 1280 / 720)).toBe("contain");
    expect(adaptiveObjectFit(9 / 16, 390 / 844)).toBe("contain");
    expect(adaptiveObjectFit(9 / 16, 1280 / 720)).toBe("contain");
    expect(adaptiveObjectFit(16 / 9, 390 / 844)).toBe("contain");
  });

  it("calculates a centered visible frame that never exceeds either viewport edge", () => {
    const cases = [
      { image: [1080, 2408], viewport: [1280, 720] },
      { image: [2408, 1080], viewport: [1280, 720] },
      { image: [1080, 2408], viewport: [390, 844] },
      { image: [2408, 1080], viewport: [390, 844] },
      { image: [1080, 2408], viewport: [844, 390] },
      { image: [2408, 1080], viewport: [844, 390] },
    ];

    cases.forEach(({ image, viewport }) => {
      const frame = containedImageFrame(image[0], image[1], viewport[0], viewport[1]);
      expect(frame.width).toBeLessThanOrEqual(viewport[0]);
      expect(frame.height).toBeLessThanOrEqual(viewport[1]);
      expect(frame.width / frame.height).toBeCloseTo(image[0] / image[1], 8);
      expect(frame.offsetX).toBeGreaterThanOrEqual(0);
      expect(frame.offsetY).toBeGreaterThanOrEqual(0);
    });
  });
});
