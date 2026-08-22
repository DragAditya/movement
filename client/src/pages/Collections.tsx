import AppHeader from "@/components/AppHeader";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Collections() {
  const [, navigate] = useLocation();
  const { collections, isLoading } = usePersistedGallery();
  return (
    <div className="public-shell"><AppHeader mode="gallery" active="collections" /><main className="public-page collection-directory">
      <section className="directory-intro"><p className="eyebrow">THE ARCHIVE</p><h1>Collections that hold a point of view.</h1><p>Explore focused sequences of images, each designed to be viewed at its own pace.</p></section>
      {isLoading ? <div className="collection-loading">Loading your collections…</div> : collections.length ? <section className="directory-grid">
        {collections.map(collection => <button className="directory-card" key={collection.id} onClick={() => navigate(`/collections/${collection.slug}`)}>
          <div className="directory-image">{collection.cover ? <img src={collection.cover} alt="" loading="lazy" /> : <div className="image-empty-surface">No cover</div>}</div>
          <div className="directory-info"><div><h2>{collection.name}</h2><p>{collection.description}</p></div><span>{collection.imageCount} images <ArrowRight size={16} /></span></div>
        </button>)}
      </section> : <div className="public-empty-state"><p>NO COLLECTIONS YET</p><h2>Start by organizing your uploaded images.</h2><button className="dark-button" onClick={() => navigate("/manage")}>Open Admin</button></div>}
    </main></div>
  );
}
