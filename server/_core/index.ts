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
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { createGalleryImage } from "../db";

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
      const stored = await storagePut(`gallery/originals/${nanoid()}-${filename}`, req.body, contentType);
      const image = await createGalleryImage({ originalKey: stored.key, originalUrl: stored.url, filename, mimeType: contentType, fileSize: req.body.length, width, height });
      res.status(201).json({ key: stored.key, url: stored.url, original: true, imageId: image?.id });
    } catch (error) {
      console.error("[Upload] Failed to store image", error);
      res.status(500).json({ error: "Image storage was unavailable. Please retry." });
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
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
