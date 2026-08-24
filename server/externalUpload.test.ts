import { describe, expect, it } from "vitest";
import { createStagedUploadKey, isStagedUploadKey, isSupportedImageMimeType, normalizeUploadFilename } from "./externalUpload";

describe("external Vercel upload helpers", () => {
  it("accepts only the image formats supported by the Movement uploader", () => {
    expect(isSupportedImageMimeType("image/jpeg")).toBe(true);
    expect(isSupportedImageMimeType("image/avif")).toBe(true);
    expect(isSupportedImageMimeType("application/pdf")).toBe(false);
  });

  it("creates safe unique Backblaze staging keys", () => {
    const key = createStagedUploadKey("My gold / ring.png");
    expect(key).toMatch(/^gallery\/staging\/[A-Za-z0-9_-]+-My-gold---ring\.png$/);
    expect(isStagedUploadKey(key)).toBe(true);
    expect(isStagedUploadKey("gallery/originals/other.png")).toBe(false);
    expect(isStagedUploadKey("gallery/staging/../other.png")).toBe(false);
    expect(normalizeUploadFilename("../../secret.jpg")).toBe("..-..-secret.jpg");
  });
});
