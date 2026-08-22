import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createAlbum: vi.fn(),
  updateAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
  setAlbumImages: vi.fn(),
  reorderAlbums: vi.fn(),
  getAlbumDashboard: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: null, req: { protocol: "https", headers: {} }, res: {} } as unknown as TrpcContext;

describe("album management procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.createAlbum.mockResolvedValue({ id: 24, name: "Field notes" });
    dbMocks.setAlbumImages.mockResolvedValue(undefined);
    dbMocks.reorderAlbums.mockResolvedValue(undefined);
    dbMocks.deleteAlbum.mockResolvedValue(undefined);
  });

  it("creates a custom album with presentation and visibility settings", async () => {
    const result = await appRouter.createCaller(context).gallery.createAlbum({ name: "Field notes", description: "A set", visibility: "private", presentationMode: "kiosk", accent: "moss" });
    expect(result).toEqual({ id: 24, name: "Field notes" });
    expect(dbMocks.createAlbum).toHaveBeenCalledWith(expect.objectContaining({ name: "Field notes", visibility: "private", presentationMode: "kiosk", accent: "moss" }));
  });

  it("persists complete album membership and ordering", async () => {
    await appRouter.createCaller(context).gallery.setAlbumImages({ albumId: 4, imageIds: [8, 5, 2] });
    await appRouter.createCaller(context).gallery.reorderAlbums({ albumIds: [4, 7, 2] });
    expect(dbMocks.setAlbumImages).toHaveBeenCalledWith(4, [8, 5, 2]);
    expect(dbMocks.reorderAlbums).toHaveBeenCalledWith([4, 7, 2]);
  });

  it("deletes an album while leaving image deletion to the data layer contract", async () => {
    await expect(appRouter.createCaller(context).gallery.deleteAlbum({ albumId: 4 })).resolves.toEqual({ success: true });
    expect(dbMocks.deleteAlbum).toHaveBeenCalledWith(4);
  });
});
