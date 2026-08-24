import mysql from "mysql2/promise";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const sourceConnectionString = process.env.DATABASE_URL;
const targetConnectionString = process.env.TIDB_DATABASE_URL;
const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;
const accessKeyId = process.env.B2_S3_KEY_ID;
const secretAccessKey = process.env.B2_S3_APPLICATION_KEY;
const bucket = process.env.B2_S3_BUCKET ?? "movement-media-waghaditya";

if (!sourceConnectionString || !targetConnectionString || !forgeApiUrl || !forgeApiKey || !accessKeyId || !secretAccessKey) {
  throw new Error("Source database, DragAdi database, Forge storage, and B2 credentials are all required");
}

function connectionOptions(connectionString) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: { rejectUnauthorized: true },
  };
}

function mediaKey(url) {
  if (!url) return undefined;
  const marker = "/manus-storage/";
  const markerIndex = url.indexOf(marker);
  return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : undefined;
}

function mediaUrl(key) {
  return `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function getForgeAsset(key) {
  const presignUrl = new URL("v1/storage/presign/get", `${forgeApiUrl.replace(/\/+$/, "")}/`);
  presignUrl.searchParams.set("path", key);
  const presignResponse = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeApiKey}` } });
  if (!presignResponse.ok) throw new Error(`Could not presign ${key}: ${presignResponse.status}`);
  const { url } = await presignResponse.json();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${key}: ${response.status}`);
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

const source = await mysql.createConnection(connectionOptions(sourceConnectionString));
const target = await mysql.createConnection(connectionOptions(targetConnectionString));
const b2 = new S3Client({
  region: process.env.B2_S3_REGION ?? "us-east-005",
  endpoint: process.env.B2_S3_ENDPOINT ?? "https://s3.us-east-005.backblazeb2.com",
  credentials: { accessKeyId, secretAccessKey },
});

try {
  const [images] = await source.query("SELECT id, originalKey, thumbnailUrl, previewUrl FROM galleryImages ORDER BY id");
  for (const image of images) {
    const keys = [image.originalKey, mediaKey(image.thumbnailUrl), mediaKey(image.previewUrl)].filter(Boolean);
    for (const key of new Set(keys)) {
      const asset = await getForgeAsset(key);
      await b2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: asset.body, ContentType: asset.contentType }));
    }

    const thumbnailKey = mediaKey(image.thumbnailUrl);
    const previewKey = mediaKey(image.previewUrl);
    await target.execute(
      "UPDATE galleryImages SET originalUrl = ?, thumbnailUrl = ?, previewUrl = ? WHERE id = ?",
      [mediaUrl(image.originalKey), thumbnailKey ? mediaUrl(thumbnailKey) : null, previewKey ? mediaUrl(previewKey) : null, image.id],
    );
    console.log(`Copied image ${image.id} (${keys.length} assets)`);
  }
  console.log("Movement media transfer to Backblaze B2 complete.");
} finally {
  await source.end();
  await target.end();
}
