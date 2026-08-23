import AppHeader from "@/components/AppHeader";
import { AlbumCardsSkeleton, HeroMediaSkeleton, ImageGridSkeleton, SmartCardsSkeleton } from "@/components/GallerySkeletons";
import { GalleryPreviewImage } from "@/components/GalleryPreviewImage";
import ImageViewer from "@/components/ImageViewer";
import SlideshowPlayer from "@/components/SlideshowPlayer";
import { brand } from "@/lib/brand";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { ArrowUpRight, Copy, ExternalLink, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { images, customAlbums, systemAlbum, smartAlbums, isLoading } = usePersistedGallery();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [copied, setCopied] = useState(false);
  const allImagesSlug = systemAlbum?.slug ?? "all-images";
  const copyLink = async () => { await navigator.clipboard?.writeText(`${window.location.origin}/s/${allImagesSlug}?mode=immersive`); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };
  const leadImage = images[0];

  return <div className="public-shell"><AppHeader mode="gallery" active="home" /><main className="public-page home-page album-home-page">
    <section className="hero album-hero">
      <div className="hero-copy"><p className="eyebrow">{brand.tagline.toUpperCase()}</p><h1>{images.length ? "Keep every moment\nin motion." : "Start your\nmovement."}</h1><p className="hero-description">{images.length ? "Your images stay beautifully together, ready to become the albums, sequences, and stories you want to share." : "Open the Studio to bring in your first images, then shape them into a movement of your own."}</p><div className="hero-actions"><button className="dark-button" disabled={!images.length} onClick={() => setSlideshow(true)}><Play size={16} fill="currentColor" /> Begin the movement</button><div className="split-control"><button disabled={!images.length} onClick={() => window.open(`/s/${allImagesSlug}?mode=immersive`, "_blank")}>Open presentation <ExternalLink size={14} /></button><button disabled={!images.length} onClick={copyLink} aria-label="Copy Movement presentation link"><Copy size={16} />{copied && <span className="copy-inline">Link copied</span>}</button></div></div></div>
      {isLoading ? <HeroMediaSkeleton /> : leadImage ? <div className="hero-image"><img src={leadImage.src} alt={leadImage.alt} decoding="async" fetchPriority="high" /><span className="hero-image-caption">In motion</span></div> : <div className="hero-empty"><Sparkles size={25} /><p>YOUR MOVEMENT IS READY</p><span>Bring in your first images to begin.</span><button onClick={() => navigate("/manage")}>Open Studio</button></div>}
    </section>
    <section className="home-section smart-section"><div className="section-heading"><div><h2>Find the rhythm</h2><p>Every image is safe in your complete archive; smart views make the flow easier to explore.</p></div></div>{isLoading ? <SmartCardsSkeleton /> : <div className="smart-row">{systemAlbum && <button className="smart-card all-images-card" onClick={() => navigate(`/albums/${systemAlbum.slug}`)}><span className="smart-symbol library"><Sparkles size={16} /></span><span><b>All moments</b><small>{systemAlbum.imageCount} {systemAlbum.imageCount === 1 ? "image" : "images"}</small></span><ArrowUpRight size={16} /></button>}{smartAlbums.map(smart => <button key={smart.id} className="smart-card" onClick={() => navigate(`/albums/${smart.id}`)}><span className={`smart-symbol ${smart.id}`}><Sparkles size={16} /></span><span><b>{smart.name}</b><small>{smart.imageCount} {smart.imageCount === 1 ? "image" : "images"}</small></span><ArrowUpRight size={16} /></button>)}</div>}</section>
    <section className="home-section albums-section"><div className="section-heading"><div><h2>Curated movements</h2><p>Give a sequence its own pace while every image remains part of your complete archive.</p></div><button onClick={() => navigate("/albums")}>View all</button></div>{isLoading ? <AlbumCardsSkeleton /> : customAlbums.length ? <div className="album-row">{customAlbums.slice(0, 6).map((album, index) => <button className="album-card" key={album.id} onClick={() => navigate(`/albums/${album.slug}`)}><div className="album-cover">{album.cover ? <GalleryPreviewImage src={album.cover} alt="" index={index} /> : <span>{album.name.slice(0, 1).toUpperCase()}</span>}</div><div><b>{album.name}</b><span>{album.imageCount} {album.imageCount === 1 ? "image" : "images"}</span></div></button>)}</div> : <div className="section-empty">No curated movements yet. Create one in <button onClick={() => navigate("/manage")}>Studio</button>.</div>}</section>
    <section className="home-section latest-section"><div className="section-heading"><h2>Recent moments</h2>{images.length > 6 && <button onClick={() => navigate(`/albums/${allImagesSlug}`)}>View all moments <span>→</span></button>}</div>{isLoading ? <ImageGridSkeleton /> : images.length ? <div className="latest-grid">{images.slice(0, 6).map((image, index) => <button className="latest-image" key={image.id} onClick={() => setViewerIndex(index)}><GalleryPreviewImage src={image.previewSrc} alt={image.alt} index={index} /><span>{image.title}</span></button>)}</div> : <div className="section-empty">Your first moments will appear here.</div>}</section>
    <footer className="public-footer"><span>© 2026 {brand.name}. {brand.tagline}</span><button onClick={() => navigate("/manage")}>Open Studio</button></footer>
    {viewerIndex !== null && <ImageViewer images={images} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} onSlideshow={() => { setSlideshow(true); setViewerIndex(null); }} />}
    {slideshow && <SlideshowPlayer images={images} mode="immersive" onExit={() => setSlideshow(false)} />}
  </main></div>;
}
