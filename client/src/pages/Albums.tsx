import AppHeader from "@/components/AppHeader";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { ArrowUpRight, FolderPlus, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function Albums() {
  const [, navigate] = useLocation();
  const { albums, smartAlbums, isLoading } = usePersistedGallery();
  return <div className="public-shell"><AppHeader mode="gallery" active="albums" /><main className="public-page albums-directory">
    <section className="directory-intro album-directory-intro"><p className="eyebrow">ALBUM LIBRARY</p><h1>Every image has a place.</h1><p>Your library stays whole. Smart views group uploads automatically, while albums let you craft exactly the story you want to show.</p></section>
    <section className="album-directory-section"><div className="directory-subheading"><div><p className="eyebrow">SMART VIEWS</p><h2>Always up to date</h2></div><span>Organized automatically</span></div><div className="smart-directory-grid">{smartAlbums.map(smart => <button className="smart-directory-card" key={smart.id} onClick={() => navigate(`/albums/${smart.id}`)}><span className={`smart-symbol ${smart.id}`}><Sparkles size={18} /></span><div><b>{smart.name}</b><p>{smart.description}</p></div><span>{smart.imageCount} <ArrowUpRight size={15} /></span></button>)}</div></section>
    <section className="album-directory-section"><div className="directory-subheading"><div><p className="eyebrow">CUSTOM ALBUMS</p><h2>Made by you</h2></div><button className="create-album-link" onClick={() => navigate("/manage")}>Manage albums <ArrowUpRight size={14} /></button></div>{isLoading ? <div className="gallery-skeleton-row" /> : albums.length ? <div className="directory-grid album-directory-grid">{albums.map(album => <button className="directory-card album-directory-card" key={album.id} onClick={() => navigate(`/albums/${album.slug}`)}><div className={`directory-image accent-${album.accent}`}>{album.cover ? <img src={album.cover} alt="" loading="lazy" /> : <span>{album.name.slice(0, 1).toUpperCase()}</span>}</div><div className="directory-info"><div><h2>{album.name}</h2><p>{album.description || "A custom album from your library."}</p></div><span>{album.imageCount} images <ArrowUpRight size={15} /></span></div></button>)}</div> : <div className="public-empty-state compact"><FolderPlus size={25} /><p>NO CUSTOM ALBUMS</p><h2>Create albums around the images that matter most.</h2><button className="dark-button" onClick={() => navigate("/manage")}>Open Admin</button></div>}</section>
  </main></div>;
}
