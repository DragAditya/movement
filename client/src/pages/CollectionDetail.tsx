import AppHeader from "@/components/AppHeader";
import ImageViewer from "@/components/ImageViewer";
import SlideshowPlayer from "@/components/SlideshowPlayer";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { ArrowLeft, Copy, ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";

export default function CollectionDetail() {
  const [, params] = useRoute("/collections/:slug");
  const [, navigate] = useLocation();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const { collections, images, isLoading } = usePersistedGallery();
  const collection = collections.find(item => item.slug === params?.slug);
  const collectionImages = collection ? images.filter(image => image.collectionId === collection.id) : [];
  const share = async () => {
    if (!collection) return;
    await navigator.clipboard?.writeText(`${window.location.origin}/s/${collection.slug}?mode=${collection.mode}`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1300);
  };

  if (isLoading) return <div className="public-shell"><AppHeader mode="gallery" active="collections" /><main className="public-page collection-detail-page"><div className="collection-loading">Loading collection…</div></main></div>;
  if (!collection) return <div className="public-shell"><AppHeader mode="gallery" active="collections" /><main className="public-page collection-detail-page"><div className="public-empty-state"><p>COLLECTION UNAVAILABLE</p><h2>This collection does not exist or has been removed.</h2><button className="dark-button" onClick={() => navigate("/collections")}>Back to collections</button></div></main></div>;
  return <div className="public-shell"><AppHeader mode="gallery" active="collections" /><main className="public-page collection-detail-page">
    <section className="detail-heading"><button className="back-link" onClick={() => navigate("/collections")}><ArrowLeft size={15} /> All collections</button><p className="eyebrow">COLLECTION</p><h1>{collection.name}</h1><p>{collection.description || "A collection of your uploaded images."}</p><div className="detail-actions"><button className="dark-button" disabled={!collectionImages.length} onClick={() => setSlideshowIndex(0)}><Play size={16} fill="currentColor" /> Start slideshow</button><div className="split-control"><button disabled={!collectionImages.length} onClick={() => window.open(`/s/${collection.slug}?mode=${collection.mode}`, "_blank")}>Open link <ExternalLink size={14} /></button><button disabled={!collectionImages.length} onClick={share} aria-label="Copy collection link"><Copy size={16} />{copied && <span className="copy-inline">Copied</span>}</button></div></div></section>
    {collectionImages.length ? <section className="detail-grid">{collectionImages.map((image, index) => <button className="detail-image" key={image.id} onClick={() => setViewerIndex(index)}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></button>)}</section> : <div className="public-empty-state compact"><p>NO IMAGES IN THIS COLLECTION</p><h2>Move uploaded images here from Admin mode.</h2><button className="dark-button" onClick={() => navigate("/manage")}>Open Admin</button></div>}
    {viewerIndex !== null && <ImageViewer images={collectionImages} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} onSlideshow={() => { setSlideshowIndex(viewerIndex); setViewerIndex(null); }} />}
    {slideshowIndex !== null && <SlideshowPlayer images={collectionImages} initialIndex={slideshowIndex} mode={collection.mode} onExit={() => setSlideshowIndex(null)} />}
  </main></div>;
}
