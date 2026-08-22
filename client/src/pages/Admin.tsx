import { galleryCollections, galleryImages, type GalleryCollection, type GalleryImage } from "@/data/gallery";
import { assignImagesToCollection, isSupportedImageUpload, toggleGallerySelection } from "@/lib/gallery-utils";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  CloudUpload,
  Copy,
  Folder,
  Grid2X2,
  Image as ImageIcon,
  LayoutList,
  ListFilter,
  LoaderCircle,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type QueueStatus = "pending" | "uploading" | "processing" | "complete" | "failed" | "cancelled";
type QueueItem = { id: string; file: File; preview: string; progress: number; status: QueueStatus; url?: string; error?: string; width?: number; height?: number; recordId?: number };
type ActivityEvent = { id: string; type: string; description: string; time: string };
type AdminTab = "upload" | "categories" | "settings" | "activity";
type SlideshowSettingsState = { autoplay: boolean; loop: boolean; interval: string; transition: string; mode: string; fit: string; controls: boolean; counter: boolean; captions: boolean; swipe: boolean; keyboard: boolean; tap: boolean };
type ManagedImage = GalleryImage & { recordId?: number };
type ManagedCollection = GalleryCollection & { databaseId?: number };

const maxFileSize = 50 * 1024 * 1024;

function readDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const objectUrl = URL.createObjectURL(file); const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(objectUrl); };
    image.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(objectUrl); };
    image.src = objectUrl;
  });
}

export default function Admin() {
  const [, navigate] = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);
  const xhrs = useRef<Record<string, XMLHttpRequest>>({});
  const utils = trpc.useUtils();
  const dashboardQuery = trpc.gallery.adminDashboard.useQuery();
  const createCollectionMutation = trpc.gallery.createCollection.useMutation();
  const moveImagesMutation = trpc.gallery.moveImages.useMutation();
  const [tab, setTab] = useState<AdminTab>("upload");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uncategorized, setUncategorized] = useState<ManagedImage[]>(galleryImages.slice(0, 4));
  const [assignedImages, setAssignedImages] = useState<Record<string, ManagedImage[]>>({});
  const [collections, setCollections] = useState<ManagedCollection[]>(galleryCollections.filter(item => item.id !== "all"));
  const [selected, setSelected] = useState<string[]>([]);
  const [moveTarget, setMoveTarget] = useState("");
  const [activeCollectionSlug, setActiveCollectionSlug] = useState<string | null>(null);
  const [listView, setListView] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [activity, setActivity] = useState<ActivityEvent[]>([
    { id: "a1", type: "Link generated", description: "Immersive link generated for Form & Light", time: "Just now" },
    { id: "a2", type: "Images moved", description: "Two images moved to Organic Studies", time: "Today, 10:32" },
    { id: "a3", type: "Settings changed", description: "Slideshow crossfade interval set to 5 seconds", time: "Yesterday" },
  ]);
  const [settings, setSettings] = useState({ autoplay: true, loop: true, interval: "5", transition: "crossfade", mode: "immersive", fit: "contain", controls: true, counter: true, captions: true, swipe: true, keyboard: true, tap: true });

  const addActivity = (type: string, description: string) => setActivity(current => [{ id: crypto.randomUUID(), type, description, time: "Just now" }, ...current]);
  const setQueueItem = (id: string, patch: Partial<QueueItem>) => setQueue(current => current.map(item => item.id === id ? { ...item, ...patch } : item));

  useEffect(() => {
    const dashboard = dashboardQuery.data;
    if (!dashboard) return;
    const databaseCollections: ManagedCollection[] = dashboard.collections.map(collection => ({
      id: `db-${collection.id}`,
      databaseId: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description ?? "A private collection.",
      cover: collection.coverImageUrl ?? galleryImages[0].src,
      mode: collection.sharingMode,
    }));
    const toManagedImage = (image: typeof dashboard.uncategorized[number]): ManagedImage => ({
      id: `db-image-${image.id}`,
      recordId: image.id,
      src: image.originalUrl,
      alt: image.filename,
      title: image.filename.replace(/\.[^/.]+$/, ""),
      caption: image.caption ?? "Uploaded gallery image.",
      collection: "uncategorized",
      width: image.width ?? 0,
      height: image.height ?? 0,
      createdAt: image.createdAt.toISOString(),
    });
    setCollections(current => [...current.filter(collection => !collection.databaseId), ...databaseCollections]);
    setUncategorized(current => [...current.filter(image => !image.recordId), ...dashboard.uncategorized.map(toManagedImage)]);
    const collectionSlugById = new Map(databaseCollections.map(collection => [collection.databaseId, collection.slug]));
    const nextAssigned: Record<string, ManagedImage[]> = {};
    dashboard.assigned.forEach(image => {
      const slug = collectionSlugById.get(image.collectionId ?? 0);
      if (!slug) return;
      nextAssigned[slug] = [...(nextAssigned[slug] ?? []), toManagedImage(image)];
    });
    setAssignedImages(current => ({ ...current, ...nextAssigned }));
  }, [dashboardQuery.data]);

  const upload = async (item: QueueItem) => {
    const dimensions = await readDimensions(item.file);
    setQueueItem(item.id, { status: "uploading", progress: 1, ...dimensions });
    const xhr = new XMLHttpRequest(); xhrs.current[item.id] = xhr;
    xhr.open("POST", "/api/upload"); xhr.setRequestHeader("content-type", item.file.type); xhr.setRequestHeader("x-file-name", encodeURIComponent(item.file.name)); xhr.setRequestHeader("x-image-width", String(dimensions.width)); xhr.setRequestHeader("x-image-height", String(dimensions.height));
    xhr.upload.onprogress = event => { if (event.lengthComputable) setQueueItem(item.id, { progress: Math.round((event.loaded / event.total) * 100) }); };
    xhr.onload = () => {
      delete xhrs.current[item.id];
      if (xhr.status >= 200 && xhr.status < 300) {
        let storedUrl = item.preview; let recordId: number | undefined;
        try { const response = JSON.parse(xhr.responseText); storedUrl = response.url ?? item.preview; recordId = response.imageId; } catch { /* fallback to local preview */ }
        setQueueItem(item.id, { status: "processing", progress: 100, url: storedUrl, recordId });
        window.setTimeout(() => {
          setQueueItem(item.id, { status: "complete", progress: 100 });
          setUncategorized(current => [{ id: item.id, recordId, src: storedUrl, alt: item.file.name, title: item.file.name.replace(/\.[^/.]+$/, ""), caption: "Recently uploaded image.", collection: "uncategorized", width: dimensions.width, height: dimensions.height, createdAt: new Date().toISOString() }, ...current]);
          utils.gallery.adminDashboard.invalidate();
          addActivity("Image uploaded", `${item.file.name} was uploaded in original quality`);
        }, 480);
      } else setQueueItem(item.id, { status: "failed", error: "Upload failed. Retry when your connection is ready." });
    };
    xhr.onerror = () => { delete xhrs.current[item.id]; setQueueItem(item.id, { status: "failed", error: "Network interruption detected." }); };
    xhr.onabort = () => { delete xhrs.current[item.id]; setQueueItem(item.id, { status: "cancelled", error: "Upload cancelled." }); };
    xhr.send(item.file);
  };

  const beginFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      const id = crypto.randomUUID();
      if (!isSupportedImageUpload(file, maxFileSize)) { setQueue(current => [...current, { id, file, preview: "", progress: 0, status: "failed", error: file.size > maxFileSize ? "This file exceeds the 50 MB limit." : "Use JPEG, PNG, WebP, or AVIF." }]); return; }
      const item: QueueItem = { id, file, preview: URL.createObjectURL(file), progress: 0, status: "pending" };
      setQueue(current => [...current, item]); window.setTimeout(() => upload(item), 20);
    });
  };

  const onDrop = (event: DragEvent) => { event.preventDefault(); beginFiles(event.dataTransfer.files); };
  const toggleSelect = (id: string) => setSelected(current => toggleGallerySelection(current, id));
  const displayedImages = useMemo(() => [...uncategorized].sort((a, b) => sortNewest ? b.createdAt.localeCompare(a.createdAt) : a.title.localeCompare(b.title)), [uncategorized, sortNewest]);
  const visibleImagesForCollection = (slug: string) => {
    const moved = assignedImages[slug] ?? [];
    const movedIds = new Set(moved.map(image => image.id));
    return [...galleryImages.filter(image => image.collection === slug && !movedIds.has(image.id)), ...moved];
  };
  const activeCollection = collections.find(collection => collection.slug === activeCollectionSlug) ?? null;
  const activeCollectionImages = activeCollection ? visibleImagesForCollection(activeCollection.slug) : [];
  const countImagesInCollection = (slug: string) => visibleImagesForCollection(slug).length;
  const totalImages = uncategorized.length + collections.reduce((total, collection) => total + countImagesInCollection(collection.slug), 0);
  const moveSelected = () => {
    if (!selected.length || !moveTarget) return;
    const target = collections.find(collection => collection.slug === moveTarget);
    if (!target) return;
    const result = assignImagesToCollection(uncategorized, selected, target.slug);
    const persistedIds = result.moved.flatMap(image => image.recordId ? [image.recordId] : []);
    const completeMove = async () => {
      if (target.databaseId && persistedIds.length) await moveImagesMutation.mutateAsync({ imageIds: persistedIds, collectionId: target.databaseId });
      setUncategorized(result.remaining);
      setAssignedImages(current => ({ ...current, [target.slug]: [...(current[target.slug] ?? []), ...result.moved] }));
      setActiveCollectionSlug(target.slug);
      addActivity("Bulk action completed", `${result.moved.length} image${result.moved.length > 1 ? "s" : ""} moved to ${target.name}`);
      setSelected([]);
      setMoveTarget("");
      utils.gallery.adminDashboard.invalidate();
      window.setTimeout(() => document.getElementById("active-collection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    };
    completeMove().catch(() => addActivity("Move failed", `Images could not be saved to ${target.name}. Please retry.`));
  };
  const createCategory = async () => {
    const name = window.prompt("Category name");
    if (!name?.trim()) return;
    try {
      const saved = await createCollectionMutation.mutateAsync({ name: name.trim(), description: "A private collection.", coverImageUrl: galleryImages[0].src, mode: "standard" });
      const collection: ManagedCollection = { id: `db-${saved.id}`, databaseId: saved.id, slug: saved.slug, name: saved.name, description: saved.description ?? "A private collection.", cover: saved.coverImageUrl ?? galleryImages[0].src, mode: saved.sharingMode };
      setCollections(current => [...current, collection]);
      addActivity("Collection created", `${collection.name} was created`);
      utils.gallery.adminDashboard.invalidate();
    } catch { addActivity("Collection creation failed", `${name} could not be created. Please retry.`); }
  };
  const renameSelected = () => { if (selected.length !== 1) return; const image = uncategorized.find(item => item.id === selected[0]); const title = window.prompt("Rename image", image?.title); if (!title || !image) return; setUncategorized(current => current.map(item => item.id === image.id ? { ...item, title } : item)); addActivity("Image renamed", `${image.title} was renamed`); };
  const deleteSelected = () => { if (!selected.length || !window.confirm(`Delete ${selected.length} selected image${selected.length > 1 ? "s" : ""}?`)) return; setUncategorized(current => current.filter(image => !selected.includes(image.id))); addActivity("Bulk action completed", `${selected.length} image${selected.length > 1 ? "s" : ""} deleted`); setSelected([]); };

  const navigation = [
    { key: "upload" as const, label: "Upload & Manage", icon: UploadCloud },
    { key: "categories" as const, label: "Categories", icon: Folder },
    { key: "settings" as const, label: "Slideshow Settings", icon: Settings2 },
    { key: "activity" as const, label: "Activity Log", icon: Activity },
  ];

  return <div className="admin-app">
    <aside className="admin-sidebar">
      <button className="wordmark admin-wordmark" onClick={() => navigate("/")}>GALLERY</button>
      <nav className="admin-nav">{navigation.map(item => <button key={item.key} className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}><item.icon size={18} strokeWidth={1.65} /><span>{item.label}</span></button>)}</nav>
      <div className="admin-account"><div className="account-avatar">A</div><div><b>Admin</b><span>admin@gallery.com</span></div><ChevronDown size={14} /></div>
      <button className="admin-logout" onClick={() => navigate("/")}>Exit manager</button>
    </aside>
    <main className="admin-content">
      {tab === "upload" && <>
        <section className="admin-page-heading"><div><h1>Upload & Manage</h1><p>Upload images, then select an existing category when you are ready to organize them.</p></div><button className="category-tab-link" onClick={() => setTab("categories")}><Folder size={16} /> Manage Categories</button></section>
        <section className="upload-layout">
          <div className="upload-main">
            <div className="drop-zone" onDragOver={event => event.preventDefault()} onDrop={onDrop} onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={event => event.key === "Enter" && fileInput.current?.click()}>
              <input className="hidden-input" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && beginFiles(event.target.files)} />
              <CloudUpload size={40} strokeWidth={1.25} /><strong>Drag & drop images here</strong><span>or click to <em>browse files</em></span>
              <div className="upload-capabilities"><span><ShieldCheck size={15} /> High Quality</span><span><ShieldCheck size={15} /> No Compression</span><span><RefreshCw size={15} /> Auto Retry</span><span><Clock3 size={15} /> Resume Upload</span></div>
            </div>
            <section className="upload-queue"><div className="queue-heading"><h2>Upload Queue <span>{queue.length}</span></h2><button onClick={() => setQueue(current => current.filter(item => item.status !== "complete"))}>Clear completed</button></div>{queue.length === 0 ? <div className="queue-empty">Your uploads will appear here as they begin.</div> : <div className="queue-list">{queue.map(item => <div className="queue-row" key={item.id}><div className="queue-thumb">{item.preview ? <img src={item.preview} alt="" /> : <ImageIcon size={18} />}</div><div className="queue-file"><b>{item.file.name}</b><span>{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span><div className="progress-track"><i style={{ width: `${item.progress}%` }} /></div></div><div className="queue-status">{item.status === "complete" ? <><span>100%</span><Check className="status-success" size={16} /></> : item.status === "failed" ? <><span className="status-error">Failed</span><button onClick={() => upload(item)} aria-label="Retry"><RefreshCw size={15} /></button></> : item.status === "cancelled" ? <><span>Cancelled</span><button onClick={() => upload(item)} aria-label="Retry"><RefreshCw size={15} /></button></> : <><span>{item.status === "processing" ? "Processing" : `${item.progress}%`}</span><button onClick={() => xhrs.current[item.id]?.abort()} aria-label="Cancel upload"><X size={15} /></button></>}</div>{item.error && <p className="queue-error">{item.error}</p>}</div>)}</div>}</section>
            <section className="uncategorized-section"><div className="uncategorized-heading"><div><h2>Uncategorized <span>{uncategorized.length}</span></h2><p>Newly uploaded images will appear here.</p></div><div className="image-tools"><button onClick={() => setSelected(selected.length === uncategorized.length ? [] : uncategorized.map(image => image.id))}>Select all</button><button className={listView ? "" : "is-active"} onClick={() => setListView(false)} aria-label="Grid view"><Grid2X2 size={16} /></button><button className={listView ? "is-active" : ""} onClick={() => setListView(true)} aria-label="List view"><LayoutList size={16} /></button><button onClick={() => setSortNewest(current => !current)}>Sort: {sortNewest ? "Newest" : "Name"} <ArrowDownUp size={14} /></button></div></div><div className={listView ? "uncategorized-list" : "uncategorized-grid"}>{displayedImages.map(image => <button className="admin-image-card" key={image.id} onClick={() => toggleSelect(image.id)}><div className="admin-image-frame"><img src={image.src} alt={image.alt} loading="lazy" /><i className={selected.includes(image.id) ? "select-box selected" : "select-box"}>{selected.includes(image.id) && <Check size={12} />}</i></div><div><b>{image.title}</b><span>{image.width ? `${image.width} × ${image.height}` : "Processing metadata"}</span></div></button>)}</div></section>
          </div>
          <aside className="contextual-panel"><div className="contextual-heading"><h2>Collections <span>{collections.length + 1}</span></h2><button onClick={() => setTab("categories")} aria-label="Manage categories"><Settings2 size={16} /></button></div><div className="collection-side-list"><button className="side-collection current" onClick={() => setActiveCollectionSlug(null)}><Folder size={18} /><span><b>All Images</b><small>{totalImages}</small></span><MoreHorizontal size={17} /></button>{collections.map(collection => <button className={activeCollectionSlug === collection.slug ? "side-collection selected-collection" : "side-collection"} key={collection.id} onClick={() => setActiveCollectionSlug(collection.slug)}><Folder size={18} /><span><b>{collection.name}</b><small>{countImagesInCollection(collection.slug)}</small></span></button>)}</div><button className="contextual-categories-link" onClick={() => setTab("categories")}>Create and manage categories in Categories</button><div className="organize-note"><b>How to organize</b><p>New images appear in <em>Uncategorized</em>.</p><p>Select images, choose an existing category, then confirm the move.</p><p>Create, rename and edit categories only from the Categories tab.</p></div></aside>
        </section>
        {activeCollection && <section className="assigned-collection-section" id="active-collection"><div className="assigned-heading"><div><p className="eyebrow">CATEGORY CONTENTS</p><h2>{activeCollection.name} <span>{activeCollectionImages.length}</span></h2><p>Images moved to this category remain here and are ready to present or share.</p></div><button onClick={() => setTab("categories")}>Edit category</button></div>{activeCollectionImages.length === 0 ? <div className="assigned-empty">This category is ready for images. Select uploads above and move them here.</div> : <div className="assigned-image-grid">{activeCollectionImages.map(image => <article key={image.id}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></article>)}</div>}</section>}
        {selected.length > 0 && <div className="bulk-action-bar"><span>{selected.length} selected</span><label className="move-picker"><Folder size={16} /><span>Move to</span><select value={moveTarget} onChange={event => setMoveTarget(event.target.value)}><option value="" disabled>Select a category</option>{collections.map(collection => <option value={collection.slug} key={collection.id}>{collection.name}</option>)}</select></label><button onClick={moveSelected} disabled={!moveTarget}>Move selected</button><button disabled={selected.length !== 1} onClick={renameSelected}><Pencil size={16} /> Rename</button><button className="delete" onClick={deleteSelected}><Trash2 size={16} /> Delete</button><button onClick={() => { setSelected([]); setMoveTarget(""); }}>Clear</button></div>}
      </>}
      {tab === "categories" && <CollectionsAdmin collections={collections} setCollections={setCollections} addActivity={addActivity} onCreate={createCategory} />}
      {tab === "settings" && <SettingsPage settings={settings} setSettings={setSettings} addActivity={addActivity} />}
      {tab === "activity" && <ActivityPage activity={activity} />}
    </main>
    <nav className="admin-bottom-nav">{navigation.map(item => <button key={item.key} className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}><item.icon size={19} /><span>{item.key === "upload" ? "Upload" : item.key === "categories" ? "Categories" : item.key === "settings" ? "Settings" : "Activity"}</span></button>)}</nav>
  </div>;
}

function CollectionsAdmin({ collections, setCollections, addActivity, onCreate }: { collections: ManagedCollection[]; setCollections: React.Dispatch<React.SetStateAction<ManagedCollection[]>>; addActivity: (type: string, description: string) => void; onCreate: () => void }) {
  const reorder = (from: number, direction: -1 | 1) => {
    const to = from + direction;
    if (to < 0 || to >= collections.length) return;
    setCollections(current => { const next = [...current]; [next[from], next[to]] = [next[to], next[from]]; return next; });
    addActivity("Collections reordered", `${collections[from].name} was moved ${direction < 0 ? "up" : "down"}`);
  };
  return <section className="admin-full-page"><div className="admin-page-heading"><div><h1>Categories</h1><p>Organize visual sequences and control how each collection is shared.</p></div><button className="new-category" onClick={onCreate}><Plus size={16} /> New Collection</button></div><div className="category-manager">{collections.map((collection, index) => <article className="collection-manager-row" key={collection.id}><img src={collection.cover} alt="" /><div className="manager-main"><span className="manager-index">{String(index + 1).padStart(2, "0")}</span><div><h2>{collection.name}</h2><p>{collection.description}</p></div></div><span className="image-count">{galleryImages.filter(image => image.collection === collection.slug).length} images</span><select aria-label="Collection cover image" value={collection.cover} onChange={event => { setCollections(current => current.map(item => item.id === collection.id ? { ...item, cover: event.target.value } : item)); addActivity("Collection edited", `${collection.name} cover image was updated`); }}>{galleryImages.map(image => <option key={image.id} value={image.src}>{image.title}</option>)}</select><select aria-label="Sharing mode" value={collection.mode} onChange={event => { const mode = event.target.value as GalleryCollection["mode"]; setCollections(current => current.map(item => item.id === collection.id ? { ...item, mode } : item)); addActivity("Sharing updated", `${collection.name} now opens in ${mode} mode`); }}><option value="standard">Standard</option><option value="immersive">Immersive</option><option value="kiosk">Kiosk</option></select><div className="reorder-buttons"><button className="row-action" disabled={index === 0} onClick={() => reorder(index, -1)} aria-label="Move collection up"><ChevronUp size={16} /></button><button className="row-action" disabled={index === collections.length - 1} onClick={() => reorder(index, 1)} aria-label="Move collection down"><ChevronDown size={16} /></button></div><button className="row-action" aria-label="Edit collection" onClick={() => { const name = window.prompt("Collection name", collection.name); if (!name) return; const description = window.prompt("Collection description", collection.description) ?? collection.description; setCollections(current => current.map(item => item.id === collection.id ? { ...item, name, description } : item)); addActivity("Collection edited", `${collection.name} details were updated`); }}><Pencil size={16} /></button><button className="row-action" aria-label="Delete collection" onClick={() => { if (!window.confirm(`Delete ${collection.name}?`)) return; setCollections(current => current.filter(item => item.id !== collection.id)); addActivity("Collection deleted", `${collection.name} was deleted`); }}><Trash2 size={16} /></button></article>)}</div></section>;
}

function SettingsPage({ settings, setSettings, addActivity }: { settings: SlideshowSettingsState; setSettings: React.Dispatch<React.SetStateAction<SlideshowSettingsState>>; addActivity: (type: string, description: string) => void }) {
  const checkbox = (key: "autoplay" | "loop" | "controls" | "counter" | "captions" | "swipe" | "keyboard" | "tap", label: string) => <label className="settings-toggle"><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.checked }))} /></label>;
  const save = () => addActivity("Settings changed", "Slideshow presentation settings were updated");
  return <section className="admin-full-page settings-page"><div className="admin-page-heading"><div><h1>Slideshow Settings</h1><p>Set the defaults for every shared presentation.</p></div><button className="new-category" onClick={save}><Check size={16} /> Save settings</button></div><div className="settings-grid"><section><h2>Playback</h2>{checkbox("autoplay", "Autoplay")}{checkbox("loop", "Loop continuously")}<label>Interval<select value={String(settings.interval)} onChange={event => setSettings(current => ({ ...current, interval: event.target.value }))}>{[2,3,5,8,10,15,30,60].map(value => <option value={value} key={value}>{value} seconds</option>)}</select></label><label>Start position<select><option>Beginning</option><option>Last viewed image</option></select></label></section><section><h2>Navigation</h2>{checkbox("swipe", "Swipe navigation")}{checkbox("keyboard", "Keyboard navigation")}{checkbox("tap", "Tap navigation")}{checkbox("controls", "Previous / next controls")}</section><section><h2>Appearance</h2><label>Background<select><option>Near black</option><option>Warm white</option></select></label><label>Image fitting<select value={String(settings.fit)} onChange={event => setSettings(current => ({ ...current, fit: event.target.value }))}><option value="contain">Fit image</option><option value="cover">Fill screen</option></select></label>{checkbox("counter", "Image counter")}{checkbox("captions", "Captions")}</section><section><h2>Transition & Presentation</h2><label>Transition<select value={String(settings.transition)} onChange={event => setSettings(current => ({ ...current, transition: event.target.value }))}><option value="crossfade">Crossfade</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="instant">Instant</option></select></label><label>Default shared mode<select value={String(settings.mode)} onChange={event => setSettings(current => ({ ...current, mode: event.target.value }))}><option value="standard">Standard</option><option value="immersive">Immersive</option><option value="kiosk">Kiosk</option></select></label><p className="settings-description">Kiosk opens with automatic playback and continuous looping. Fullscreen uses the browser's native Fullscreen API when available.</p></section></div></section>;
}

function ActivityPage({ activity }: { activity: ActivityEvent[] }) { return <section className="admin-full-page activity-page"><div className="admin-page-heading"><div><h1>Activity Log</h1><p>A simple record of meaningful gallery changes.</p></div></div><div className="activity-list">{activity.map(event => <article key={event.id}><span className="activity-marker"><Activity size={15} /></span><div><b>{event.type}</b><p>{event.description}</p></div><time>{event.time}</time></article>)}</div></section>; }
