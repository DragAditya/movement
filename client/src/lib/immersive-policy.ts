export type PresentationMode = "standard" | "immersive" | "kiosk";
export type OrientationMode = "system" | "portrait" | "landscape";

export function playbackDefaults(mode: PresentationMode) {
  return {
    autoplay: mode !== "standard",
    controlsVisible: mode === "standard",
  };
}

export function shouldRevealControls(mode: PresentationMode, cause: "intent" | "automatic") {
  return mode === "standard" || (mode === "immersive" && cause === "intent");
}

export function orientationLockTarget(isFullscreen: boolean, orientation: OrientationMode, lockSupported: boolean) {
  if (!isFullscreen || orientation === "system" || !lockSupported) return null;
  return orientation;
}

export function fullscreenPresentationState(requestAccepted: boolean) {
  return requestAccepted ? "native-fullscreen" : "viewport-fallback";
}
