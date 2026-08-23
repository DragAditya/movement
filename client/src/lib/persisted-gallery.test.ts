import { describe, expect, it } from "vitest";
import { resolveVisibleImageCopy } from "./persisted-gallery";

describe("reviewed jewellery AI display copy", () => {
  it("keeps a ready Gemini suggestion out of visible upload copy until approval", () => {
    expect(resolveVisibleImageCopy({
      filename: "ring-upload.jpg",
      caption: null,
      aiStatus: "ready",
      aiName: "Gold Floral Ring",
      aiDescription: "Gold floral ring.",
    })).toEqual({ title: "ring-upload", caption: "Uploaded gallery image." });
  });

  it("shows approved AI copy and safely falls back before analysis is ready", () => {
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
