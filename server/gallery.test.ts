import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as unknown as TrpcContext;

describe("album router contracts", () => {
  it("accepts valid album presentation modes", async () => {
    const result = await appRouter.createCaller(context).gallery.validateAlbum({ name: "Product studies", mode: "immersive" });
    expect(result).toEqual({ name: "Product studies", mode: "immersive", valid: true });
  });

  it("allows kiosk settings with a permitted interval", async () => {
    const result = await appRouter.createCaller(context).gallery.validateSlideshowSettings({ intervalSeconds: 5, transition: "crossfade", kiosk: true });
    expect(result.valid).toBe(true);
    expect(result.kiosk).toBe(true);
  });
});
