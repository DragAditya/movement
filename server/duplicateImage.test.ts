import { describe, expect, it } from "vitest";
import { contentHash, findDuplicateMatch, visualHashDistance, visualSimilarity, type DuplicateCandidate } from "./duplicateImage";

const candidate = (overrides: Partial<DuplicateCandidate> = {}): DuplicateCandidate => ({
  id: 1,
  filename: "existing.jpg",
  originalUrl: "/manus-storage/existing.jpg",
  thumbnailUrl: null,
  previewUrl: null,
  width: 1200,
  height: 1200,
  createdAt: new Date("2026-08-23T00:00:00.000Z"),
  contentHash: "a".repeat(64),
  visualHash: "0123456789abcdef",
  ...overrides,
});

describe("duplicate image checker", () => {
  it("creates a stable exact file fingerprint", () => {
    expect(contentHash(Buffer.from("same-image"))).toBe(contentHash(Buffer.from("same-image")));
    expect(contentHash(Buffer.from("same-image"))).not.toBe(contentHash(Buffer.from("different-image")));
  });

  it("prioritizes an exact file match over a visual match", () => {
    const match = findDuplicateMatch({ contentHash: "a".repeat(64), visualHash: "ffffffffffffffff" }, [candidate()]);
    expect(match).toMatchObject({ kind: "exact", distance: 0, similarity: 100, image: { id: 1 } });
  });

  it("returns a careful visual match only inside the threshold", () => {
    const closeHash = "0123456789abcdee";
    expect(visualHashDistance("0123456789abcdef", closeHash)).toBe(1);
    const match = findDuplicateMatch({ contentHash: "b".repeat(64), visualHash: closeHash }, [candidate()]);
    expect(match?.kind).toBe("similar");
    expect(match?.similarity).toBe(visualSimilarity(1));
    expect(findDuplicateMatch({ contentHash: "b".repeat(64), visualHash: "ffffffffffffffff" }, [candidate()])).toBeNull();
  });
});
