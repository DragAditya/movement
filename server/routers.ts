import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

const presentationMode = z.enum(["standard", "immersive", "kiosk"]);
const visibility = z.enum(["public", "private"]);
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
    publicDashboard: publicProcedure.query(() => db.getAlbumDashboard()),
    validateAlbum: publicProcedure.input(z.object({ name: z.string().min(1).max(180), mode: presentationMode })).query(({ input }) => ({ ...input, valid: true })),
    validateSlideshowSettings: publicProcedure.input(z.object({ intervalSeconds: z.number().int().min(2).max(60), transition: slideshowMode, kiosk: z.boolean() })).query(({ input }) => ({ ...input, valid: true })),
    adminDashboard: publicProcedure.query(() => db.getAlbumDashboard()),
    createAlbum: publicProcedure.input(z.object({ name: z.string().min(1).max(180), description: z.string().max(500).optional(), coverImageId: z.number().int().positive().optional(), visibility, presentationMode, accent: z.string().max(24) })).mutation(async ({ input }) => {
      const slug = `${input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
      return db.createAlbum({ slug, name: input.name.trim(), description: input.description, coverImageId: input.coverImageId, visibility: input.visibility, presentationMode: input.presentationMode, accent: input.accent, sortOrder: 0 });
    }),
    updateAlbum: publicProcedure.input(z.object({ albumId: z.number().int().positive(), name: z.string().min(1).max(180).optional(), description: z.string().max(500).optional(), coverImageId: z.number().int().positive().nullable().optional(), visibility: visibility.optional(), presentationMode: presentationMode.optional(), accent: z.string().max(24).optional() })).mutation(({ input }) => {
      const { albumId, ...changes } = input;
      return db.updateAlbum(albumId, changes);
    }),
    deleteAlbum: publicProcedure.input(z.object({ albumId: z.number().int().positive() })).mutation(async ({ input }) => { await db.deleteAlbum(input.albumId); return { success: true }; }),
    deleteImages: publicProcedure.input(z.object({ imageIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ input }) => { await db.permanentlyDeleteImages(input.imageIds); return { success: true, deletedCount: input.imageIds.length }; }),
    setAlbumImages: publicProcedure.input(z.object({ albumId: z.number().int().positive(), imageIds: z.array(z.number().int().positive()) })).mutation(async ({ input }) => { await db.setAlbumImages(input.albumId, input.imageIds); return { success: true }; }),
    reorderAlbums: publicProcedure.input(z.object({ albumIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ input }) => { await db.reorderAlbums(input.albumIds); return { success: true }; }),
  }),
});

export type AppRouter = typeof appRouter;
