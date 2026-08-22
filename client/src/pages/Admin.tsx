import AppHeader from "@/components/AppHeader";
import { usePersistedGallery } from "@/lib/persisted-gallery";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowDownUp,
  Check,
  ChevronDown,
  Clock3,
  CloudUpload,
  Folder,
  Grid2X2,
  Image as ImageIcon,
  LayoutList,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type QueueStatus = "pending" | "uploading" | "processing" | "complete" | "failed" | "cancelled";
type QueueItem = { id: string; file: File; preview: string; progress: number; status: QueueStatus; error?: string };
type ActivityEvent = { id: string; type: string; description: string; time: string };
type AdminTab = "upload" | "categories" | "settings" | "activity";

const maxFileSize = 50 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function readDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(objectUrl); };
    image.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(objectUrl); };
    image.src = objectUrl;
  });
}

export default function Admin() {
  const fileInput = useRef<HTMLInputElement>(null);
  const xhrs = useRef<Record<string, XMLHttpRequest>>({});
  const utils = trpc.useUtils();
  const { images, collections, isLoading } = usePersistedGallery();
  const createCollection = trpc.gallery.createCollection.useMutation();
  const moveImages = trpc.gallery.moveImages.useMutation();
  const [tab, setTab] = useState<AdminTab>("upload");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moveTarget, setMoveTarget] = useState("");
  const [activeCollection, setActiveCollection] = useState<number | null>(null);
  const [listView, setListView] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [settings, setSettings] = useState({ autoplay: true, loop: true, interval: "5", transition: "crossfade", mode: "immersive", fit: "contain", controls: true, counter: true, captions: true, swipe: true, keyboard: true, tap: true });

  const addActivity = (type: string, description: string) => setActivity(current => [{ id: crypto.randomUUID(), type, description, time: "Just now" }, ...current]);
  const setQueueItem = (id: string, patch: Partial<QueueItem>) => setQueue(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  const uncategorized = useMemo(() => images.filter(image => image.collectionId === null).sort((a, b) => sortNewest ? b.createdAt.localeCompare(a.createdAt) : a.title.localeCompare(b.title)), [images, sortNewest]);
  const selectedImages = uncategorized.filter(image => selected.includes(image.recordId));
  const assignedActive = activeCollection ? images.filter(image => image.collectionId === activeCollection) : [];

  const upload = async (item: QueueItem) => {
    const dimensions = await readDimensions(item.file);
    setQueueItem(item.id, { status: "uploading", progress: 1 });
    const xhr = new XMLHttpRequest();
    xhrs.current[item.id] = xhr;
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("content-type", item.file.type);
    xhr.setRequestHeader("x-file-name", encodeURIComponent(item.file.name));
    xhr.setRequestHeader("x-image-width", String(dimensions.width));
    xhr.setRequestHeader("x-image-height", String(dimensions.height));
    xhr.upload.onprogress = event => { if (event.lengthComputable) setQueueItem(item.id, { progress: Math.round((event.loaded / event.total) * 100) }); };
    xhr.onload = () => {
      delete xhrs.current[item.id];
      if (xhr.status >= 200 && xhr.status < 300) {
        setQueueItem(item.id, { status: "processing", progress: 100 });
        window.setTimeout(() => {
          setQueueItem(item.id, { status: "complete", progress: 100 });
          addActivity("Image uploaded", `${item.file.name} was stored in original quality`);
          utils.gallery.publicDashboard.invalidate();
        }, 350);
      } else setQueueItem(item.id, { status: "failed", error: "Upload failed. Retry when your connection is ready." });
    };
    xhr.onerror = () => { delete xhrs.current[item.id]; setQueueItem(item.id, { status: "failed", error: "Network interruption detected." }); };
    xhr.onabort = () => { delete xhrs.current[item.id]; setQueueItem(item.id, { status: "cancelled", error: "Upload cancelled." }); };
    xhr.send(item.file);
  };

  const beginFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      const id = crypto.randomUUID();
      if (!allowedTypes.includes(file.type)) { setQueue(current => [...current, { id, file, preview: "", progress: 0, status: "failed", error: "Use JPEG, PNG, WebP, or AVIF." }]); return; }
      if (file.size > maxFileSize) { setQueue(current => [...current, { id, file, preview: "", progress: 0, status: "failed", error: "This file exceeds the 50 MB limit." }]); return; }
      const item: QueueItem = { id, file, preview: URL.createObjectURL(file), progress: 0, status: "pending" };
      setQueue(current => [...current, item]);
      window.setTimeout(() => upload(item), 15);
    });
  };

  const moveSelected = async () => {
    const target = collections.find(collection => String(collection.id) === moveTarget);
    if (!target || !selectedImages.length) return;
    try {
      await moveImages.mutateAsync({ imageIds: selectedImages.map(image => image.recordId), collectionId: target.id });
      addActivity("Images moved", `${selectedImages.length} image${selectedImages.length > 1 ? "s" : ""} moved to ${target.name}`);
      setSelected([]); setMoveTarget(""); setActiveCollection(target.id);
      await utils.gallery.publicDashboard.invalidate();
    } catch { addActivity("Move failed", `Images could not be saved to ${target.name}. Please retry.`); }
  };

  const createCategory = async () => {
    const name = window.prompt("Category name");
    if (!name?.trim()) return;
    try {
      await createCollection.mutateAsync({ name: name.trim(), description: "", mode: "standard" });
      addActivity("Category created", `${name.trim()} was created`);
      await utils.gallery.publicDashboard.invalidate();
    } catch { addActivity("Category creation failed", `${name.trim()} could not be created. Please retry.`); }
  };

  const navigation = [
    { key: "upload" as const, label: "Upload & Manage", icon: UploadCloud },
    { key: "categories" as const, label: "Categories", icon: Folder },
    { key: "settings" as const, label: "Slideshow Settings", icon: Settings2 },
    { key: "activity" as const, label: "Activity Log", icon: Activity },
  ];

  return <div className="admin-mode-shell"><AppHeader mode="admin" />
    <div className="admin-app">
      <aside className="admin-sidebar"><nav className="admin-nav">{navigation.map(item => <button key={item.key} className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}><item.icon size={18} strokeWidth={1.65} /><span>{item.label}</span></button>)}</nav><div className="admin-account"><div className="account-avatar">A</div><div><b>Admin</b><span>Gallery workspace</span></div><ChevronDown size={14} /></div></aside>
      <main className="admin-content">
        {tab === "upload" && <>
          <section className="admin-page-heading"><div><h1>Upload & Manage</h1><p>Upload original-quality images, then move them into an existing category.</p></div><button className="category-tab-link" onClick={() => setTab("categories")}><Folder size={16} /> Manage Categories</button></section>
          <section className="upload-layout"><div className="upload-main">
            <div className="drop-zone" onDragOver={event => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); beginFiles(event.dataTransfer.files); }} onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={event => event.key === "Enter" && fileInput.current?.click()}>
              <input className="hidden-input" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && beginFiles(event.target.files)} />
              <CloudUpload size={40} strokeWidth={1.25} /><strong>Drag & drop images here</strong><span>or click to <em>browse files</em></span><div className="upload-capabilities"><span><ShieldCheck size={15} /> High Quality</span><span><ShieldCheck size={15} /> No Compression</span><span><RefreshCw size={15} /> Auto Retry</span><span><Clock3 size={15} /> Resume Upload</span></div>
            </div>
            <section className="upload-queue"><div className="queue-heading"><h2>Upload Queue <span>{queue.length}</span></h2><button onClick={() => setQueue(current => current.filter(item => item.status !== "complete"))}>Clear completed</button></div>{queue.length === 0 ? <div className="queue-empty">Your uploads will appear here as they begin.</div> : <div className="queue-list">{queue.map(item => <div className="queue-row" key={item.id}><div className="queue-thumb">{item.preview ? <img src={item.preview} alt="" /> : <ImageIcon size={18} />}</div><div className="queue-file"><b>{item.file.name}</b><span>{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span><div className="progress-track"><i style={{ width: `${item.progress}%` }} /></div></div><div className="queue-status">{item.status === "complete" ? <><span>100%</span><Check className="status-success" size={16} /></> : item.status === "failed" ? <><span className="status-error">Failed</span><button onClick={() => upload(item)} aria-label="Retry"><RefreshCw size={15} /></button></> : item.status === "cancelled" ? <><span>Cancelled</span><button onClick={() => upload(item)} aria-label="Retry"><RefreshCw size={15} /></button></> : <><span>{item.status === "processing" ? "Processing" : `${item.progress}%`}</span><button onClick={() => xhrs.current[item.id]?.abort()} aria-label="Cancel upload"><X size={15} /></button></>}</div>{item.error && <p className="queue-error">{item.error}</p>}</div>)}</div>}</section>
            <section className="uncategorized-section"><div className="uncategorized-heading"><div><h2>Uncategorized <span>{uncategorized.length}</span></h2><p>Uploaded images remain here until you select a category.</p></div><div className="image-tools"><button onClick={() => setSelected(selected.length === uncategorized.length ? [] : uncategorized.map(image => image.recordId))}>Select all</button><button className={listView ? "" : "is-active"} onClick={() => setListView(false)} aria-label="Grid view"><Grid2X2 size={16} /></button><button className={listView ? "is-active" : ""} onClick={() => setListView(true)} aria-label="List view"><LayoutList size={16} /></button><button onClick={() => setSortNewest(current => !current)}>Sort: {sortNewest ? "Newest" : "Name"} <ArrowDownUp size={14} /></button></div></div>{isLoading ? <div className="queue-empty">Loading uploaded images…</div> : uncategorized.length ? <div className={listView ? "uncategorized-list" : "uncategorized-grid"}>{uncategorized.map(image => <button className="admin-image-card" key={image.id} onClick={() => setSelected(current => current.includes(image.recordId) ? current.filter(id => id !== image.recordId) : [...current, image.recordId])}><div className="admin-image-frame"><img src={image.src} alt={image.alt} loading="lazy" /><i className={selected.includes(image.recordId) ? "select-box selected" : "select-box"}>{selected.includes(image.recordId) && <Check size={12} />}</i></div><div><b>{image.title}</b><span>{image.width ? `${image.width} × ${image.height}` : "Image uploaded"}</span></div></button>)}</div> : <div className="queue-empty">No uncategorized uploads. Add images above, then organize them here.</div>}</section>
          </div><aside className="contextual-panel"><div className="contextual-heading"><h2>Categories <span>{collections.length}</span></h2><button onClick={() => setTab("categories")} aria-label="Manage categories"><Settings2 size={16} /></button></div><div className="collection-side-list">{collections.length ? collections.map(collection => <button className={activeCollection === collection.id ? "side-collection selected-collection" : "side-collection"} key={collection.id} onClick={() => setActiveCollection(collection.id)}><Folder size={18} /><span><b>{collection.name}</b><small>{collection.imageCount}</small></span></button>) : <div className="side-collection-empty">No categories created yet.</div>}</div><button className="contextual-categories-link" onClick={() => setTab("categories")}>Create categories in Categories</button><div className="organize-note"><b>How to organize</b><p>New images appear in <em>Uncategorized</em>.</p><p>Select images, choose an existing category, then confirm the move.</p></div></aside></section>
          {activeCollection && <AssignedPanel images={assignedActive} name={collections.find(collection => collection.id === activeCollection)?.name ?? "Category"} />}
          {selected.length > 0 && <div className="bulk-action-bar"><span>{selected.length} selected</span><label className="move-picker"><Folder size={16} /><span>Move to</span><select value={moveTarget} onChange={event => setMoveTarget(event.target.value)}><option value="" disabled>Select a category</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><button onClick={moveSelected} disabled={!moveTarget || moveImages.isPending}>Move selected</button><button className="delete" disabled title="Delete is intentionally unavailable until a retained-file policy is configured"><Trash2 size={16} /> Delete</button><button onClick={() => { setSelected([]); setMoveTarget(""); }}>Clear</button></div>}
        </>}
        {tab === "categories" && <CategoriesPanel collections={collections} onCreate={createCategory} isCreating={createCollection.isPending} />}
        {tab === "settings" && <SettingsPanel settings={settings} setSettings={setSettings} />}
        {tab === "activity" && <ActivityPanel activity={activity} />}
      </main>
      <nav className="admin-bottom-nav">{navigation.map(item => <button key={item.key} className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}><item.icon size={19} /><span>{item.key === "upload" ? "Upload" : item.key === "categories" ? "Categories" : item.key === "settings" ? "Settings" : "Activity"}</span></button>)}</nav>
    </div>
  </div>;
}

function AssignedPanel({ images, name }: { images: ReturnType<typeof usePersistedGallery>["images"]; name: string }) {
  return <section className="assigned-collection-section" id="active-collection"><div className="assigned-heading"><div><p className="eyebrow">CATEGORY CONTENTS</p><h2>{name} <span>{images.length}</span></h2><p>Images saved to this category remain ready to present or share.</p></div></div>{images.length ? <div className="assigned-image-grid">{images.map(image => <article key={image.id}><img src={image.src} alt={image.alt} loading="lazy" /><span>{image.title}</span></article>)}</div> : <div className="assigned-empty">This category is ready for images. Select uploads above and move them here.</div>}</section>;
}

function CategoriesPanel({ collections, onCreate, isCreating }: { collections: ReturnType<typeof usePersistedGallery>["collections"]; onCreate: () => void; isCreating: boolean }) {
  return <section className="admin-full-page"><div className="admin-page-heading"><div><h1>Categories</h1><p>Create categories here, then assign selected uploads from Upload & Manage.</p></div><button className="new-category" onClick={onCreate} disabled={isCreating}><Plus size={16} /> New Category</button></div>{collections.length ? <div className="category-manager">{collections.map((collection, index) => <article className="collection-manager-row" key={collection.id}>{collection.cover ? <img src={collection.cover} alt="" /> : <div className="category-cover-empty"><Folder size={18} /></div>}<div className="manager-main"><span className="manager-index">{String(index + 1).padStart(2, "0")}</span><div><h2>{collection.name}</h2><p>{collection.description || "No description yet."}</p></div></div><span className="image-count">{collection.imageCount} images</span><span className="category-mode-label">{collection.mode}</span></article>)}</div> : <div className="admin-empty-state"><Folder size={22} /><h2>No categories yet.</h2><p>Create a category, then move uploaded images into it from Upload & Manage.</p><button className="new-category" onClick={onCreate}>Create Category</button></div>}</section>;
}

function SettingsPanel({ settings, setSettings }: { settings: { autoplay: boolean; loop: boolean; interval: string; transition: string; mode: string; fit: string; controls: boolean; counter: boolean; captions: boolean; swipe: boolean; keyboard: boolean; tap: boolean }; setSettings: React.Dispatch<React.SetStateAction<{ autoplay: boolean; loop: boolean; interval: string; transition: string; mode: string; fit: string; controls: boolean; counter: boolean; captions: boolean; swipe: boolean; keyboard: boolean; tap: boolean }>> }) {
  const toggle = (key: "autoplay" | "loop" | "controls" | "counter" | "captions" | "swipe" | "keyboard" | "tap", label: string) => <label className="settings-toggle"><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.checked }))} /></label>;
  return <section className="admin-full-page settings-page"><div className="admin-page-heading"><div><h1>Slideshow Settings</h1><p>Set the defaults for every shared presentation.</p></div></div><div className="settings-grid"><section><h2>Playback</h2>{toggle("autoplay", "Autoplay")}{toggle("loop", "Loop continuously")}<label>Interval<select value={settings.interval} onChange={event => setSettings(current => ({ ...current, interval: event.target.value }))}>{[2,3,5,8,10,15,30,60].map(value => <option value={value} key={value}>{value} seconds</option>)}</select></label></section><section><h2>Navigation</h2>{toggle("swipe", "Swipe navigation")}{toggle("keyboard", "Keyboard navigation")}{toggle("tap", "Tap navigation")}{toggle("controls", "Previous / next controls")}</section><section><h2>Appearance</h2><label>Image fitting<select value={settings.fit} onChange={event => setSettings(current => ({ ...current, fit: event.target.value }))}><option value="contain">Fit image</option><option value="cover">Fill screen</option></select></label>{toggle("counter", "Image counter")}{toggle("captions", "Captions")}</section><section><h2>Presentation</h2><label>Transition<select value={settings.transition} onChange={event => setSettings(current => ({ ...current, transition: event.target.value }))}><option value="crossfade">Crossfade</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="instant">Instant</option></select></label><label>Default shared mode<select value={settings.mode} onChange={event => setSettings(current => ({ ...current, mode: event.target.value }))}><option value="standard">Standard</option><option value="immersive">Immersive</option><option value="kiosk">Kiosk</option></select></label></section></div></section>;
}

function ActivityPanel({ activity }: { activity: ActivityEvent[] }) { return <section className="admin-full-page activity-page"><div className="admin-page-heading"><div><h1>Activity Log</h1><p>Meaningful changes made in this browser session.</p></div></div>{activity.length ? <div className="activity-list">{activity.map(event => <article key={event.id}><span className="activity-marker"><Activity size={15} /></span><div><b>{event.type}</b><p>{event.description}</p></div><time>{event.time}</time></article>)}</div> : <div className="admin-empty-state"><Activity size={22} /><h2>No activity yet.</h2><p>Uploads, categories, and image moves will be recorded here.</p></div>}</section>; }
