import SlideshowPlayer from "@/components/SlideshowPlayer";
import { SlideshowLoadingScreen } from "@/components/GallerySkeletons";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { useRoute } from "wouter";

export default function SharedSlideshow() {
  const [, params] = useRoute("/s/:slug");
  const { customAlbums, systemAlbum, smartAlbums, albumImages, smartImages, isLoading } = usePersistedGallery();
  const slug = params?.slug ?? "";
  const smart = smartAlbums.find(item => item.id === slug);
  const album = systemAlbum?.slug === slug ? systemAlbum : customAlbums.find(item => item.slug === slug);
  const images = smart ? smartImages(smart.id) : album ? albumImages(album.id) : [];
  const mode = new URLSearchParams(window.location.search).get("mode") as "standard" | "immersive" | "kiosk" | null;
  if (isLoading) return <SlideshowLoadingScreen />;
  if (!images.length) return <div className="slideshow-unavailable"><p>THIS ALBUM IS NOT AVAILABLE</p><button onClick={() => window.history.back()}>Back to gallery</button></div>;
  return <SlideshowPlayer images={images} mode={mode ?? album?.mode ?? "immersive"} onExit={() => window.history.back()} />;
}
