import { describe, expect, it } from "vitest";
import { resolveVisibleImageCopy } from "./persisted-gallery";

describe("automatic jewellery AI display copy", () => {
  it("shows a ready AI name and description before album approval", () => {
    expect(resolveVisibleImageCopy({
      filename: "ring-upload.jpg",
      caption: null,
      aiStatus: "ready",
      aiName: "Gold Floral Ring",
      aiDescription: "Gold floral ring.",
    })).toEqual({ title: "Gold Floral Ring", caption: "Gold floral ring." });
  });

  it("continues showing approved AI copy and falls back safely before analysis is ready", () => {
    expect(resolveVisibleImageCopy({
      filename: "ring-upload.jpg",
      caption: "Original upload caption.",
      aiStatus: "approved",
      aiName: "Gold Floral Ring",
      aiDescription: "Gold floral ring.",
    })).toEqual({ title: "Gold Floral Ring", caption: "Gold floral ring." });

    expect(resolveVisibleImageCopy({
      filename: "ring-upload.jpg",
      caption: "Original upload caption.",
      aiStatus: "analyzing",
      aiName: null,
      aiDescription: null,
    })).toEqual({ title: "ring-upload", caption: "Original upload caption." });
  });
});
