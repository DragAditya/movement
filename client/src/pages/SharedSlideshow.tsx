import SlideshowPlayer from "@/components/SlideshowPlayer";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { useRoute } from "wouter";

export default function SharedSlideshow() {
  const [, params] = useRoute("/s/:slug");
  const { images, collections, isLoading } = usePersistedGallery();
  const mode = new URLSearchParams(window.location.search).get("mode") as "standard" | "immersive" | "kiosk" | null;
  if (isLoading) return <div className="slideshow-unavailable">Loading slideshow…</div>;
  const collection = collections.find(item => item.slug === params?.slug);
  const slideshowImages = params?.slug === "all" ? images : collection ? images.filter(image => image.collectionId === collection.id) : [];
  if (!slideshowImages.length) return <div className="slideshow-unavailable"><p>THIS SLIDESHOW IS NOT AVAILABLE</p><button onClick={() => window.history.back()}>Back to gallery</button></div>;
  return <SlideshowPlayer images={slideshowImages} mode={mode ?? collection?.mode ?? "immersive"} onExit={() => window.history.back()} />;
}
