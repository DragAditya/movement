export const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export function nextSlideIndex(current: number, direction: -1 | 1, total: number) {
  if (total < 1) return 0;
  return (current + direction + total) % total;
}

export function isSupportedImageUpload(file: Pick<File, "type" | "size">, maxFileSize = 50 * 1024 * 1024) {
  return supportedImageTypes.includes(file.type as (typeof supportedImageTypes)[number]) && file.size <= maxFileSize;
}

export function toggleGallerySelection(selected: string[], id: string) {
  return selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id];
}
