import sharp from "sharp";
import * as db from "../server/db";

const baseUrl = "http://127.0.0.1:3000";
const token = `qa-review-visual-${Date.now()}`;

async function image(label: string, brightness = 1) {
  const svg = Buffer.from(`<svg width="360" height="260" xmlns="http://www.w3.org/2000/svg"><rect width="360" height="260" rx="22" fill="#6d56d4"/><path d="M54 202 L136 45 L224 202 Z" fill="#f9e6ad"/><circle cx="276" cy="102" r="45" fill="#26222f"/><text x="29" y="238" font-family="Arial" font-size="20" fill="#ffffff">${label}</text></svg>`);
  return sharp(svg).modulate({ brightness }).png().toBuffer();
}

async function upload(filename: string, body: Buffer) {
  const response = await fetch(`${baseUrl}/api/upload`, { method: "POST", headers: { "content-type": "image/png", "x-file-name": encodeURIComponent(filename), "x-image-width": "360", "x-image-height": "260" }, body });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`${filename}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function main() {
  const settings = await db.getAiSettings();
  try {
    await db.updateAiSettings({ enabled: false });
    const original = await image("Needs Review");
    const visual = await image("Needs Review", 1.05);
    await upload(`${token}-base.png`, original);
    const exact = await upload(`${token}-exact.png`, original);
    const similar = await upload(`${token}-similar.png`, visual);
    if (exact.reviewPending !== true || similar.reviewPending !== true) throw new Error("Could not create temporary review candidates.");
    console.log(JSON.stringify({ token, exactReviewId: exact.reviewId, similarReviewId: similar.reviewId }));
  } finally {
    await db.updateAiSettings({ enabled: settings.enabled, autoAnalyzeNew: settings.autoAnalyzeNew, provider: settings.provider, model: settings.model, batchSize: settings.batchSize });
  }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
