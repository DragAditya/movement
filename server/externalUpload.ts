import { nanoid } from "nanoid";

export const supportedImageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export function isSupportedImageMimeType(value: string): value is (typeof supportedImageMimeTypes)[number] {
  return (supportedImageMimeTypes as readonly string[]).includes(value);
}

export function normalizeUploadFilename(value: string): string {
  const decoded = decodeURIComponent(value || "image");
  return decoded.replace(/[^a-zA-Z0-9._-]/g, "-") || "image";
}

export function createStagedUploadKey(filename: string): string {
  return `gallery/staging/${nanoid()}-${normalizeUploadFilename(filename)}`;
}

export function isStagedUploadKey(key: string): boolean {
  return key.startsWith("gallery/staging/") && !key.includes("..") && !key.startsWith("/");
}
