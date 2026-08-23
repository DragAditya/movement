import { describe, expect, it } from "vitest";
import { parseModelAnalysis, reconcileJewelleryCategory, resolveJewelleryAlbumSuggestion, resolveProviderModel } from "./jewelleryAi";

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

  it("does not treat Earrings as a Rings album because it only contains the same letters", () => {
    expect(resolveJewelleryAlbumSuggestion("rings", [{ id: 4, name: "Earrings" }])).toEqual({ existingAlbumId: null, newAlbumName: "Rings" });
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

describe("Gemini provider model selection", () => {
  it("keeps built-in and personal Gemini models in their correct provider lane", () => {
    expect(resolveProviderModel("builtin", "gemini-3.1-pro-preview")).toBe("gemini-3.1-pro-preview");
    expect(resolveProviderModel("personal", "gemini-3.5-flash-lite")).toBe("gemini-3.5-flash-lite");
    expect(resolveProviderModel("builtin", "gemini-3.1-flash-lite")).toBe("gemini-3-flash-preview");
    expect(resolveProviderModel("personal", "gemini-3-flash-preview")).toBe("gemini-3.1-flash-lite");
  });
});

describe("jewellery category consistency", () => {
  it("uses an explicit ring reference instead of an inconsistent model category", () => {
    expect(reconcileJewelleryCategory("earrings", "Flower Ring", "Gold ring with flower motif")).toBe("rings");
  });

  it("does not classify a ring as a pendant when the product copy says ring", () => {
    expect(reconcileJewelleryCategory("pendants", "Textured Gold Ring", "Gold floral ring")).toBe("rings");
  });
});
