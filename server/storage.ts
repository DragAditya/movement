// Storage helpers support the existing Manus Forge proxy by default and an
// opt-in Backblaze B2 backend for external Vercel deployments.

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export function isExternalObjectStorageEnabled(): boolean {
  return process.env.MOVEMENT_STORAGE_PROVIDER === "b2"
    || Boolean(process.env.VERCEL && process.env.B2_S3_KEY_ID && process.env.B2_S3_APPLICATION_KEY);
}

function getB2Config() {
  const accessKeyId = process.env.B2_S3_KEY_ID;
  const secretAccessKey = process.env.B2_S3_APPLICATION_KEY;
  const bucket = process.env.B2_S3_BUCKET ?? "movement-media-waghaditya";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Backblaze B2 storage is not fully configured");
  }

  return { accessKeyId, secretAccessKey, bucket };
}

function getB2Client() {
  const { accessKeyId, secretAccessKey } = getB2Config();
  return new S3Client({
    region: process.env.B2_S3_REGION ?? "us-east-005",
    endpoint: process.env.B2_S3_ENDPOINT ?? "https://s3.us-east-005.backblazeb2.com",
    credentials: { accessKeyId, secretAccessKey },
  });
}

function externalMediaUrl(key: string): string {
  return `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (isExternalObjectStorageEnabled()) {
    const { bucket } = getB2Config();
    await getB2Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));
    return { key, url: externalMediaUrl(key) };
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (isExternalObjectStorageEnabled()) return { key, url: externalMediaUrl(key) };
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  if (isExternalObjectStorageEnabled()) {
    const { bucket } = getB2Config();
    return getSignedUrl(getB2Client(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 60 * 15 });
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}

/**
 * Creates a short-lived browser upload URL only when the external B2 adapter is
 * active. The browser receives no storage credential and can upload only to the
 * one generated staging key.
 */
export async function storageCreateDirectUploadUrl(relKey: string, contentType: string): Promise<{ key: string; url: string; mediaUrl: string }> {
  if (!isExternalObjectStorageEnabled()) {
    throw new Error("Direct browser uploads require external object storage");
  }

  const key = normalizeKey(relKey);
  const { bucket } = getB2Config();
  const url = await getSignedUrl(
    getB2Client(),
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 60 * 15 },
  );

  return { key, url, mediaUrl: externalMediaUrl(key) };
}
