import type { GalleryImage } from "@/data/gallery";
import { ChevronLeft, ChevronRight, Expand, Play, X } from "lucide-react";
import { useEffect } from "react";

type ImageViewerProps = {
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onSlideshow: () => void;
};

export default function ImageViewer({ images, index, onIndexChange, onClose, onSlideshow }: ImageViewerProps) {
  const image = images[index];
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") onIndexChange((index + 1) % images.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [images.length, index, onClose, onIndexChange]);

  return (
    <div className="image-viewer" role="dialog" aria-modal="true" aria-label="Image viewer">
      <div className="viewer-topbar">
        <button className="slideshow-icon-button" onClick={onClose} aria-label="Close image viewer"><X size={20} /></button>
        <span>IMAGE VIEWER</span>
        <button className="viewer-slideshow-button" onClick={onSlideshow}><Play size={15} fill="currentColor" /> Start slideshow</button>
      </div>
      <button className="viewer-nav previous" onClick={() => onIndexChange((index - 1 + images.length) % images.length)} aria-label="Previous image"><ChevronLeft size={27} /></button>
      <figure className="viewer-figure">
        <img src={image.src} alt={image.alt} />
        <figcaption>
          <div><strong>{image.title}</strong><span>{image.caption}</span></div>
          <span>{image.width} × {image.height}</span>
        </figcaption>
      </figure>
      <button className="viewer-nav next" onClick={() => onIndexChange((index + 1) % images.length)} aria-label="Next image"><ChevronRight size={27} /></button>
      <button className="viewer-fullscreen" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Fullscreen viewer"><Expand size={18} /></button>
    </div>
  );
}
