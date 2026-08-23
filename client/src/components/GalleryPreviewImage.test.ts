import { describe, expect, it } from "vitest";
import { galleryPreviewClass } from "./GalleryPreviewImage";

describe("GalleryPreviewImage loading feedback", () => {
  it("keeps the compact tile placeholder active while a preview is loading", () => {
    expect(galleryPreviewClass("loading")).toBe("gallery-preview-media");
  });

  it("reveals the tile after both a successful load and a failed preview request", () => {
    expect(galleryPreviewClass("loaded")).toBe("gallery-preview-media is-loaded");
    expect(galleryPreviewClass("error")).toBe("gallery-preview-media is-loaded");
  });
});
