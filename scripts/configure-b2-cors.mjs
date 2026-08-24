import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

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

let rules = [];
try {
  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  rules = current.CORSRules ?? [];
} catch (error) {
  if (!(error instanceof Error) || !/NoSuchCORSConfiguration/i.test(error.name)) throw error;
}

const ruleId = "MovementVercelDirectUpload";
const nextRules = [
  ...rules.filter(rule => rule.ID !== ruleId),
  {
    ID: ruleId,
    AllowedOrigins: ["https://movement-tawny-gamma.vercel.app", "https://*.vercel.app"],
    AllowedMethods: ["PUT"],
    AllowedHeaders: ["content-type"],
    ExposeHeaders: ["etag"],
    MaxAgeSeconds: 3600,
  },
];

await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: nextRules } }));
console.log(`Configured ${ruleId} without removing ${rules.length} existing CORS rule(s).`);
