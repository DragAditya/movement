import mysql from "mysql2/promise";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.TIDB_DATABASE_URL;
const keyId = process.env.B2_S3_KEY_ID;
const applicationKey = process.env.B2_S3_APPLICATION_KEY;
const enabled = Boolean(databaseUrl && keyId && applicationKey);
const suite = enabled ? describe : describe.skip;
const bucket = "movement-media-waghaditya";

function keyFromMediaUrl(url: string | null) {
  return url?.startsWith("/media/") ? decodeURIComponent(url.slice("/media/".length)) : undefined;
}

suite("Backblaze B2 media transfer", () => {
  it("has every DragAdi gallery original and derivative in private object storage", async () => {
    const url = new URL(databaseUrl!);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: Number(url.port || 4000),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      ssl: { rejectUnauthorized: true },
    });
    const client = new S3Client({
      region: "us-east-005",
      endpoint: "https://s3.us-east-005.backblazeb2.com",
      credentials: { accessKeyId: keyId!, secretAccessKey: applicationKey! },
    });

    try {
      const [images] = await connection.query<Array<{ originalKey: string; originalUrl: string; thumbnailUrl: string | null; previewUrl: string | null }>>(
        "SELECT originalKey, originalUrl, thumbnailUrl, previewUrl FROM galleryImages",
      );
      expect(images.length).toBeGreaterThan(0);
      for (const image of images) {
        expect(image.originalUrl).toBe(`/media/${image.originalKey}`);
        const keys = [image.originalKey, keyFromMediaUrl(image.thumbnailUrl), keyFromMediaUrl(image.previewUrl)].filter(Boolean);
        for (const key of keys) {
          const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
          expect(result.$metadata.httpStatusCode).toBe(200);
        }
      }
    } finally {
      await connection.end();
    }
  }, 60_000);
});
