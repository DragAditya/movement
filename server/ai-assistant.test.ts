import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAiSettings: vi.fn(),
  updateAiSettings: vi.fn(),
  markImageAiStatus: vi.fn(),
  getGalleryImage: vi.fn(),
  getAlbumDashboard: vi.fn(),
  saveJewellerySuggestion: vi.fn(),
  approveJewellerySuggestion: vi.fn(),
  dismissJewellerySuggestion: vi.fn(),
  createAlbum: vi.fn(),
  updateAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
  permanentlyDeleteImages: vi.fn(),
  setAlbumImages: vi.fn(),
  reorderAlbums: vi.fn(),
}));

const aiMocks = vi.hoisted(() => ({
  runNewJewelleryAnalysis: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./jewelleryAi", () => aiMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: null, req: { protocol: "https", headers: {} }, res: {} } as unknown as TrpcContext;

describe("jewellery AI procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiMocks.runNewJewelleryAnalysis.mockResolvedValue({ status: "ready" });
  });

  it("saves optional AI settings", async () => {
    await appRouter.createCaller(context).gallery.updateAiSettings({ enabled: true, model: "gemini-3.1-pro-preview" });
    expect(dbMocks.updateAiSettings).toHaveBeenCalledWith({ enabled: true, model: "gemini-3.1-pro-preview" });
  });

  it("analyzes a new upload only when AI assistance is enabled", async () => {
    await expect(appRouter.createCaller(context).gallery.analyzeNewJewelleryImage({ imageId: 11 })).resolves.toEqual({ status: "ready" });
    expect(aiMocks.runNewJewelleryAnalysis).toHaveBeenCalledWith(11);
  });

  it("does not analyze new uploads when assistance is disabled", async () => {
    aiMocks.runNewJewelleryAnalysis.mockResolvedValue({ status: "off" });
    await expect(appRouter.createCaller(context).gallery.analyzeNewJewelleryImage({ imageId: 11 })).resolves.toEqual({ status: "off" });
    expect(aiMocks.runNewJewelleryAnalysis).toHaveBeenCalledWith(11);
  });

  it("requires an explicit approval choice before applying a suggestion", async () => {
    await appRouter.createCaller(context).gallery.approveJewellerySuggestion({ imageId: 11, name: "Gold Floral Ring", description: "Gold floral ring.", assignAlbum: true });
    expect(dbMocks.approveJewellerySuggestion).toHaveBeenCalledWith({ imageId: 11, name: "Gold Floral Ring", description: "Gold floral ring.", assignAlbum: true });
  });
});
