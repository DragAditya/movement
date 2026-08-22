import { collectionCount, galleryCollections } from "@/data/gallery";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Collections() {
  const [, navigate] = useLocation();
  return (
    <main className="public-page collection-directory">
      <header className="public-header"><button onClick={() => navigate("/")} className="wordmark">GALLERY</button><nav><button onClick={() => navigate("/")}>Home</button><button className="active">Collections</button></nav></header>
      <section className="directory-intro"><p className="eyebrow">THE ARCHIVE</p><h1>Collections that hold a point of view.</h1><p>Explore focused sequences of images, each designed to be viewed at its own pace.</p></section>
      <section className="directory-grid">
        {galleryCollections.map(collection => <button className="directory-card" key={collection.id} onClick={() => navigate(`/collections/${collection.slug}`)}>
          <div className="directory-image"><img src={collection.cover} alt="" loading="lazy" /></div>
          <div className="directory-info"><div><h2>{collection.name}</h2><p>{collection.description}</p></div><span>{collectionCount(collection.slug)} images <ArrowRight size={16} /></span></div>
        </button>)}
      </section>
    </main>
  );
}
