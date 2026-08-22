import AppHeader from "@/components/AppHeader";
import ImageViewer from "@/components/ImageViewer";
import SlideshowPlayer from "@/components/SlideshowPlayer";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { ArrowLeft, Copy, ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";

export default function AlbumDetail() {
  const [, params] = useRoute("/albums/:slug");
  const [, navigate] = useLocation();
  const { albums, smartAlbums, albumImages, smartImages, isLoading } = usePersistedGallery();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const slug = params?.slug ?? "";
  const smart = smartAlbums.find(item => item.id === slug);
  const customAlbum = albums.find(item => item.slug === slug);
  const images = smart ? smartImages(smart.id) : customAlbum ? albumImages(customAlbum.id) : [];
  const title = smart?.name ?? customAlbum?.name;
  const description = smart?.description ?? customAlbum?.description ?? "";
  const mode = customAlbum?.mode ?? "immersive";
  const copy = async () => { await navigator.clipboard?.writeText(`${window.location.origin}/s/${slug}?mode=${mode}`); setCopied(true); window.setTimeout(() => setCopied(false), 1300); };
  if (isLoading) return <div className="public-shell"><AppHeader mode="gallery" active="albums" /><main className="public-page album-detail-page"><div className="collection-loading">Loading album…</div></main></div>;
  if (!title) return <div className="public-shell"><AppHeader mode="gallery" active="albums" /><main className="public-page album-detail-page"><div className="public-empty-state"><p>ALBUM UNAVAILABLE</p><h2>This album does not exist or has been removed.</h2><button className="dark-button" onClick={() => navigate("/albums")}>Back to albums</button></div></main></div>;
  return <div className="public-shell"><AppHeader mode="gallery" active="albums" /><main className="public-page album-detail-page"><section className="detail-heading"><button className="back-link" onClick={() => navigate("/albums")}><ArrowLeft size={15} /> All albums</button><p className="eyebrow">{smart ? "SMART VIEW" : "CUSTOM ALBUM"}</p><h1>{title}</h1><p>{description || "A focused set from your image library."}</p><div className="detail-actions"><button className="dark-button" disabled={!images.length} onClick={() => setSlideshowIndex(0)}><Play size={16} fill="currentColor" /> Play album</button><div className="split-control"><button disabled={!images.length} onClick={() => window.open(`/s/${slug}?mode=${mode}`, "_blank")}>Open link <ExternalLink size={14} /></button><button disabled={!images.length} onClick={copy} aria-label="Copy album link"><Copy size={16} />{copied && <span className="copy-inline">Copied</span>}</button></div></div></section>{images.length ? <section className="detail-grid">{images.map((image, index) => <button className="detail-image" key={image.id} onClick={() => setViewerIndex(index)}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></button>)}</section> : <div className="public-empty-state compact"><p>NO IMAGES IN THIS ALBUM</p><h2>Add images from Admin mode to start curating.</h2><button className="dark-button" onClick={() => navigate("/manage")}>Open Admin</button></div>}{viewerIndex !== null && <ImageViewer images={images} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} onSlideshow={() => { setSlideshowIndex(viewerIndex); setViewerIndex(null); }} />}{slideshowIndex !== null && <SlideshowPlayer images={images} initialIndex={slideshowIndex} mode={mode} onExit={() => setSlideshowIndex(null)} />}</main></div>;
}
