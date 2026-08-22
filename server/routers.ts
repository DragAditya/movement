import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

const sharingMode = z.enum(["standard", "immersive", "kiosk"]);
const slideshowMode = z.enum(["fade", "crossfade", "slide", "instant"]);

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  gallery: router({
    publicShare: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(({ input }) => ({ slug: input.slug, public: true })),
    validateCollection: publicProcedure.input(z.object({ name: z.string().min(1).max(180), mode: sharingMode })).query(({ input }) => ({ ...input, valid: true })),
    validateSlideshowSettings: publicProcedure.input(z.object({ intervalSeconds: z.number().int().min(2).max(60), transition: slideshowMode, kiosk: z.boolean() })).query(({ input }) => ({ ...input, valid: true })),
    adminDashboard: publicProcedure.query(() => db.getGalleryDashboard()),
    createCollection: publicProcedure.input(z.object({ name: z.string().min(1).max(180), description: z.string().max(500).optional(), coverImageUrl: z.string().optional(), mode: sharingMode })).mutation(async ({ input }) => {
      const slug = `${input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
      const collection = await db.createGalleryCollection({ slug, name: input.name.trim(), description: input.description, coverImageUrl: input.coverImageUrl, sharingMode: input.mode });
      return collection;
    }),
    moveImages: publicProcedure.input(z.object({ imageIds: z.array(z.number().int().positive()).min(1), collectionId: z.number().int().positive() })).mutation(async ({ input }) => ({ updated: await db.assignGalleryImagesToCollection(input.imageIds, input.collectionId) })),
  }),
});

export type AppRouter = typeof appRouter;
