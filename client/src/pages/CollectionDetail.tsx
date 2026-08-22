import ImageViewer from "@/components/ImageViewer";
import SlideshowPlayer from "@/components/SlideshowPlayer";
import { collectionImages, galleryCollections } from "@/data/gallery";
import { ArrowLeft, Copy, ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";

export default function CollectionDetail() {
  const [, params] = useRoute("/collections/:slug");
  const [, navigate] = useLocation();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const collection = galleryCollections.find(item => item.slug === params?.slug) ?? galleryCollections[0];
  const images = collectionImages(collection.slug);
  const share = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}/s/${collection.slug}?mode=${collection.mode}`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1300);
  };

  return <main className="public-page collection-detail-page">
    <header className="public-header"><button onClick={() => navigate("/")} className="wordmark">GALLERY</button><nav><button onClick={() => navigate("/")}>Home</button><button className="active" onClick={() => navigate("/collections")}>Collections</button></nav></header>
    <section className="detail-heading"><button className="back-link" onClick={() => navigate("/collections")}><ArrowLeft size={15} /> All collections</button><p className="eyebrow">COLLECTION</p><h1>{collection.name}</h1><p>{collection.description}</p><div className="detail-actions"><button className="dark-button" onClick={() => setSlideshowIndex(0)}><Play size={16} fill="currentColor" /> Start slideshow</button><div className="split-control"><button onClick={() => window.open(`/s/${collection.slug}?mode=${collection.mode}`, "_blank")}>Open link <ExternalLink size={14} /></button><button onClick={share} aria-label="Copy collection link"><Copy size={16} />{copied && <span className="copy-inline">Copied</span>}</button></div></div></section>
    <section className="detail-grid">{images.map((image, index) => <button className="detail-image" key={image.id} onClick={() => setViewerIndex(index)}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></button>)}</section>
    {viewerIndex !== null && <ImageViewer images={images} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} onSlideshow={() => { setSlideshowIndex(viewerIndex); setViewerIndex(null); }} />}
    {slideshowIndex !== null && <SlideshowPlayer images={images} initialIndex={slideshowIndex} mode={collection.mode} onExit={() => setSlideshowIndex(null)} />}
  </main>;
}
