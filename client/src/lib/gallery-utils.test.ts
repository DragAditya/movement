import { describe, expect, it } from "vitest";
import { assignImagesToCollection, isSupportedImageUpload, nextSlideIndex, toggleGallerySelection } from "./gallery-utils";

describe("gallery interaction utilities", () => {
  it("cycles slideshow indices in both directions", () => {
    expect(nextSlideIndex(0, -1, 4)).toBe(3);
    expect(nextSlideIndex(3, 1, 4)).toBe(0);
    expect(nextSlideIndex(0, 1, 0)).toBe(0);
  });

  it("accepts supported high-quality image formats within the upload limit", () => {
    expect(isSupportedImageUpload({ type: "image/avif", size: 2_000_000 })).toBe(true);
    expect(isSupportedImageUpload({ type: "image/gif", size: 2_000_000 })).toBe(false);
    expect(isSupportedImageUpload({ type: "image/jpeg", size: 50 * 1024 * 1024 + 1 })).toBe(false);
  });

  it("adds and removes images from a bulk selection", () => {
    expect(toggleGallerySelection(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleGallerySelection(["a", "b"], "a")).toEqual(["b"]);
  });

  it("moves selected images into the chosen existing collection without dropping them", () => {
    const result = assignImagesToCollection([
      { id: "one", collection: "uncategorized" },
      { id: "two", collection: "uncategorized" },
    ], ["two"], "padmavati");
    expect(result.remaining).toEqual([{ id: "one", collection: "uncategorized" }]);
    expect(result.moved).toEqual([{ id: "two", collection: "padmavati" }]);
  });
});
