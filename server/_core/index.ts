import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storageGetSignedUrl, storagePut } from "../storage";
import { nanoid } from "nanoid";
import { createGalleryImage, listGalleryDuplicateCandidates, listGalleryImagesMissingFingerprints, listGalleryImagesMissingPreviews, listGalleryImagesMissingThumbnails, replaceGalleryImage, saveGalleryFingerprints, saveGalleryPreview, saveGalleryThumbnail } from "../db";
import { contentHash, findDuplicateMatch, visualHash } from "../duplicateImage";
import { runNewJewelleryAnalysis } from "../jewelleryAi";
import sharp from "sharp";

const thumbnailMaxSide = 960;

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

async function backfillGalleryDerivatives() {
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

async function backfillGalleryFingerprints() {
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

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/upload", express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/avif"], limit: "50mb" }), async (req, res) => {
    const contentType = req.headers["content-type"]?.split(";")[0] ?? "";
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!acceptedTypes.includes(contentType) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Use a supported JPEG, PNG, WebP, or AVIF image." });
      return;
    }
    const rawName = typeof req.headers["x-file-name"] === "string" ? req.headers["x-file-name"] : "image";
    const filename = decodeURIComponent(rawName).replace(/[^a-zA-Z0-9._-]/g, "-");
    const width = Number(req.headers["x-image-width"] ?? 0) || undefined;
    const height = Number(req.headers["x-image-height"] ?? 0) || undefined;
    try {
      const fingerprints = { contentHash: contentHash(req.body), visualHash: await visualHash(req.body) };
      const duplicate = findDuplicateMatch(fingerprints, await listGalleryDuplicateCandidates());
      const decision = typeof req.headers["x-duplicate-decision"] === "string" ? req.headers["x-duplicate-decision"] : "";
      const replacementId = Number(req.headers["x-replace-image-id"] ?? 0);
      const canUploadVisualMatch = duplicate?.kind === "similar" && decision === "upload-as-new";
      const canReplaceVisualMatch = duplicate?.kind === "similar" && decision === "replace-existing" && replacementId === duplicate.image.id;
      if (duplicate && !canUploadVisualMatch && !canReplaceVisualMatch) {
        res.status(409).json({ error: duplicate.kind === "exact" ? "This exact image is already in your library." : "A visually similar image needs your review before uploading.", duplicate: { kind: duplicate.kind, distance: duplicate.distance, similarity: duplicate.similarity, image: { id: duplicate.image.id, filename: duplicate.image.filename, originalUrl: duplicate.image.originalUrl, thumbnailUrl: duplicate.image.thumbnailUrl, previewUrl: duplicate.image.previewUrl, width: duplicate.image.width, height: duplicate.image.height, createdAt: duplicate.image.createdAt } } });
        return;
      }
      const stored = await storagePut(`gallery/originals/${nanoid()}-${filename}`, req.body, contentType);
      let thumbnailUrl: string | undefined;
      let previewUrl: string | undefined;
      try {
        thumbnailUrl = (await storeGalleryThumbnail(req.body, filename)).url;
      } catch (thumbnailError) {
        console.warn("[Upload] Original stored without a thumbnail", thumbnailError);
      }
      try {
        previewUrl = (await storeGalleryPreview(req.body, filename)).url;
      } catch (previewError) {
        console.warn("[Upload] Original stored without a compact preview", previewError);
      }
      try {
        const values = { originalKey: stored.key, originalUrl: stored.url, thumbnailUrl, previewUrl, filename, mimeType: contentType, fileSize: req.body.length, width, height, ...fingerprints };
        const image = canReplaceVisualMatch ? await replaceGalleryImage(replacementId, values) : await createGalleryImage(values);
        const analysis = image ? await runNewJewelleryAnalysis(image.id) : undefined;
        res.status(201).json({ key: stored.key, url: stored.url, thumbnailUrl, previewUrl, stored: true, persisted: true, imageId: image?.id, replaced: canReplaceVisualMatch, aiStatus: analysis?.status });
      } catch (indexError) {
        console.error("[Upload] Image stored but record indexing failed", indexError);
        res.status(202).json({ key: stored.key, url: stored.url, thumbnailUrl, previewUrl, stored: true, persisted: false, filename, mimeType: contentType, fileSize: req.body.length, contentHash: fingerprints.contentHash, visualHash: fingerprints.visualHash, width, height });
      }
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
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    void backfillGalleryDerivatives();
    void backfillGalleryFingerprints();
  });
}

startServer().catch(console.error);
