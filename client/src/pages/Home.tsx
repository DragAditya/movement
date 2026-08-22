import ImageViewer from "@/components/ImageViewer";
import SlideshowPlayer from "@/components/SlideshowPlayer";
import { collectionCount, galleryCollections, galleryImages } from "@/data/gallery";
import { Copy, ExternalLink, Menu, Play, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const [slideshow, setSlideshow] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const copyLink = async () => { await navigator.clipboard?.writeText(`${window.location.origin}/s/all-images?mode=immersive`); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };

  return <main className="public-page home-page">
    <header className="public-header">
      <button onClick={() => navigate("/")} className="wordmark">GALLERY</button>
      <nav className="desktop-nav"><button className="active" onClick={() => navigate("/")}>Home</button><button onClick={() => navigate("/collections")}>Collections</button><button onClick={() => navigate("/manage")} className="admin-entry">Manage</button></nav>
      <button className="mobile-menu-button" onClick={() => setMenuOpen(open => !open)} aria-label="Toggle navigation">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      {menuOpen && <div className="mobile-public-menu"><button onClick={() => navigate("/")}>Home</button><button onClick={() => navigate("/collections")}>Collections</button><button onClick={() => navigate("/manage")}>Manage gallery</button></div>}
    </header>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">WELCOME</p><h1>Beautiful images.<br />Made to present.</h1><p className="hero-description">Explore, present and share your collections with a stunning slideshow experience.</p><div className="hero-actions"><button className="dark-button" onClick={() => setSlideshow(true)}><Play size={16} fill="currentColor" /> Start Slideshow</button><div className="split-control"><button onClick={() => window.open("/s/all-images?mode=immersive", "_blank")}>Open Link <ExternalLink size={14} /></button><button onClick={copyLink} aria-label="Copy slideshow link"><Copy size={16} />{copied && <span className="copy-inline">Copied</span>}</button></div></div></div>
      <div className="hero-image"><img src={galleryImages[1].src} alt="A carefully styled botanical image from the gallery" fetchPriority="high" /><span className="hero-image-caption">Organic Studies / 02</span></div>
    </section>
    <section className="home-section collections-section"><div className="section-heading"><h2>Collections</h2><button onClick={() => navigate("/collections")}>View all</button></div><div className="collection-row">{galleryCollections.map(collection => <button className="collection-card" key={collection.id} onClick={() => navigate(`/collections/${collection.slug}`)}><div className="collection-cover"><img src={collection.cover} alt="" loading="lazy" /></div><div><b>{collection.name}</b><span>{collectionCount(collection.slug)} images</span></div></button>)}</div></section>
    <section className="home-section latest-section"><div className="section-heading"><h2>Latest Images</h2><button onClick={() => navigate("/collections/all-images")}>View all <span>→</span></button></div><div className="latest-grid">{galleryImages.slice(0, 6).map((image, index) => <button className="latest-image" key={image.id} onClick={() => setViewerIndex(index)}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></button>)}</div></section>
    <footer className="public-footer"><span>© 2026 Gallery. All rights reserved.</span><button onClick={() => navigate("/manage")}>Gallery manager</button></footer>
    {viewerIndex !== null && <ImageViewer images={galleryImages} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} onSlideshow={() => { setSlideshow(true); setViewerIndex(null); }} />}
    {slideshow && <SlideshowPlayer images={galleryImages} mode="immersive" onExit={() => setSlideshow(false)} />}
  </main>;
}
