export type MembershipRecord = { id: number; albumId: number; imageId: number };

export function buildExclusiveMembershipPlan(existing: MembershipRecord[], destinationAlbumId: number, imageIds: number[]) {
  const requested = new Set(imageIds);
  return {
    removeIds: existing
      .filter(membership => membership.albumId === destinationAlbumId || requested.has(membership.imageId))
      .map(membership => membership.id),
    nextMemberships: imageIds.map((imageId, sortOrder) => ({ albumId: destinationAlbumId, imageId, source: "manual" as const, sortOrder })),
  };
}

export function isMutableAlbum(kind: "system" | "custom") {
  return kind === "custom";
}
