export function imageLoadAttributes(index: number) {
  return index < 4
    ? { loading: "eager" as const, fetchPriority: "high" as const }
    : { loading: "lazy" as const, fetchPriority: "low" as const };
}

export function resolveThumbnailSource(thumbnailUrl: string | null | undefined, originalUrl: string) {
  return thumbnailUrl ?? originalUrl;
}

export function warmGalleryImages(sources: string[], createImage: () => HTMLImageElement = () => new Image()) {
  const uniqueSources = Array.from(new Set(sources.filter(Boolean))).slice(0, 40);
  uniqueSources.forEach(source => {
    const image = createImage();
    image.decoding = "async";
    image.src = source;
  });
}
