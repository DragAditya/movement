import sharp from "sharp";
import { and, eq, like } from "drizzle-orm";
import { albumImages, duplicateReviewCandidates, galleryImages } from "../drizzle/schema";
import * as db from "../server/db";

const baseUrl = "http://127.0.0.1:3000";
const token = `qa-duplicate-queue-${Date.now()}`;
const names = {
  base: `${token}-base.png`,
  exact: `${token}-exact.png`,
  visual: `${token}-visual.png`,
  other: `${token}-other.png`,
  replacement: `${token}-replacement.png`,
  bulkOne: `${token}-bulk-one.png`,
  bulkTwo: `${token}-bulk-two.png`,
  keepExact: `${token}-keep-exact.png`,
  keepVisual: `${token}-keep-visual.png`,
};

async function makeImage(background: string, label: string, brightness = 1) {
  const distinct = label === "Different QA";
  const artwork = distinct
    ? `<rect x="38" y="37" width="220" height="145" rx="10" fill="#ffffff"/><path d="M54 72 H245 M54 110 H207 M54 148 H164" stroke="#111111" stroke-width="17" stroke-linecap="round"/>`
    : `<path d="M48 168 L112 50 L176 168 Z" fill="#f7e8b3"/><circle cx="223" cy="97" r="38" fill="#201e25"/>`;
  const svg = Buffer.from(`<svg width="300" height="220" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="220" rx="18" fill="${background}"/>${artwork}<text x="24" y="204" font-family="Arial" font-size="19" fill="#ffffff">${label}</text></svg>`);
  const image = sharp(svg).png();
  return brightness === 1 ? image.toBuffer() : image.modulate({ brightness }).png().toBuffer();
}

async function upload(filename: string, body: Buffer) {
  const response = await fetch(`${baseUrl}/api/upload`, { method: "POST", headers: { "content-type": "image/png", "x-file-name": encodeURIComponent(filename), "x-image-width": "300", "x-image-height": "220" }, body });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`${filename}: ${response.status} ${JSON.stringify(payload)}`);
  return { status: response.status, payload };
}

async function qaCandidates() {
  return (await db.listPendingDuplicateReviewCandidates()).filter(candidate => candidate.filename.startsWith(token));
}

async function main() {
  const savedAiSettings = await db.getAiSettings();
  const tempAlbumName = `${token}-album`;
  let tempAlbumId: number | null = null;
  const dbConnection = await db.getDb();
  if (!dbConnection) throw new Error("Database unavailable for QA.");
  try {
    await db.updateAiSettings({ enabled: false });
    const base = await makeImage("#7455d9", "Movement QA");
    const visual = await makeImage("#7455d9", "Movement QA", 1.025);
    const replacementVisual = await makeImage("#7455d9", "Movement QA", 1.05);
    const bulkVisualOne = await makeImage("#7455d9", "Movement QA", 1.075);
    const bulkVisualTwo = await makeImage("#7455d9", "Movement QA", 1.1);
    const globalVisual = await makeImage("#7455d9", "Movement QA", 1.125);
    const other = await makeImage("#c85d4a", "Different QA");

    const first = await upload(names.base, base);
    const exact = await upload(names.exact, base);
    const similar = await upload(names.visual, visual);
    const independent = await upload(names.other, other);
    if (first.status !== 201 || independent.status !== 201 || exact.payload.reviewPending !== true || similar.payload.reviewPending !== true) throw new Error(`A mixed batch did not preserve independent normal and review-needed outcomes: ${JSON.stringify({ first, exact, similar, independent })}`);

    let pending = await qaCandidates();
    if (pending.length !== 2 || !pending.some(item => item.matchKind === "exact") || !pending.some(item => item.matchKind === "similar")) throw new Error("Exact and visual candidates were not both persisted.");
    const exactCandidate = pending.find(item => item.matchKind === "exact")!;
    const visualCandidate = pending.find(item => item.matchKind === "similar")!;

    const gallery = await db.listGalleryDuplicateCandidates();
    const baseImage = gallery.find(image => image.filename === names.base);
    if (!baseImage) throw new Error("The baseline gallery image was not persisted.");
    const tempAlbum = await db.createAlbum({ slug: `${token}-album`, name: tempAlbumName, description: "Temporary duplicate queue QA", visibility: "private", presentationMode: "standard", accent: "indigo", sortOrder: 9999 });
    tempAlbumId = tempAlbum.id;
    await db.setAlbumImages(tempAlbum.id, [baseImage.id]);

    await db.resolveDuplicateReviewCandidate(exactCandidate.id, "keep");
    const uploadedAsNew = await db.resolveDuplicateReviewCandidate(visualCandidate.id, "upload-as-new");
    if (!uploadedAsNew.imageId) throw new Error("Visual Upload as New did not create a gallery image.");

    const replacementUpload = await upload(names.replacement, replacementVisual);
    if (replacementUpload.payload.reviewPending !== true) throw new Error("Replacement candidate did not enter Needs Review.");
    pending = await qaCandidates();
    const replacementCandidate = pending.find(item => item.filename === names.replacement);
    if (!replacementCandidate) throw new Error("Replacement candidate was not persisted.");
    await db.resolveDuplicateReviewCandidate(replacementCandidate.id, "replace-existing");
    const [preservedMembership] = await dbConnection.select().from(albumImages).where(and(eq(albumImages.albumId, tempAlbum.id), eq(albumImages.imageId, baseImage.id))).limit(1);
    if (!preservedMembership) throw new Error("Replace With New did not preserve the existing album membership.");

    const bulkOne = await upload(names.bulkOne, bulkVisualOne);
    const bulkTwo = await upload(names.bulkTwo, bulkVisualTwo);
    if (bulkOne.payload.reviewPending !== true || bulkTwo.payload.reviewPending !== true) throw new Error("Similar bulk candidates were not persisted.");
    pending = await qaCandidates();
    const activeBulkCandidate = pending.find(item => item.filename === names.bulkOne);
    if (!activeBulkCandidate) throw new Error("First similar bulk candidate was not present.");
    const bulkResult = await db.resolveDuplicateReviewBulk({ candidateId: activeBulkCandidate.id, scope: "similar", decision: "upload-as-new" });
    if (bulkResult.resolvedCount !== 2) throw new Error(`Apply to Similar unexpectedly handled ${bulkResult.resolvedCount} candidates.`);

    const keepExact = await upload(names.keepExact, base);
    const keepVisual = await upload(names.keepVisual, globalVisual);
    if (keepExact.payload.reviewPending !== true || keepVisual.payload.reviewPending !== true) throw new Error("Global keep test candidates were not persisted.");
    pending = await qaCandidates();
    const globalKeep = await db.resolveDuplicateReviewBulk({ candidateId: pending[0].id, scope: "all", decision: "keep" });
    if (globalKeep.resolvedCount !== 2 || (await qaCandidates()).length !== 0) throw new Error("Apply to All did not safely clear all remaining review candidates.");

    console.log(JSON.stringify({ success: true, independentNormalUploads: 2, persistedCandidates: 2, sequentialDecisions: ["keep", "upload-as-new", "replace-existing"], similarBulkResolved: bulkResult.resolvedCount, globalKeepResolved: globalKeep.resolvedCount, membershipPreserved: true }));
  } finally {
    await db.updateAiSettings({ enabled: savedAiSettings.enabled, autoAnalyzeNew: savedAiSettings.autoAnalyzeNew, provider: savedAiSettings.provider, model: savedAiSettings.model, batchSize: savedAiSettings.batchSize });
    const qaImages = await dbConnection.select({ id: galleryImages.id }).from(galleryImages).where(like(galleryImages.filename, `${token}%`));
    if (qaImages.length) await db.permanentlyDeleteImages(qaImages.map(image => image.id));
    await dbConnection.delete(duplicateReviewCandidates).where(like(duplicateReviewCandidates.filename, `${token}%`));
    if (tempAlbumId) await db.deleteAlbum(tempAlbumId);
  }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
