import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const galleryImages = mysqlTable("galleryImages", {
  id: int("id").autoincrement().primaryKey(),
  originalKey: varchar("originalKey", { length: 512 }).notNull(),
  originalUrl: text("originalUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  width: int("width"),
  height: int("height"),
  caption: text("caption"),
  aiStatus: mysqlEnum("aiStatus", ["off", "queued", "analyzing", "ready", "approved", "dismissed", "failed"]).default("off").notNull(),
  aiName: varchar("aiName", { length: 120 }),
  aiDescription: varchar("aiDescription", { length: 160 }),
  aiSuggestedAlbumId: int("aiSuggestedAlbumId"),
  aiSuggestedNewAlbum: varchar("aiSuggestedNewAlbum", { length: 80 }),
  aiModel: varchar("aiModel", { length: 80 }),
  aiError: varchar("aiError", { length: 255 }),
  aiAnalyzedAt: timestamp("aiAnalyzedAt"),
  smartGroup: mysqlEnum("smartGroup", ["personal", "screens", "projects"]).default("personal").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const aiSettings = mysqlTable("aiSettings", {
  id: int("id").autoincrement().primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  autoAnalyzeNew: boolean("autoAnalyzeNew").default(true).notNull(),
  provider: mysqlEnum("provider", ["builtin", "personal"]).default("builtin").notNull(),
  model: mysqlEnum("model", ["gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]).default("gemini-3-flash-preview").notNull(),
  batchSize: int("batchSize").default(8).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const albums = mysqlTable("albums", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  kind: mysqlEnum("kind", ["system", "custom"]).default("custom").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  coverImageId: int("coverImageId"),
  visibility: mysqlEnum("visibility", ["public", "private"]).default("public").notNull(),
  presentationMode: mysqlEnum("presentationMode", ["standard", "immersive", "kiosk"]).default("immersive").notNull(),
  accent: varchar("accent", { length: 24 }).default("stone").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const albumImages = mysqlTable("albumImages", {
  id: int("id").autoincrement().primaryKey(),
  albumId: int("albumId").notNull(),
  imageId: int("imageId").notNull(),
  source: mysqlEnum("source", ["manual", "auto"]).default("manual").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("albumImages_album_image_unique").on(table.albumId, table.imageId), uniqueIndex("albumImages_image_unique").on(table.imageId)]);

export const slideshowSettings = mysqlTable("slideshowSettings", {
  id: int("id").autoincrement().primaryKey(),
  autoplay: boolean("autoplay").default(true).notNull(),
  loop: boolean("loop").default(true).notNull(),
  intervalSeconds: int("intervalSeconds").default(5).notNull(),
  transition: mysqlEnum("transition", ["fade", "crossfade", "slide", "instant"]).default("crossfade").notNull(),
  transitionSpeed: int("transitionSpeed").default(400).notNull(),
  background: varchar("background", { length: 24 }).default("near-black").notNull(),
  imageFit: mysqlEnum("imageFit", ["contain", "cover"]).default("contain").notNull(),
  showControls: boolean("showControls").default(true).notNull(),
  showCounter: boolean("showCounter").default(true).notNull(),
  showCaptions: boolean("showCaptions").default(true).notNull(),
  swipeEnabled: boolean("swipeEnabled").default(true).notNull(),
  keyboardEnabled: boolean("keyboardEnabled").default(true).notNull(),
  tapNavigationEnabled: boolean("tapNavigationEnabled").default(true).notNull(),
  defaultMode: mysqlEnum("defaultMode", ["standard", "immersive", "kiosk"]).default("immersive").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const activityEvents = mysqlTable("activityEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 96 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GalleryImage = typeof galleryImages.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type AlbumImage = typeof albumImages.$inferSelect;
export type AiSettings = typeof aiSettings.$inferSelect;
