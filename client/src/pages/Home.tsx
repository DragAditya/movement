import AppHeader from "@/components/AppHeader";
import ImageViewer from "@/components/ImageViewer";
import SlideshowPlayer from "@/components/SlideshowPlayer";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { ArrowUpRight, Copy, ExternalLink, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { images, albums, smartAlbums, isLoading } = usePersistedGallery();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyLink = async () => { await navigator.clipboard?.writeText(`${window.location.origin}/s/library?mode=immersive`); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };
  const leadImage = images[0];

  return <div className="public-shell"><AppHeader mode="gallery" active="home" /><main className="public-page home-page album-home-page">
    <section className="hero album-hero">
      <div className="hero-copy"><p className="eyebrow">YOUR IMAGE LIBRARY</p><h1>{images.length ? "Your moments.\nMade to present." : "Build your\nvisual library."}</h1><p className="hero-description">{images.length ? "Your uploaded images, your albums, and a focused way to present them." : "Start in Admin mode. Upload images once, then organize them into albums whenever you are ready."}</p><div className="hero-actions"><button className="dark-button" disabled={!images.length} onClick={() => setSlideshow(true)}><Play size={16} fill="currentColor" /> Play Library</button><div className="split-control"><button disabled={!images.length} onClick={() => window.open("/s/library?mode=immersive", "_blank")}>Open link <ExternalLink size={14} /></button><button disabled={!images.length} onClick={copyLink} aria-label="Copy library link"><Copy size={16} />{copied && <span className="copy-inline">Copied</span>}</button></div></div></div>
      {leadImage ? <div className="hero-image"><img src={leadImage.src} alt={leadImage.alt} fetchPriority="high" /><span className="hero-image-caption">Latest upload</span></div> : <div className="hero-empty"><Sparkles size={25} /><p>YOUR LIBRARY IS READY</p><span>Upload images in Admin mode to begin.</span><button onClick={() => navigate("/manage")}>Open Admin</button></div>}
    </section>
    <section className="home-section smart-section"><div className="section-heading"><div><h2>Explore your library</h2><p>Automatic views organize new uploads without moving the originals.</p></div></div>{isLoading ? <div className="gallery-skeleton-row" /> : <div className="smart-row">{smartAlbums.map(smart => <button key={smart.id} className="smart-card" onClick={() => navigate(`/albums/${smart.id}`)}><span className={`smart-symbol ${smart.id}`}><Sparkles size={16} /></span><span><b>{smart.name}</b><small>{smart.imageCount} {smart.imageCount === 1 ? "image" : "images"}</small></span><ArrowUpRight size={16} /></button>)}</div>}</section>
    <section className="home-section albums-section"><div className="section-heading"><div><h2>Your albums</h2><p>Curate focused sets without duplicating your image files.</p></div><button onClick={() => navigate("/albums")}>View all</button></div>{albums.length ? <div className="album-row">{albums.slice(0, 6).map(album => <button className="album-card" key={album.id} onClick={() => navigate(`/albums/${album.slug}`)}><div className="album-cover">{album.cover ? <img src={album.cover} alt="" loading="lazy" /> : <span>{album.name.slice(0, 1).toUpperCase()}</span>}</div><div><b>{album.name}</b><span>{album.imageCount} {album.imageCount === 1 ? "image" : "images"}</span></div></button>)}</div> : <div className="section-empty">No custom albums yet. You can create one in <button onClick={() => navigate("/manage")}>Admin mode</button>.</div>}</section>
    <section className="home-section latest-section"><div className="section-heading"><h2>Recent uploads</h2>{images.length > 6 && <button onClick={() => navigate("/albums/library")}>View library <span>→</span></button>}</div>{isLoading ? <div className="gallery-skeleton-grid" /> : images.length ? <div className="latest-grid">{images.slice(0, 6).map((image, index) => <button className="latest-image" key={image.id} onClick={() => setViewerIndex(index)}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></button>)}</div> : <div className="section-empty">Your uploaded images will appear here.</div>}</section>
    <footer className="public-footer"><span>© 2026 Gallery. All rights reserved.</span><button onClick={() => navigate("/manage")}>Open Admin</button></footer>
    {viewerIndex !== null && <ImageViewer images={images} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} onSlideshow={() => { setSlideshow(true); setViewerIndex(null); }} />}
    {slideshow && <SlideshowPlayer images={images} mode="immersive" onExit={() => setSlideshow(false)} />}
  </main></div>;
}
