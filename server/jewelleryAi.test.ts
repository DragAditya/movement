import { describe, expect, it } from "vitest";
import { parseModelAnalysis, resolveJewelleryAlbumSuggestion } from "./jewelleryAi";

describe("jewellery album suggestions", () => {
  it("reuses one matching existing jewellery album", () => {
    expect(resolveJewelleryAlbumSuggestion("rings", [
      { id: 4, name: "Rings" },
      { id: 8, name: "Necklaces" },
    ])).toEqual({ existingAlbumId: 4, newAlbumName: null });
  });

  it("suggests exactly one simple album name when no matching album exists", () => {
    expect(resolveJewelleryAlbumSuggestion("bracelets", [{ id: 4, name: "Rings" }])).toEqual({ existingAlbumId: null, newAlbumName: "Bracelets" });
  });
});

describe("Gemini jewellery response parsing", () => {
  it("parses valid structured JSON", () => {
    expect(parseModelAnalysis('{"name":"Gold Floral Ring","description":"Gold floral ring.","category":"rings"}')).toEqual({
      name: "Gold Floral Ring",
      description: "Gold floral ring.",
      category: "rings",
    });
  });

  it("parses a Markdown-fenced JSON response", () => {
    expect(parseModelAnalysis('```json\n{"name":"Gold Ring","description":"Textured gold ring.","category":"rings"}\n```')).toEqual({
      name: "Gold Ring",
      description: "Textured gold ring.",
      category: "rings",
    });
  });

  it("rejects a truncated Gemini response rather than persisting a partial suggestion", () => {
    expect(() => parseModelAnalysis('{"name":"Gold Ring","description":"Textured gold ring.","category":"rings"')).toThrow("Gemini returned an invalid jewellery analysis response.");
  });
});
