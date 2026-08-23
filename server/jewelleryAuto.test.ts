import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAiSettings: vi.fn(),
  getUnorganisedGalleryImages: vi.fn(),
  markImageAiStatus: vi.fn(),
  getGalleryImage: vi.fn(),
  getAlbumDashboard: vi.fn(),
  saveJewellerySuggestion: vi.fn(),
}));

const llmMocks = vi.hoisted(() => ({
  listLLMModels: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/llm", () => llmMocks);
vi.mock("./storage", () => ({ storageGetSignedUrl: vi.fn() }));

import { runNewJewelleryAnalysis } from "./jewelleryAi";

const automaticSettings = {
  id: 1,
  enabled: true,
  autoAnalyzeNew: true,
  provider: "builtin" as const,
  model: "gemini-3-flash-preview" as const,
  batchSize: 8,
  updatedAt: new Date(),
};

describe("automatic new-upload jewellery analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getAiSettings.mockResolvedValue(automaticSettings);
    dbMocks.getUnorganisedGalleryImages.mockResolvedValue([{ id: 22 }]);
    dbMocks.getGalleryImage.mockResolvedValue({ id: 22, originalKey: "gallery/ring.jpg", mimeType: "image/jpeg" });
    dbMocks.getAlbumDashboard.mockResolvedValue({ albums: [] });
    llmMocks.listLLMModels.mockResolvedValue({ data: [{ id: "gemini-3-flash-preview" }] });
    llmMocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: '{"name":"Gold Ring","description":"Gold floral ring.","category":"rings"}' } }] });
  });

  it("does nothing when automatic assistance is disabled", async () => {
    dbMocks.getAiSettings.mockResolvedValue({ ...automaticSettings, enabled: false });
    await expect(runNewJewelleryAnalysis(22)).resolves.toEqual({ imageId: 22, status: "off" });
    expect(dbMocks.getUnorganisedGalleryImages).not.toHaveBeenCalled();
  });

  it("analyzes each newly persisted unorganised upload without assigning an album", async () => {
    await expect(runNewJewelleryAnalysis(22)).resolves.toEqual({ imageId: 22, status: "ready" });
    expect(dbMocks.markImageAiStatus).toHaveBeenNthCalledWith(1, 22, "queued");
    expect(dbMocks.markImageAiStatus).toHaveBeenNthCalledWith(2, 22, "analyzing");
    expect(dbMocks.saveJewellerySuggestion).toHaveBeenCalledWith(expect.objectContaining({ imageId: 22, name: "Gold Ring", description: "Gold floral ring.", suggestedAlbumId: null, suggestedNewAlbum: "Rings" }));
  });
});
