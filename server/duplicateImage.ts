import { createHash } from "node:crypto";
import sharp from "sharp";

export const visualDuplicateDistanceThreshold = 6;

export type DuplicateCandidate = {
  id: number;
  filename: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
  contentHash: string | null;
  visualHash: string | null;
};

export type DuplicateMatch = {
  kind: "exact" | "similar";
  image: DuplicateCandidate;
  distance: number;
  similarity: number;
};

export function contentHash(source: Buffer) {
  return createHash("sha256").update(source).digest("hex");
}

export async function visualHash(source: Buffer) {
  const pixels = await sharp(source, { failOn: "none", limitInputPixels: 64_000_000 })
    .rotate()
    .resize(9, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();
  let bits = "";
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const offset = row * 9 + column;
      bits += pixels[offset] > pixels[offset + 1] ? "1" : "0";
    }
  }
  return Array.from({ length: 16 }, (_, index) => Number.parseInt(bits.slice(index * 4, index * 4 + 4), 2).toString(16)).join("");
}

export function visualHashDistance(left: string, right: string) {
  if (!/^[a-f0-9]{16}$/i.test(left) || !/^[a-f0-9]{16}$/i.test(right)) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let difference = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (difference) { distance += 1; difference &= difference - 1; }
  }
  return distance;
}

export function visualSimilarity(distance: number) {
  return Math.max(0, Math.round((1 - distance / 64) * 100));
}

export function findDuplicateMatch(input: { contentHash: string; visualHash: string }, candidates: DuplicateCandidate[]): DuplicateMatch | null {
  const exact = candidates.find(candidate => candidate.contentHash === input.contentHash);
  if (exact) return { kind: "exact", image: exact, distance: 0, similarity: 100 };
  const closest = candidates
    .filter((candidate): candidate is DuplicateCandidate & { visualHash: string } => Boolean(candidate.visualHash))
    .map(candidate => ({ candidate, distance: visualHashDistance(input.visualHash, candidate.visualHash) }))
    .sort((left, right) => left.distance - right.distance)[0];
  if (!closest || closest.distance > visualDuplicateDistanceThreshold) return null;
  return { kind: "similar", image: closest.candidate, distance: closest.distance, similarity: visualSimilarity(closest.distance) };
}
