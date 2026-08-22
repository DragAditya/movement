import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { albumImages, albums, galleryImages, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function createAlbum(input: { slug: string; name: string; description?: string; coverImageId?: number; visibility: "public" | "private"; presentationMode: "standard" | "immersive" | "kiosk"; accent: string; sortOrder: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(albums).values(input);
  const [album] = await db.select().from(albums).where(eq(albums.slug, input.slug)).limit(1);
  return album;
}

export async function updateAlbum(albumId: number, input: Partial<{ name: string; description: string; coverImageId: number | null; visibility: "public" | "private"; presentationMode: "standard" | "immersive" | "kiosk"; accent: string; sortOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(albums).set(input).where(eq(albums.id, albumId));
  const [album] = await db.select().from(albums).where(eq(albums.id, albumId)).limit(1);
  return album;
}

export async function deleteAlbum(albumId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(albumImages).where(eq(albumImages.albumId, albumId));
  await db.delete(albums).where(eq(albums.id, albumId));
}

export async function setAlbumImages(albumId: number, imageIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(albumImages).where(eq(albumImages.albumId, albumId));
  if (imageIds.length) await db.insert(albumImages).values(imageIds.map((imageId, index) => ({ albumId, imageId, source: "manual" as const, sortOrder: index })));
}

export async function reorderAlbums(albumIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await Promise.all(albumIds.map((albumId, index) => db.update(albums).set({ sortOrder: index }).where(eq(albums.id, albumId))));
}

export async function getAlbumDashboard() {
  const db = await getDb();
  if (!db) return { albums: [], images: [], memberships: [] };
  const [albumRows, imageRows, membershipRows] = await Promise.all([
    db.select().from(albums).orderBy(albums.sortOrder, albums.createdAt),
    db.select().from(galleryImages).orderBy(desc(galleryImages.createdAt)),
    db.select().from(albumImages).orderBy(albumImages.sortOrder),
  ]);
  return { albums: albumRows, images: imageRows, memberships: membershipRows };
}
