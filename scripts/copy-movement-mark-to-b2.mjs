import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";

const accessKeyId = process.env.B2_S3_KEY_ID;
const secretAccessKey = process.env.B2_S3_APPLICATION_KEY;
const bucket = process.env.B2_S3_BUCKET ?? "movement-media-waghaditya";

if (!accessKeyId || !secretAccessKey) {
  throw new Error("Backblaze B2 credentials are required");
}

const client = new S3Client({
  region: process.env.B2_S3_REGION ?? "us-east-005",
  endpoint: process.env.B2_S3_ENDPOINT ?? "https://s3.us-east-005.backblazeb2.com",
  credentials: { accessKeyId, secretAccessKey },
});

const key = "branding/movement-mark.png";
const body = await readFile("/home/ubuntu/webdev-static-assets/movement-mark.png");

await client.send(new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  Body: body,
  ContentType: "image/png",
}));

console.log(`Copied Movement mark to ${key}`);
