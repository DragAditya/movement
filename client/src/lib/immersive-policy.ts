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

export function adaptiveObjectFit(imageAspectRatio: number | null, viewportAspectRatio: number) {
  void imageAspectRatio;
  void viewportAspectRatio;
  return "contain" as const;
}

export function containedImageFrame(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number) {
  if (![imageWidth, imageHeight, viewportWidth, viewportHeight].every(value => Number.isFinite(value) && value > 0)) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    width,
    height,
    offsetX: (viewportWidth - width) / 2,
    offsetY: (viewportHeight - height) / 2,
  };
}

export type ImmersiveGesture = "previous" | "next" | "exit" | "reveal" | "none";

export function resolveImmersiveGesture({
  deltaX,
  deltaY,
  elapsedMs,
  mode,
  verticalNavigation,
  swipeDownExit,
  threshold,
}: {
  deltaX: number;
  deltaY: number;
  elapsedMs: number;
  mode: PresentationMode;
  verticalNavigation: boolean;
  swipeDownExit: boolean;
  threshold: number;
}): ImmersiveGesture {
  const horizontal = Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
  const vertical = Math.abs(deltaY) > threshold && Math.abs(deltaY) > Math.abs(deltaX) * 1.2;
  if (elapsedMs > 650) return "none";
  if (horizontal) return deltaX < 0 ? "next" : "previous";
  if (mode === "immersive" && vertical && deltaY < 0 && verticalNavigation) return "next";
  if (mode === "immersive" && vertical && deltaY > 0 && swipeDownExit) return "exit";
  if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) return "reveal";
  return "none";
}
