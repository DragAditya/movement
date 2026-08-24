import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { isExternalObjectStorageEnabled, storageCreateDirectUploadUrl, storageGet, storageGetSignedUrl, storagePut } from "../storage";
import { nanoid } from "nanoid";
import { createDuplicateReviewCandidate, createGalleryImage, listGalleryDuplicateCandidates, listGalleryImagesMissingFingerprints, listGalleryImagesMissingPreviews, listGalleryImagesMissingThumbnails, saveGalleryFingerprints, saveGalleryPreview, saveGalleryThumbnail } from "../db";
import { contentHash, findDuplicateMatch, visualHash } from "../duplicateImage";
import { runNewJewelleryAnalysis } from "../jewelleryAi";
import sharp from "sharp";
import { createStagedUploadKey, isStagedUploadKey, isSupportedImageMimeType, normalizeUploadFilename, supportedImageMimeTypes } from "../externalUpload";

const thumbnailMaxSide = 960;
const maxUploadBytes = 50 * 1024 * 1024;

type UploadedImageDetails = {
  source: Buffer;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  stored?: { key: string; url: string };
};

async function persistUploadedImage({ source, filename, mimeType, width, height, stored: existingStored }: UploadedImageDetails) {
  const fingerprints = { contentHash: contentHash(source), visualHash: await visualHash(source) };
  const duplicate = findDuplicateMatch(fingerprints, await listGalleryDuplicateCandidates());
  const stored = existingStored ?? await storagePut(`${duplicate ? "gallery/review-candidates/originals" : "gallery/originals"}/${nanoid()}-${filename}`, source, mimeType);
  let thumbnailUrl: string | undefined;
  let previewUrl: string | undefined;
  try {
    thumbnailUrl = (await storeGalleryThumbnail(source, filename)).url;
  } catch (thumbnailError) {
    console.warn("[Upload] Original stored without a thumbnail", thumbnailError);
  }
  try {
    previewUrl = (await storeGalleryPreview(source, filename)).url;
  } catch (previewError) {
    console.warn("[Upload] Original stored without a compact preview", previewError);
  }
  const values = { originalKey: stored.key, originalUrl: stored.url, thumbnailUrl, previewUrl, filename, mimeType, fileSize: source.length, width, height, ...fingerprints };
  if (duplicate) {
    const review = await createDuplicateReviewCandidate({ ...values, matchKind: duplicate.kind, matchedImageId: duplicate.image.id, distance: duplicate.distance, similarity: duplicate.similarity });
    return { status: 202, payload: { key: stored.key, url: stored.url, thumbnailUrl, previewUrl, stored: true, reviewPending: true, reviewId: review.id, filename, mimeType, fileSize: source.length, width, height, contentHash: fingerprints.contentHash, visualHash: fingerprints.visualHash } };
  }
  try {
    const image = await createGalleryImage(values);
    const analysis = image ? await runNewJewelleryAnalysis(image.id) : undefined;
    return { status: 201, payload: { key: stored.key, url: stored.url, thumbnailUrl, previewUrl, stored: true, persisted: true, imageId: image?.id, aiStatus: analysis?.status } };
  } catch (indexError) {
    console.error("[Upload] Image stored but record indexing failed", indexError);
    return { status: 202, payload: { key: stored.key, url: stored.url, thumbnailUrl, previewUrl, stored: true, persisted: false, filename, mimeType, fileSize: source.length, contentHash: fingerprints.contentHash, visualHash: fingerprints.visualHash, width, height } };
  }
}

async function storeGalleryThumbnail(source: Buffer, filename: string) {
  const thumbnail = await sharp(source, { failOn: "none", limitInputPixels: 64_000_000 })
    .rotate()
    .resize(thumbnailMaxSide, thumbnailMaxSide, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer();
  return storagePut(`gallery/thumbnails/${nanoid()}-${filename.replace(/\.[^/.]+$/, "")}.jpg`, thumbnail, "image/jpeg");
}

async function storeGalleryPreview(source: Buffer, filename: string) {
  const preview = await sharp(source, { failOn: "none", limitInputPixels: 64_000_000 })
    .rotate()
    .resize(560, 560, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();
  return storagePut(`gallery/previews/${nanoid()}-${filename.replace(/\.[^/.]+$/, "")}.jpg`, preview, "image/jpeg");
}

export async function backfillGalleryDerivatives() {
  const missingThumbnails = await listGalleryImagesMissingThumbnails();
  for (const image of missingThumbnails) {
    try {
      const signedUrl = await storageGetSignedUrl(image.originalKey);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error(`Original download failed (${response.status})`);
      const thumbnail = await storeGalleryThumbnail(Buffer.from(await response.arrayBuffer()), image.filename);
      await saveGalleryThumbnail(image.id, thumbnail.url);
    } catch (error) {
      console.warn(`[Thumbnail] Could not prepare ${image.id}`, error);
    }
  }
  const missingPreviews = await listGalleryImagesMissingPreviews();
  for (const image of missingPreviews) {
    try {
      const signedUrl = await storageGetSignedUrl(image.originalKey);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error(`Original download failed (${response.status})`);
      const preview = await storeGalleryPreview(Buffer.from(await response.arrayBuffer()), image.filename);
      await saveGalleryPreview(image.id, preview.url);
    } catch (error) {
      console.warn(`[Preview] Could not prepare ${image.id}`, error);
    }
  }
}

export async function backfillGalleryFingerprints() {
  const missing = await listGalleryImagesMissingFingerprints();
  for (const image of missing) {
    try {
      const signedUrl = await storageGetSignedUrl(image.originalKey);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error(`Original download failed (${response.status})`);
      const source = Buffer.from(await response.arrayBuffer());
      await saveGalleryFingerprints(image.id, { contentHash: contentHash(source), visualHash: await visualHash(source) });
    } catch (error) {
      console.warn(`[Duplicate checker] Could not fingerprint ${image.id}`, error);
    }
  }
}

export function createMovementApp() {
  const app = express();
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/upload/presign", express.json({ limit: "1mb" }), async (req, res) => {
    const body = req.body as { filename?: string; mimeType?: string; fileSize?: number; width?: number; height?: number };
    if (!body.filename || !body.mimeType || !body.fileSize || !isSupportedImageMimeType(body.mimeType) || body.fileSize > maxUploadBytes || body.fileSize < 1) {
      res.status(400).json({ error: "Use a supported JPEG, PNG, WebP, or AVIF image up to 50 MB." });
      return;
    }
    if (!isExternalObjectStorageEnabled()) {
      res.json({ direct: false });
      return;
    }
    try {
      const filename = normalizeUploadFilename(body.filename);
      const upload = await storageCreateDirectUploadUrl(createStagedUploadKey(filename), body.mimeType);
      res.status(201).json({ direct: true, uploadUrl: upload.url, key: upload.key, url: upload.mediaUrl, filename, mimeType: body.mimeType, fileSize: body.fileSize, width: Number(body.width) || undefined, height: Number(body.height) || undefined });
    } catch (error) {
      console.error("[Upload] Could not create direct storage upload", error);
      res.status(503).json({ error: "Image storage is temporarily unavailable. Please retry." });
    }
  });
  app.post("/api/upload/process", express.json({ limit: "1mb" }), async (req, res) => {
    const body = req.body as { key?: string; filename?: string; mimeType?: string; fileSize?: number; width?: number; height?: number };
    if (!body.key || !body.filename || !body.mimeType || !body.fileSize || !isStagedUploadKey(body.key) || !isSupportedImageMimeType(body.mimeType) || body.fileSize > maxUploadBytes || body.fileSize < 1) {
      res.status(400).json({ error: "Stored image metadata is incomplete." });
      return;
    }
    try {
      const signedUrl = await storageGetSignedUrl(body.key);
      const download = await fetch(signedUrl);
      if (!download.ok) throw new Error(`Stored upload could not be downloaded (${download.status})`);
      const source = Buffer.from(await download.arrayBuffer());
      if (source.length !== body.fileSize || source.length > maxUploadBytes) throw new Error("Stored upload size does not match its upload request");
      const stored = await storageGet(body.key);
      const result = await persistUploadedImage({ source, stored, filename: normalizeUploadFilename(body.filename), mimeType: body.mimeType, width: Number(body.width) || undefined, height: Number(body.height) || undefined });
      res.status(result.status).json(result.payload);
    } catch (error) {
      console.error("[Upload] Stored image processing failed", error);
      res.status(503).json({ error: "Your image is stored safely. Retry to finish library processing." });
    }
  });
  app.post("/api/upload", express.raw({ type: [...supportedImageMimeTypes], limit: "50mb" }), async (req, res) => {
    const contentType = req.headers["content-type"]?.split(";")[0] ?? "";
    if (!isSupportedImageMimeType(contentType) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Use a supported JPEG, PNG, WebP, or AVIF image." });
      return;
    }
    const rawName = typeof req.headers["x-file-name"] === "string" ? req.headers["x-file-name"] : "image";
    const filename = normalizeUploadFilename(rawName);
    const width = Number(req.headers["x-image-width"] ?? 0) || undefined;
    const height = Number(req.headers["x-image-height"] ?? 0) || undefined;
    try {
      const result = await persistUploadedImage({ source: req.body, filename, mimeType: contentType, width, height });
      res.status(result.status).json(result.payload);
    } catch (error) {
      console.error("[Upload] Failed before image storage completed", error);
      res.status(500).json({ error: "Image storage was unavailable. Please retry." });
    }
  });
  app.post("/api/upload/reconcile", express.json({ limit: "1mb" }), async (req, res) => {
    const body = req.body as { key?: string; url?: string; thumbnailUrl?: string; previewUrl?: string; filename?: string; mimeType?: string; fileSize?: number; contentHash?: string; visualHash?: string; width?: number; height?: number };
    if (!body.key || !body.url || !body.filename || !body.mimeType || !body.fileSize) {
      res.status(400).json({ error: "Stored image metadata is incomplete." });
      return;
    }
    try {
      const image = await createGalleryImage({ originalKey: body.key, originalUrl: body.url, thumbnailUrl: body.thumbnailUrl, previewUrl: body.previewUrl, filename: body.filename, mimeType: body.mimeType, fileSize: body.fileSize, contentHash: body.contentHash, visualHash: body.visualHash, width: body.width, height: body.height });
      const analysis = image ? await runNewJewelleryAnalysis(image.id) : undefined;
      res.status(201).json({ persisted: true, imageId: image?.id, aiStatus: analysis?.status });
    } catch (error) {
      console.error("[Upload] Pending record reconciliation failed", error);
      res.status(503).json({ persisted: false, error: "Image is safely stored and will be indexed when the connection is ready." });
    }
  });
  registerStorageProxy(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
