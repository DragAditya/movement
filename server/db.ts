import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { aiSettings, albumImages, albums, galleryImages, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { isMutableAlbum } from "./albumRules";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type GalleryImageInput = {
  originalKey: string;
  originalUrl: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
};

export type SmartGroup = "personal" | "screens" | "projects";

export function classifyImage(input: { filename: string; mimeType: string; width?: number; height?: number }): SmartGroup {
  const name = input.filename.toLowerCase();
  if (/(screenshot|screen[-_ ]?shot|screencap|screen[-_ ]?capture|^screen[-_ ])/.test(name)) return "screens";
  if (/(app|ui|mockup|design|figma|wireframe|dashboard|interface|prototype)/.test(name)) return "projects";
  if (input.mimeType === "image/png" && (input.width ?? 0) >= 800 && (input.height ?? 0) >= 500) return "screens";
  if ((input.width ?? 0) >= (input.height ?? 0) * 1.7 && (input.width ?? 0) >= 1200) return "projects";
  return "personal";
}

export async function createGalleryImage(input: GalleryImageInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(galleryImages).values({ ...input, smartGroup: classifyImage(input) });
  const [image] = await db.select().from(galleryImages).where(eq(galleryImages.originalKey, input.originalKey)).limit(1);
  return image;
}

export async function listGalleryImagesMissingThumbnails(limit = 32) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: galleryImages.id, originalKey: galleryImages.originalKey, filename: galleryImages.filename })
    .from(galleryImages)
    .where(isNull(galleryImages.thumbnailUrl))
    .orderBy(desc(galleryImages.createdAt))
    .limit(limit);
}

export async function saveGalleryThumbnail(imageId: number, thumbnailUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(galleryImages).set({ thumbnailUrl }).where(eq(galleryImages.id, imageId));
}

export type AiProvider = "builtin" | "personal";
export type AiModel = "gemini-3-flash-preview" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite" | "gemini-3.5-flash-lite";

export async function getAiSettings() {
  const db = await getDb();
  if (!db) return { id: 0, enabled: false, autoAnalyzeNew: true, provider: "builtin" as AiProvider, model: "gemini-3-flash-preview" as AiModel, batchSize: 8 };
  const [existing] = await db.select().from(aiSettings).limit(1);
  if (existing) return existing;
  await db.insert(aiSettings).values({ enabled: false, autoAnalyzeNew: true, provider: "builtin", model: "gemini-3-flash-preview", batchSize: 8 });
  const [created] = await db.select().from(aiSettings).limit(1);
  return created!;
}

export async function updateAiSettings(input: Partial<{ enabled: boolean; autoAnalyzeNew: boolean; provider: AiProvider; model: AiModel; batchSize: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const settings = await getAiSettings();
  await db.update(aiSettings).set(input).where(eq(aiSettings.id, settings.id));
  return getAiSettings();
}

export async function getGalleryImage(imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, imageId)).limit(1);
  if (!image) throw new Error("Image not found");
  return image;
}

export async function getUnorganisedGalleryImages(imageIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!imageIds.length) return [];
  const [images, memberships] = await Promise.all([
    db.select().from(galleryImages).where(inArray(galleryImages.id, imageIds)),
    db.select({ imageId: albumImages.imageId }).from(albumImages).where(inArray(albumImages.imageId, imageIds)),
  ]);
  const assigned = new Set(memberships.map(membership => membership.imageId));
  return images.filter(image => !assigned.has(image.id));
}

export async function markImageAiStatus(imageId: number, status: "queued" | "analyzing" | "failed", error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(galleryImages).set({ aiStatus: status, aiError: error ?? null }).where(eq(galleryImages.id, imageId));
}

export async function saveJewellerySuggestion(input: { imageId: number; name: string; description: string; suggestedAlbumId: number | null; suggestedNewAlbum: string | null; model: AiModel }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(galleryImages).set({ aiStatus: "ready", aiName: input.name, aiDescription: input.description, aiSuggestedAlbumId: input.suggestedAlbumId, aiSuggestedNewAlbum: input.suggestedNewAlbum, aiModel: input.model, aiError: null, aiAnalyzedAt: new Date() }).where(eq(galleryImages.id, input.imageId));
  return getGalleryImage(input.imageId);
}

export async function approveJewellerySuggestion(input: { imageId: number; name?: string; description?: string; assignAlbum: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const image = await getGalleryImage(input.imageId);
  const name = input.name?.trim().slice(0, 120) || image.aiName || image.filename.replace(/\.[^/.]+$/, "");
  const description = input.description?.trim().slice(0, 160) || image.aiDescription || image.caption || "";
  let targetAlbumId: number | null = null;
  if (input.assignAlbum) {
    targetAlbumId = image.aiSuggestedAlbumId;
    if (!targetAlbumId && image.aiSuggestedNewAlbum) {
      const [existingAlbum] = await db.select().from(albums).where(and(eq(albums.kind, "custom"), eq(albums.name, image.aiSuggestedNewAlbum))).limit(1);
      if (existingAlbum) targetAlbumId = existingAlbum.id;
      else {
        const slug = `${image.aiSuggestedNewAlbum.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
        const created = await createAlbum({ slug, name: image.aiSuggestedNewAlbum, description: "", visibility: "public", presentationMode: "immersive", accent: "stone", sortOrder: 0 });
        targetAlbumId = created.id;
      }
    }
  }
  await db.update(galleryImages).set({ caption: description, aiName: name, aiDescription: description, aiStatus: "approved", aiError: null }).where(eq(galleryImages.id, input.imageId));
  if (targetAlbumId) {
    const existingMembers = await db.select({ imageId: albumImages.imageId }).from(albumImages).where(eq(albumImages.albumId, targetAlbumId));
    await setAlbumImages(targetAlbumId, [...existingMembers.map(member => member.imageId), image.id]);
  }
  return { image: await getGalleryImage(input.imageId), albumId: targetAlbumId };
}

export async function approveJewelleryBatch(imageIds: number[]) {
  const uniqueIds = Array.from(new Set(imageIds));
  const appliedIds: number[] = [];
  const skippedIds: number[] = [];
  for (const imageId of uniqueIds) {
    const image = await getGalleryImage(imageId);
    if (image.aiStatus !== "ready") {
      skippedIds.push(imageId);
      continue;
    }
    await approveJewellerySuggestion({ imageId, assignAlbum: true });
    appliedIds.push(imageId);
  }
  return { appliedIds, skippedIds };
}

export async function dismissJewellerySuggestion(imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(galleryImages).set({ aiStatus: "dismissed", aiError: null }).where(eq(galleryImages.id, imageId));
}

export async function createAlbum(input: { slug: string; name: string; description?: string; coverImageId?: number; visibility: "public" | "private"; presentationMode: "standard" | "immersive" | "kiosk"; accent: string; sortOrder: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(albums).values({ ...input, kind: "custom" });
  const [album] = await db.select().from(albums).where(eq(albums.slug, input.slug)).limit(1);
  return album;
}

export async function updateAlbum(albumId: number, input: Partial<{ name: string; description: string; coverImageId: number | null; visibility: "public" | "private"; presentationMode: "standard" | "immersive" | "kiosk"; accent: string; sortOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await assertCustomAlbum(db, albumId);
  await db.update(albums).set(input).where(eq(albums.id, albumId));
  const [album] = await db.select().from(albums).where(eq(albums.id, albumId)).limit(1);
  return album;
}

export async function deleteAlbum(albumId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await assertCustomAlbum(db, albumId);
  await db.delete(albumImages).where(eq(albumImages.albumId, albumId));
  await db.delete(albums).where(eq(albums.id, albumId));
}

export async function permanentlyDeleteImages(imageIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!imageIds.length) return;
  await db.delete(albumImages).where(inArray(albumImages.imageId, imageIds));
  await db.delete(galleryImages).where(inArray(galleryImages.id, imageIds));
}

export async function setAlbumImages(albumId: number, imageIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await assertCustomAlbum(db, albumId);
  if (imageIds.length) {
    await db.delete(albumImages).where(and(ne(albumImages.albumId, albumId), inArray(albumImages.imageId, imageIds)));
  }
  await db.delete(albumImages).where(eq(albumImages.albumId, albumId));
  if (imageIds.length) await db.insert(albumImages).values(imageIds.map((imageId, index) => ({ albumId, imageId, source: "manual" as const, sortOrder: index })));
}

export async function reorderAlbums(albumIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(albums).where(inArray(albums.id, albumIds));
  if (rows.length !== albumIds.length || rows.some(album => album.kind !== "custom")) throw new Error("Only custom albums can be reordered");
  await Promise.all(albumIds.map((albumId, index) => db.update(albums).set({ sortOrder: index }).where(eq(albums.id, albumId))));
}

async function assertCustomAlbum(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, albumId: number) {
  const [album] = await db.select().from(albums).where(eq(albums.id, albumId)).limit(1);
  if (!album || !isMutableAlbum(album.kind)) throw new Error("This permanent album cannot be modified");
  return album;
}

async function ensureAllImagesAlbum(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const [existing] = await db.select().from(albums).where(eq(albums.slug, "all-images")).limit(1);
  if (existing) return existing;
  await db.insert(albums).values({ slug: "all-images", kind: "system", name: "All Images", description: "Every image ever uploaded to your gallery.", visibility: "public", presentationMode: "immersive", accent: "stone", sortOrder: -1 });
  const [created] = await db.select().from(albums).where(eq(albums.slug, "all-images")).limit(1);
  return created;
}

export async function getAlbumDashboard() {
  const db = await getDb();
  if (!db) return { albums: [], images: [], memberships: [], aiSettings: { enabled: false, autoAnalyzeNew: false, provider: "builtin" as AiProvider, model: "gemini-3-flash-preview" as AiModel, batchSize: 8 } };
  await ensureAllImagesAlbum(db);
  const [albumRows, imageRows, membershipRows] = await Promise.all([
    db.select().from(albums).orderBy(albums.sortOrder, albums.createdAt),
    db.select().from(galleryImages).orderBy(desc(galleryImages.createdAt)),
    db.select().from(albumImages).orderBy(albumImages.sortOrder),
  ]);
  return { albums: albumRows, images: imageRows, memberships: membershipRows, aiSettings: await getAiSettings() };
}
