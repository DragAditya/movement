import AppHeader from "@/components/AppHeader";
import { AlbumDirectorySkeleton, SmartDirectorySkeleton } from "@/components/GallerySkeletons";
import { brand } from "@/lib/brand";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { ArrowUpRight, FolderPlus, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function Albums() {
  const [, navigate] = useLocation();
  const { customAlbums, systemAlbum, smartAlbums, isLoading } = usePersistedGallery();
  return <div className="public-shell"><AppHeader mode="gallery" active="albums" /><main className="public-page albums-directory">
    <section className="directory-intro album-directory-intro"><p className="eyebrow">{brand.tagline.toUpperCase()}</p><h1>Every story finds its rhythm.</h1><p>Your complete archive stays intact. Smart views follow the natural flow of your uploads, while albums let you compose exactly what you want to show.</p></section>
    <section className="album-directory-section"><div className="directory-subheading"><div><p className="eyebrow">PERMANENT & SMART VIEWS</p><h2>Always up to date</h2></div><span>Organized automatically</span></div>{isLoading ? <SmartDirectorySkeleton /> : <div className="smart-directory-grid">{systemAlbum && <button className="smart-directory-card" onClick={() => navigate(`/albums/${systemAlbum.slug}`)}><span className="smart-symbol library"><Sparkles size={18} /></span><div><b>All Images</b><p>Every image ever uploaded to your gallery.</p></div><span>{systemAlbum.imageCount} <ArrowUpRight size={15} /></span></button>}{smartAlbums.map(smart => <button className="smart-directory-card" key={smart.id} onClick={() => navigate(`/albums/${smart.id}`)}><span className={`smart-symbol ${smart.id}`}><Sparkles size={18} /></span><div><b>{smart.name}</b><p>{smart.description}</p></div><span>{smart.imageCount} <ArrowUpRight size={15} /></span></button>)}</div>}</section>
    <section className="album-directory-section"><div className="directory-subheading"><div><p className="eyebrow">CUSTOM ALBUMS</p><h2>Made by you</h2></div><button className="create-album-link" onClick={() => navigate("/manage")}>Manage albums <ArrowUpRight size={14} /></button></div>{isLoading ? <AlbumDirectorySkeleton /> : customAlbums.length ? <div className="directory-grid album-directory-grid">{customAlbums.map(album => <button className="directory-card album-directory-card" key={album.id} onClick={() => navigate(`/albums/${album.slug}`)}><div className={`directory-image accent-${album.accent}`}>{album.cover ? <img src={album.cover} alt="" loading="lazy" /> : <span>{album.name.slice(0, 1).toUpperCase()}</span>}</div><div className="directory-info"><div><h2>{album.name}</h2><p>{album.description || "A custom album from your library."}</p></div><span>{album.imageCount} images <ArrowUpRight size={15} /></span></div></button>)}</div> : <div className="public-empty-state compact"><FolderPlus size={25} /><p>NO CUSTOM ALBUMS</p><h2>Create albums around the images that matter most.</h2><button className="dark-button" onClick={() => navigate("/manage")}>Open Admin</button></div>}</section>
  </main></div>;
}
