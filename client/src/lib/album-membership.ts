export type AlbumMembership = { albumId: number; imageId: number };

export function unassignedImageIds(imageIds: number[], memberships: AlbumMembership[]) {
  const assigned = new Set(memberships.map(membership => membership.imageId));
  return imageIds.filter(imageId => !assigned.has(imageId));
}
