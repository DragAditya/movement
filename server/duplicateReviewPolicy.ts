export type DuplicateReviewMatchKind = "exact" | "similar";
export type DuplicateReviewDecision = "keep" | "upload-as-new" | "replace-existing";
export type DuplicateReviewBulkScope = "similar" | "all";

export function isDuplicateReviewDecisionAllowed(matchKind: DuplicateReviewMatchKind, decision: DuplicateReviewDecision) {
  if (matchKind === "exact") return decision === "keep";
  return true;
}

export function isDuplicateReviewBulkDecisionAllowed(scope: DuplicateReviewBulkScope, matchKind: DuplicateReviewMatchKind, decision: "keep" | "upload-as-new") {
  if (scope === "all") return decision === "keep";
  return matchKind === "similar";
}

export function isInSimilarReviewScope(candidate: { matchKind: DuplicateReviewMatchKind; matchedImageId: number }, active: { matchedImageId: number }) {
  return candidate.matchKind === "similar" && candidate.matchedImageId === active.matchedImageId;
}
