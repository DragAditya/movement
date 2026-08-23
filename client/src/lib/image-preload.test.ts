import { describe, expect, it, vi } from "vitest";
import { imageLoadAttributes, resolveThumbnailSource, warmGalleryImages } from "./image-preload";

describe("gallery image readiness", () => {
  it("prioritizes the first visible images and defers later tiles", () => {
    expect(imageLoadAttributes(0)).toEqual({ loading: "eager", fetchPriority: "high" });
    expect(imageLoadAttributes(4)).toEqual({ loading: "lazy", fetchPriority: "low" });
  });

  it("warms each unique gallery source once without blocking rendering", () => {
    const instances: Array<{ src: string; decoding: string }> = [];
    const createImage = vi.fn(() => {
      const image = { src: "", decoding: "" } as unknown as HTMLImageElement;
      instances.push(image);
      return image;
    });
    warmGalleryImages(["/one.jpg", "/two.jpg", "/one.jpg"], createImage);
    expect(createImage).toHaveBeenCalledTimes(2);
    expect(instances).toEqual([{ src: "/one.jpg", decoding: "async" }, { src: "/two.jpg", decoding: "async" }]);
  });

  it("uses a persisted thumbnail for compact media while retaining an original fallback", () => {
    expect(resolveThumbnailSource("/thumb.jpg", "/original.jpg")).toBe("/thumb.jpg");
    expect(resolveThumbnailSource(null, "/original.jpg")).toBe("/original.jpg");
  });
});
