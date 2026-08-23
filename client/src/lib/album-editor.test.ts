import { describe, expect, it } from "vitest";
import { resolveAlbumCoverPreview } from "./album-editor";

const images = [
  { recordId: 4, src: "/first.jpg", title: "First moment" },
  { recordId: 7, src: "/selected.jpg", title: "Selected moment" },
];

describe("album cover preview", () => {
  it("shows the explicitly selected cover image when one is chosen", () => {
    expect(resolveAlbumCoverPreview(images, "7")).toEqual(images[1]);
  });

  it("uses the first album image for the default preview and handles albums without images", () => {
    expect(resolveAlbumCoverPreview(images, "")).toEqual(images[0]);
    expect(resolveAlbumCoverPreview([], "7")).toBeNull();
  });
});
