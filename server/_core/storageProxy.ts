import type { Express } from "express";
import { ENV } from "./env";
import { isExternalObjectStorageEnabled, storageGetSignedUrl } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/brand/movement-mark", async (_req, res) => {
    if (!isExternalObjectStorageEnabled()) {
      res.redirect(307, "/manus-storage/movement-mark-reference_54d95abd.png");
      return;
    }

    try {
      const url = await storageGetSignedUrl("branding/movement-mark.png");
      res.set("Cache-Control", "private, max-age=300");
      res.redirect(307, url);
    } catch (error) {
      console.error("[BrandStorageProxy] failed:", error);
      res.status(502).send("Brand asset storage backend error");
    }
  });

  app.get("/media/*", async (req, res) => {
    if (!isExternalObjectStorageEnabled()) {
      res.status(404).send("External media storage is not enabled");
      return;
    }

    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "private, max-age=300");
      res.redirect(307, url);
    } catch (error) {
      console.error("[ExternalStorageProxy] failed:", error);
      res.status(502).send("External storage backend error");
    }
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
