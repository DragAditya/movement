import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { collections, galleryImages, InsertUser, users } from "../drizzle/schema";
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

export async function createGalleryImage(input: GalleryImageInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(galleryImages).values(input);
  const imageId = Number((result as unknown as { insertId: number }).insertId);
  const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, imageId)).limit(1);
  return image;
}

export async function createGalleryCollection(input: { slug: string; name: string; description?: string; coverImageUrl?: string; sharingMode: "standard" | "immersive" | "kiosk" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(collections).values(input);
  const collectionId = Number((result as unknown as { insertId: number }).insertId);
  const [collection] = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1);
  return collection;
}

export async function assignGalleryImagesToCollection(imageIds: number[], collectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!imageIds.length) return 0;
  const result = await db.update(galleryImages).set({ collectionId }).where(inArray(galleryImages.id, imageIds));
  return Number((result as unknown as { affectedRows: number }).affectedRows ?? imageIds.length);
}

export async function getGalleryDashboard() {
  const db = await getDb();
  if (!db) return { collections: [], uncategorized: [], assigned: [] };
  const [collectionRows, imageRows] = await Promise.all([
    db.select().from(collections).orderBy(collections.sortOrder, collections.createdAt),
    db.select().from(galleryImages),
  ]);
  const counts = new Map<number, number>();
  imageRows.forEach(image => { if (image.collectionId) counts.set(image.collectionId, (counts.get(image.collectionId) ?? 0) + 1); });
  return {
    collections: collectionRows.map(collection => ({ ...collection, imageCount: counts.get(collection.id) ?? 0 })),
    uncategorized: imageRows.filter(image => image.collectionId === null),
    assigned: imageRows.filter(image => image.collectionId !== null),
  };
}
