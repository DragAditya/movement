import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";

const endpoint = "https://s3.us-east-005.backblazeb2.com";
const bucket = "movement-media-waghaditya";
const configured = Boolean(process.env.B2_S3_KEY_ID && process.env.B2_S3_APPLICATION_KEY);
const suite = configured ? describe : describe.skip;

suite("configured Backblaze B2 credentials", () => {
  it("can access the restricted Movement media bucket", async () => {
    const client = new S3Client({
      region: "us-east-005",
      endpoint,
      credentials: {
        accessKeyId: process.env.B2_S3_KEY_ID ?? "",
        secretAccessKey: process.env.B2_S3_APPLICATION_KEY ?? "",
      },
    });

    const result = await client.send(new HeadBucketCommand({ Bucket: bucket }));
    expect(result.$metadata.httpStatusCode).toBe(200);
  }, 15_000);
});
