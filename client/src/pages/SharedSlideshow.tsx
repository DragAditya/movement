import SlideshowPlayer from "@/components/SlideshowPlayer";
import { collectionImages, galleryCollections } from "@/data/gallery";
import { useRoute } from "wouter";

export default function SharedSlideshow() {
  const [, params] = useRoute("/s/:slug");
  const collection = galleryCollections.find(item => item.slug === params?.slug) ?? galleryCollections[0];
  const mode = new URLSearchParams(window.location.search).get("mode") as "standard" | "immersive" | "kiosk" | null;
  return <SlideshowPlayer images={collectionImages(collection.slug)} mode={mode ?? collection.mode} onExit={() => window.history.back()} />;
}
