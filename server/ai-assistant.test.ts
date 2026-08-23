import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAiSettings: vi.fn(),
  updateAiSettings: vi.fn(),
  markImageAiStatus: vi.fn(),
  getGalleryImage: vi.fn(),
  getAlbumDashboard: vi.fn(),
  saveJewellerySuggestion: vi.fn(),
  approveJewellerySuggestion: vi.fn(),
  approveJewelleryBatch: vi.fn(),
  dismissJewellerySuggestion: vi.fn(),
  createAlbum: vi.fn(),
  updateAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
  permanentlyDeleteImages: vi.fn(),
  setAlbumImages: vi.fn(),
  reorderAlbums: vi.fn(),
}));

const aiMocks = vi.hoisted(() => ({
  runJewelleryBatch: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./jewelleryAi", () => aiMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: null, req: { protocol: "https", headers: {} }, res: {} } as unknown as TrpcContext;

describe("jewellery AI procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiMocks.runJewelleryBatch.mockResolvedValue({ status: "complete", results: [], skippedIds: [] });
  });

  it("saves optional AI settings", async () => {
    await appRouter.createCaller(context).gallery.updateAiSettings({ enabled: true, provider: "personal", model: "gemini-3.1-flash-lite", batchSize: 6 });
    expect(dbMocks.updateAiSettings).toHaveBeenCalledWith({ enabled: true, provider: "personal", model: "gemini-3.1-flash-lite", batchSize: 6 });
  });

  it("exposes only a safe personal-key configured flag to Studio", async () => {
    const status = await appRouter.createCaller(context).gallery.getAiProviderStatus();
    expect(typeof status.personalKeyConfigured).toBe("boolean");
    expect(status).not.toHaveProperty("key");
    expect(status).not.toHaveProperty("apiKey");
  });

  it("analyzes only the selected unorganised uploads in a manual batch", async () => {
    await expect(appRouter.createCaller(context).gallery.analyzeUnorganisedJewelleryBatch({ imageIds: [11, 12] })).resolves.toEqual({ status: "complete", results: [], skippedIds: [] });
    expect(aiMocks.runJewelleryBatch).toHaveBeenCalledWith([11, 12]);
  });

  it("returns the manual batch's disabled status without analysing an upload automatically", async () => {
    aiMocks.runJewelleryBatch.mockResolvedValue({ status: "off", results: [] });
    await expect(appRouter.createCaller(context).gallery.analyzeUnorganisedJewelleryBatch({ imageIds: [11] })).resolves.toEqual({ status: "off", results: [] });
    expect(aiMocks.runJewelleryBatch).toHaveBeenCalledWith([11]);
  });

  it("requires an explicit approval choice before applying a suggestion", async () => {
    await appRouter.createCaller(context).gallery.approveJewellerySuggestion({ imageId: 11, name: "Gold Floral Ring", description: "Gold floral ring.", assignAlbum: true });
    expect(dbMocks.approveJewellerySuggestion).toHaveBeenCalledWith({ imageId: 11, name: "Gold Floral Ring", description: "Gold floral ring.", assignAlbum: true });
  });

  it("applies a reviewed batch only through the explicit batch approval procedure", async () => {
    dbMocks.approveJewelleryBatch.mockResolvedValue({ appliedIds: [11, 12], skippedIds: [] });
    await expect(appRouter.createCaller(context).gallery.approveJewelleryBatch({ imageIds: [11, 12] })).resolves.toEqual({ appliedIds: [11, 12], skippedIds: [] });
    expect(dbMocks.approveJewelleryBatch).toHaveBeenCalledWith([11, 12]);
  });
});
