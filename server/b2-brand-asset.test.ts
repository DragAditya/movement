import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";

const accessKeyId = process.env.B2_S3_KEY_ID;
const secretAccessKey = process.env.B2_S3_APPLICATION_KEY;
const bucket = process.env.B2_S3_BUCKET ?? "movement-media-waghaditya";
const configured = Boolean(accessKeyId && secretAccessKey);
const suite = configured ? describe : describe.skip;

suite("Movement Backblaze brand asset", () => {
  it("keeps the Vercel-delivered mark in the private media bucket", async () => {
    const client = new S3Client({
      region: process.env.B2_S3_REGION ?? "us-east-005",
      endpoint: process.env.B2_S3_ENDPOINT ?? "https://s3.us-east-005.backblazeb2.com",
      credentials: { accessKeyId: accessKeyId ?? "", secretAccessKey: secretAccessKey ?? "" },
    });

    const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: "branding/movement-mark.png" }));
    expect(result.ContentType).toBe("image/png");
    expect(result.ContentLength).toBeGreaterThan(0);
  }, 15_000);
});
