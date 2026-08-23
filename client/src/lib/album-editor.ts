export type AlbumCoverCandidate = {
  recordId: number;
  src: string;
  title: string;
};

export function resolveAlbumCoverPreview(images: AlbumCoverCandidate[], coverImageId: string) {
  if (!images.length) return null;
  return images.find(image => String(image.recordId) === coverImageId) ?? images[0];
}
