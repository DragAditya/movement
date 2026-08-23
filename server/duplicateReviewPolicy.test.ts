import { describe, expect, it } from "vitest";
import { isDuplicateReviewBulkDecisionAllowed, isDuplicateReviewDecisionAllowed, isInSimilarReviewScope } from "./duplicateReviewPolicy";

describe("duplicate review safety policy", () => {
  it("allows exact repeats to be discarded only", () => {
    expect(isDuplicateReviewDecisionAllowed("exact", "keep")).toBe(true);
    expect(isDuplicateReviewDecisionAllowed("exact", "upload-as-new")).toBe(false);
    expect(isDuplicateReviewDecisionAllowed("exact", "replace-existing")).toBe(false);
  });

  it("limits global bulk handling to the conservative keep-old decision", () => {
    expect(isDuplicateReviewBulkDecisionAllowed("all", "exact", "keep")).toBe(true);
    expect(isDuplicateReviewBulkDecisionAllowed("all", "similar", "upload-as-new")).toBe(false);
  });

  it("scopes similar bulk handling to visual candidates matched to the same existing image", () => {
    const active = { matchKind: "similar" as const, matchedImageId: 24 };
    expect(isDuplicateReviewBulkDecisionAllowed("similar", active.matchKind, "upload-as-new")).toBe(true);
    expect(isInSimilarReviewScope({ matchKind: "similar", matchedImageId: 24 }, active)).toBe(true);
    expect(isInSimilarReviewScope({ matchKind: "similar", matchedImageId: 25 }, active)).toBe(false);
    expect(isInSimilarReviewScope({ matchKind: "exact", matchedImageId: 24 }, active)).toBe(false);
  });
});
