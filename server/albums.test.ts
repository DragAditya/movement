import { describe, expect, it } from "vitest";
import { classifyImage } from "./db";

describe("smart album classification", () => {
  it("classifies screenshots from reliable filename terms", () => {
    expect(classifyImage({ filename: "Screenshot 2026-08-22.png", mimeType: "image/png" })).toBe("screens");
    expect(classifyImage({ filename: "screen_capture-01.webp", mimeType: "image/webp" })).toBe("screens");
  });

  it("classifies project visual filenames", () => {
    expect(classifyImage({ filename: "mobile-dashboard-design.jpg", mimeType: "image/jpeg" })).toBe("projects");
    expect(classifyImage({ filename: "app-ui-mockup.png", mimeType: "image/png" })).toBe("projects");
  });

  it("keeps ordinary filenames in personal images", () => {
    expect(classifyImage({ filename: "family-photo.jpeg", mimeType: "image/jpeg", width: 1200, height: 900 })).toBe("personal");
  });

  it("uses image type and dimensions when a filename has no useful signal", () => {
    expect(classifyImage({ filename: "IMG_001.png", mimeType: "image/png", width: 1440, height: 900 })).toBe("screens");
    expect(classifyImage({ filename: "IMG_002.jpg", mimeType: "image/jpeg", width: 1800, height: 900 })).toBe("projects");
  });
});
