import { imageLoadAttributes } from "@/lib/image-preload";
import { useState } from "react";

export type GalleryPreviewState = "loading" | "loaded" | "error";

export function galleryPreviewClass(state: GalleryPreviewState) {
  return `gallery-preview-media${state === "loading" ? "" : " is-loaded"}`;
}

export function GalleryPreviewImage({ src, alt, index }: { src: string; alt: string; index: number }) {
  const [state, setState] = useState<GalleryPreviewState>("loading");
  return <picture className={galleryPreviewClass(state)}>
    <img src={src} alt={alt} decoding="async" {...imageLoadAttributes(index)} onLoad={() => setState("loaded")} onError={() => setState("error")} />
  </picture>;
}
