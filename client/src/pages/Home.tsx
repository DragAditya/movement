import AppHeader from "@/components/AppHeader";
import ImageViewer from "@/components/ImageViewer";
import SlideshowPlayer from "@/components/SlideshowPlayer";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { Copy, ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { images, collections, isLoading } = usePersistedGallery();
  const [slideshow, setSlideshow] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const copyLink = async () => { await navigator.clipboard?.writeText(`${window.location.origin}/s/all?mode=immersive`); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };

  return <div className="public-shell"><AppHeader mode="gallery" active="home" /><main className="public-page home-page">
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">YOUR GALLERY</p><h1>{images.length ? "Your images.\nMade to present." : "Your gallery\nstarts here."}</h1><p className="hero-description">{images.length ? "Explore, present and share the images you have uploaded." : "Upload your first images in Admin mode to begin building a beautiful presentation."}</p><div className="hero-actions"><button className="dark-button" disabled={!images.length} onClick={() => setSlideshow(true)}><Play size={16} fill="currentColor" /> Start Slideshow</button><div className="split-control"><button disabled={!images.length} onClick={() => window.open("/s/all?mode=immersive", "_blank")}>Open Link <ExternalLink size={14} /></button><button disabled={!images.length} onClick={copyLink} aria-label="Copy slideshow link"><Copy size={16} />{copied && <span className="copy-inline">Copied</span>}</button></div></div></div>
      {images[0] ? <div className="hero-image"><img src={images[0].src} alt={images[0].alt} fetchPriority="high" /><span className="hero-image-caption">Latest upload</span></div> : <div className="hero-empty"><p>NO IMAGES YET</p><span>Your next upload will take this place.</span><button onClick={() => navigate("/manage")}>Open Admin</button></div>}
    </section>
    <section className="home-section collections-section"><div className="section-heading"><h2>Collections</h2>{collections.length > 0 && <button onClick={() => navigate("/collections")}>View all</button>}</div>{isLoading ? <div className="gallery-skeleton-row" /> : collections.length ? <div className="collection-row">{collections.map(collection => <button className="collection-card" key={collection.id} onClick={() => navigate(`/collections/${collection.slug}`)}><div className="collection-cover">{collection.cover ? <img src={collection.cover} alt="" loading="lazy" /> : <div className="image-empty-surface">No cover</div>}</div><div><b>{collection.name}</b><span>{collection.imageCount} images</span></div></button>)}</div> : <div className="section-empty">No categories yet. Create your first one in <button onClick={() => navigate("/manage")}>Admin mode</button>.</div>}</section>
    <section className="home-section latest-section"><div className="section-heading"><h2>Latest Images</h2>{images.length > 6 && <button onClick={() => navigate("/collections/all")}>View all <span>→</span></button>}</div>{isLoading ? <div className="gallery-skeleton-grid" /> : images.length ? <div className="latest-grid">{images.slice(0, 6).map((image, index) => <button className="latest-image" key={image.id} onClick={() => setViewerIndex(index)}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></button>)}</div> : <div className="section-empty">Your uploaded images will appear here.</div>}</section>
    <footer className="public-footer"><span>© 2026 Gallery. All rights reserved.</span><button onClick={() => navigate("/manage")}>Gallery manager</button></footer>
    {viewerIndex !== null && <ImageViewer images={images} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} onSlideshow={() => { setSlideshow(true); setViewerIndex(null); }} />}
    {slideshow && <SlideshowPlayer images={images} mode="immersive" onExit={() => setSlideshow(false)} />}
  </main></div>;
}
