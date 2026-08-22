import { describe, expect, it } from "vitest";
import { fullscreenPresentationState, orientationLockTarget, playbackDefaults, shouldRevealControls } from "./immersive-policy";

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
});
