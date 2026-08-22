import AppHeader from "@/components/AppHeader";
import { usePersistedGallery, type PersistedAlbum, type PersistedGalleryImage } from "@/lib/persisted-gallery";
import { trpc } from "@/lib/trpc";
import { resolveInterruptedUpload, resolveUploadResponse, type UploadResponsePayload } from "@/lib/upload-status";
import { Activity, Album, ArrowDownUp, Check, ChevronDown, ChevronUp, CloudUpload, Eye, EyeOff, FolderPlus, Grid2X2, Image as ImageIcon, LayoutList, Library, Monitor, MoreHorizontal, Pencil, Plus, Presentation, RefreshCw, Settings2, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type QueueStatus = "pending" | "uploading" | "indexing" | "stored" | "complete" | "failed" | "checking" | "cancelled";
type QueueItem = { id: string; file: File; preview: string; progress: number; status: QueueStatus; error?: string };
type Tab = "library" | "albums" | "presentation" | "activity";
type AlbumDraft = { id?: number; name: string; description: string; visibility: "public" | "private"; presentationMode: "standard" | "immersive" | "kiosk"; accent: string; coverImageId: string; imageIds: number[] };
type ActivityEvent = { id: string; title: string; detail: string; time: string };

const maxFileSize = 50 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const blankDraft = (): AlbumDraft => ({ name: "", description: "", visibility: "public", presentationMode: "immersive", accent: "indigo", coverImageId: "", imageIds: [] });

function getDimensions(file: File) {
  return new Promise<{ width: number; height: number }>(resolve => {
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
    image.src = url;
  });
}

export default function Admin() {
  const fileInput = useRef<HTMLInputElement>(null);
  const xhrs = useRef<Record<string, XMLHttpRequest>>({});
  const utils = trpc.useUtils();
  const { images, albums, smartAlbums, albumImages, isLoading } = usePersistedGallery();
  const createAlbum = trpc.gallery.createAlbum.useMutation();
  const updateAlbum = trpc.gallery.updateAlbum.useMutation();
  const deleteAlbum = trpc.gallery.deleteAlbum.useMutation();
  const setAlbumImages = trpc.gallery.setAlbumImages.useMutation();
  const reorderAlbums = trpc.gallery.reorderAlbums.useMutation();
  const [tab, setTab] = useState<Tab>("library");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [targetAlbum, setTargetAlbum] = useState("");
  const [grid, setGrid] = useState(true);
  const [sortNewest, setSortNewest] = useState(true);
  const [editor, setEditor] = useState<AlbumDraft | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [settings, setSettings] = useState({ autoplay: true, loop: true, interval: "5", transition: "crossfade", showCaptions: true });

  const addActivity = (title: string, detail: string) => setActivity(current => [{ id: crypto.randomUUID(), title, detail, time: "Just now" }, ...current]);
  const updateQueue = (id: string, patch: Partial<QueueItem>) => setQueue(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  const libraryImages = useMemo(() => [...images].sort((a, b) => sortNewest ? b.createdAt.localeCompare(a.createdAt) : a.title.localeCompare(b.title)), [images, sortNewest]);

  const reconcileStored = async (item: QueueItem, payload: { key: string; url: string; filename: string; mimeType: string; fileSize: number; width?: number; height?: number }) => {
    updateQueue(item.id, { status: "indexing", progress: 100 });
    try {
      const response = await fetch("/api/upload/reconcile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Pending record could not be indexed yet");
      updateQueue(item.id, { status: "complete", progress: 100 });
      addActivity("Upload indexed", `${item.file.name} is available in your library`);
      utils.gallery.publicDashboard.invalidate();
    } catch {
      updateQueue(item.id, { status: "stored", progress: 100, error: "Image stored safely. Library indexing will retry when the service is available." });
      utils.gallery.publicDashboard.invalidate();
    }
  };

  const upload = async (item: QueueItem) => {
    const dimensions = await getDimensions(item.file);
    updateQueue(item.id, { status: "uploading", progress: 1, error: undefined });
    const xhr = new XMLHttpRequest(); xhrs.current[item.id] = xhr;
    xhr.open("POST", "/api/upload"); xhr.setRequestHeader("content-type", item.file.type); xhr.setRequestHeader("x-file-name", encodeURIComponent(item.file.name)); xhr.setRequestHeader("x-image-width", String(dimensions.width)); xhr.setRequestHeader("x-image-height", String(dimensions.height));
    xhr.upload.onprogress = event => { if (event.lengthComputable) updateQueue(item.id, { progress: Math.round((event.loaded / event.total) * 100) }); };
    xhr.onload = () => {
      delete xhrs.current[item.id];
      let payload: UploadResponsePayload = {};
      try { payload = JSON.parse(xhr.responseText); } catch { /* handled as request error below */ }
      const resolution = resolveUploadResponse(xhr.status, payload);
      if (resolution !== "failed") {
        if (resolution === "complete") {
          updateQueue(item.id, { status: "complete", progress: 100 });
          addActivity("Image uploaded", `${item.file.name} was added to your library`);
          utils.gallery.publicDashboard.invalidate();
        } else if (resolution === "reconcile" && payload.key && payload.url && payload.filename && payload.mimeType && payload.fileSize) {
          void reconcileStored(item, { key: payload.key, url: payload.url, filename: payload.filename, mimeType: payload.mimeType, fileSize: payload.fileSize, width: payload.width, height: payload.height });
        } else updateQueue(item.id, { status: "stored", progress: 100, error: "Image stored safely and awaiting library indexing." });
      } else updateQueue(item.id, { status: "failed", error: payload.error ?? "Upload could not be completed. Please retry." });
    };
    xhr.onerror = () => { delete xhrs.current[item.id]; updateQueue(item.id, { status: resolveInterruptedUpload(), error: "Connection ended while confirming the upload. Refresh the library or retry to confirm its status." }); utils.gallery.publicDashboard.invalidate(); };
    xhr.onabort = () => { delete xhrs.current[item.id]; updateQueue(item.id, { status: "cancelled", error: "Upload cancelled before confirmation." }); };
    xhr.send(item.file);
  };

  const beginFiles = (files: FileList | File[]) => Array.from(files).forEach(file => {
    const id = crypto.randomUUID();
    if (!acceptedTypes.includes(file.type)) { setQueue(current => [...current, { id, file, preview: "", progress: 0, status: "failed", error: "Use JPEG, PNG, WebP, or AVIF." }]); return; }
    if (file.size > maxFileSize) { setQueue(current => [...current, { id, file, preview: "", progress: 0, status: "failed", error: "This file exceeds the 50 MB limit." }]); return; }
    const item = { id, file, preview: URL.createObjectURL(file), progress: 0, status: "pending" as const };
    setQueue(current => [...current, item]); window.setTimeout(() => void upload(item), 10);
  });

  const addToAlbum = async () => {
    const album = albums.find(item => String(item.id) === targetAlbum);
    if (!album || !selected.length) return;
    const currentIds = albumImages(album.id).map(image => image.recordId);
    const next = [...currentIds, ...selected.filter(imageId => !currentIds.includes(imageId))];
    try { await setAlbumImages.mutateAsync({ albumId: album.id, imageIds: next }); addActivity("Images added to album", `${selected.length} image${selected.length > 1 ? "s" : ""} added to ${album.name}`); setSelected([]); setTargetAlbum(""); await utils.gallery.publicDashboard.invalidate(); } catch { addActivity("Album update failed", `Images could not be added to ${album.name}.`); }
  };

  const openEdit = (album?: PersistedAlbum) => setEditor(album ? { id: album.id, name: album.name, description: album.description, visibility: album.visibility, presentationMode: album.mode, accent: album.accent, coverImageId: album.coverImageId ? String(album.coverImageId) : "", imageIds: albumImages(album.id).map(image => image.recordId) } : blankDraft());
  const saveAlbum = async () => {
    if (!editor?.name.trim()) return;
    try {
      if (editor.id) {
        await updateAlbum.mutateAsync({ albumId: editor.id, name: editor.name.trim(), description: editor.description, visibility: editor.visibility, presentationMode: editor.presentationMode, accent: editor.accent, coverImageId: editor.coverImageId ? Number(editor.coverImageId) : null });
        await setAlbumImages.mutateAsync({ albumId: editor.id, imageIds: editor.imageIds });
        addActivity("Album updated", `${editor.name.trim()} was updated`);
      } else {
        const created = await createAlbum.mutateAsync({ name: editor.name.trim(), description: editor.description, visibility: editor.visibility, presentationMode: editor.presentationMode, accent: editor.accent, coverImageId: editor.coverImageId ? Number(editor.coverImageId) : undefined });
        await setAlbumImages.mutateAsync({ albumId: created.id, imageIds: editor.imageIds });
        addActivity("Album created", `${editor.name.trim()} was created`);
      }
      setEditor(null); await utils.gallery.publicDashboard.invalidate();
    } catch { addActivity("Album save failed", "Changes could not be saved. Please retry."); }
  };
  const removeAlbum = async (album: PersistedAlbum) => { if (!window.confirm(`Delete “${album.name}”? Your source images will remain in the Library.`)) return; try { await deleteAlbum.mutateAsync({ albumId: album.id }); addActivity("Album deleted", `${album.name} was deleted; source images remain in your library`); await utils.gallery.publicDashboard.invalidate(); } catch { addActivity("Album deletion failed", `${album.name} could not be deleted.`); } };
  const moveAlbum = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= albums.length) return;
    const next = [...albums];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    try { await reorderAlbums.mutateAsync({ albumIds: next.map(album => album.id) }); addActivity("Albums reordered", `${albums[index].name} was moved ${direction < 0 ? "up" : "down"}`); await utils.gallery.publicDashboard.invalidate(); } catch { addActivity("Album reorder failed", "Album order could not be saved. Please retry."); }
  };
  const toggleEditorImage = (id: number) => setEditor(current => current ? { ...current, imageIds: current.imageIds.includes(id) ? current.imageIds.filter(imageId => imageId !== id) : [...current.imageIds, id] } : current);
  const nav = [{ key: "library" as const, label: "Library", icon: Library }, { key: "albums" as const, label: "Albums", icon: Album }, { key: "presentation" as const, label: "Presentation", icon: Presentation }, { key: "activity" as const, label: "Activity", icon: Activity }];

  return <div className="admin-mode-shell album-admin-shell"><AppHeader mode="admin" /><div className="admin-app"><aside className="admin-sidebar"><nav className="admin-nav">{nav.map(item => <button key={item.key} className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}><item.icon size={18} /><span>{item.label}</span></button>)}</nav><div className="admin-account"><div className="account-avatar">A</div><div><b>Admin</b><span>Album workspace</span></div></div></aside><main className="admin-content">
    {tab === "library" && <><section className="admin-page-heading"><div><p className="eyebrow">IMAGE LIBRARY</p><h1>All your uploads, clearly organized.</h1><p>Smart views update automatically. Add any image to as many custom albums as you need.</p></div><button className="new-category" onClick={() => setTab("albums")}><FolderPlus size={16} /> New album</button></section><section className="upload-layout"><div className="upload-main"><div className="drop-zone" onDragOver={event => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); beginFiles(event.dataTransfer.files); }} onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={event => event.key === "Enter" && fileInput.current?.click()}><input className="hidden-input" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && beginFiles(event.target.files)} /><CloudUpload size={40} strokeWidth={1.25} /><strong>Drop images into your library</strong><span>or click to <em>browse files</em></span><div className="upload-capabilities"><span><Check size={15} /> Original Quality</span><span><RefreshCw size={15} /> Safe Retry</span><span><Sparkles size={15} /> Smart Organization</span></div></div><Queue queue={queue} onRetry={upload} onCancel={id => xhrs.current[id]?.abort()} onClear={() => setQueue(current => current.filter(item => !["complete", "stored"].includes(item.status)))} /><section className="library-section"><div className="uncategorized-heading"><div><h2>Library <span>{libraryImages.length}</span></h2><p>Every uploaded image stays here, even when added to albums.</p></div><div className="image-tools"><button onClick={() => setSelected(selected.length === libraryImages.length ? [] : libraryImages.map(image => image.recordId))}>Select all</button><button className={grid ? "is-active" : ""} onClick={() => setGrid(true)}><Grid2X2 size={16} /></button><button className={!grid ? "is-active" : ""} onClick={() => setGrid(false)}><LayoutList size={16} /></button><button onClick={() => setSortNewest(current => !current)}>Sort: {sortNewest ? "Newest" : "Name"} <ArrowDownUp size={14} /></button></div></div><SmartBar smartAlbums={smartAlbums} />{isLoading ? <div className="queue-empty">Loading library…</div> : libraryImages.length ? <ImageGrid images={libraryImages} selected={selected} onToggle={id => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])} list={grid ? false : true} /> : <div className="admin-empty-state"><ImageIcon size={23} /><h2>Your library is empty.</h2><p>Upload your first image above. It will appear here and be classified automatically.</p></div>}</section></div><aside className="contextual-panel album-context-panel"><div className="contextual-heading"><h2>Smart views</h2><Sparkles size={16} /></div>{smartAlbums.map(view => <div className="smart-side-row" key={view.id}><span className={`smart-symbol ${view.id}`}><Monitor size={13} /></span><div><b>{view.name}</b><small>{view.imageCount} images</small></div></div>)}<div className="organize-note"><b>How smart organization works</b><p>Screen-related filenames go to Captured screens. App, UI, mockup, design, and dashboard filenames go to Project visuals.</p><p>Everything else stays in Personal images.</p></div></aside></section>{selected.length > 0 && <div className="bulk-action-bar"><span>{selected.length} selected</span><label className="move-picker"><Album size={16} /><span>Add to album</span><select value={targetAlbum} onChange={event => setTargetAlbum(event.target.value)}><option value="" disabled>Select album</option>{albums.map(album => <option value={album.id} key={album.id}>{album.name}</option>)}</select></label><button onClick={addToAlbum} disabled={!targetAlbum || setAlbumImages.isPending}>Add images</button><button onClick={() => { setSelected([]); setTargetAlbum(""); }}>Clear</button></div>}</>}
    {tab === "albums" && <section className="admin-full-page albums-manager"><div className="admin-page-heading"><div><p className="eyebrow">CUSTOM ALBUMS</p><h1>Arrange your own visual stories.</h1><p>Add images to multiple albums without moving or duplicating the originals.</p></div><button className="new-category" onClick={() => openEdit()}><Plus size={16} /> New album</button></div>{albums.length ? <div className="album-manager-grid">{albums.map((album, index) => <article className={`album-manager-card accent-${album.accent}`} key={album.id}><div className="album-manager-cover">{album.cover ? <img src={album.cover} alt="" /> : <span>{album.name.slice(0, 1).toUpperCase()}</span>}<button onClick={() => openEdit(album)} aria-label={`Edit ${album.name}`}><Pencil size={15} /></button></div><div className="album-manager-copy"><div><b>{album.name}</b><span>{album.imageCount} {album.imageCount === 1 ? "image" : "images"} · {album.visibility}</span></div><div className="album-reorder"><button disabled={index === 0 || reorderAlbums.isPending} onClick={() => void moveAlbum(index, -1)} aria-label={`Move ${album.name} up`}><ChevronUp size={14} /></button><button disabled={index === albums.length - 1 || reorderAlbums.isPending} onClick={() => void moveAlbum(index, 1)} aria-label={`Move ${album.name} down`}><ChevronDown size={14} /></button><button className="quiet-delete" onClick={() => void removeAlbum(album)} aria-label={`Delete ${album.name}`}><Trash2 size={15} /></button></div></div></article>)}</div> : <div className="admin-empty-state"><FolderPlus size={23} /><h2>No custom albums yet.</h2><p>Create one to curate selected library images into a presentable sequence.</p><button className="new-category" onClick={() => openEdit()}>Create album</button></div>}</section>}
    {tab === "presentation" && <PresentationSettings settings={settings} setSettings={setSettings} />}
    {tab === "activity" && <ActivityFeed activity={activity} />}
  </main><nav className="admin-bottom-nav">{nav.map(item => <button key={item.key} className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}><item.icon size={19} /><span>{item.label}</span></button>)}</nav></div>{editor && <AlbumEditor draft={editor} images={libraryImages} onChange={setEditor} onToggleImage={toggleEditorImage} onClose={() => setEditor(null)} onSave={() => void saveAlbum()} saving={createAlbum.isPending || updateAlbum.isPending || setAlbumImages.isPending} />}</div>;
}

function Queue({ queue, onRetry, onCancel, onClear }: { queue: QueueItem[]; onRetry: (item: QueueItem) => Promise<void>; onCancel: (id: string) => void; onClear: () => void }) { return <section className="upload-queue"><div className="queue-heading"><h2>Upload activity <span>{queue.length}</span></h2><button onClick={onClear}>Clear completed</button></div>{queue.length === 0 ? <div className="queue-empty">Uploads and their status will appear here.</div> : <div className="queue-list">{queue.map(item => <div className="queue-row" key={item.id}><div className="queue-thumb">{item.preview ? <img src={item.preview} alt="" /> : <ImageIcon size={18} />}</div><div className="queue-file"><b>{item.file.name}</b><span>{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span><div className="progress-track"><i style={{ width: `${item.progress}%` }} /></div>{item.error && <small className={item.status === "failed" ? "status-error" : "status-note"}>{item.error}</small>}</div><div className="queue-status">{item.status === "complete" ? <><span>Ready</span><Check className="status-success" size={16} /></> : item.status === "stored" ? <><span>Stored</span><Check className="status-success" size={16} /></> : item.status === "failed" || item.status === "cancelled" ? <button onClick={() => void onRetry(item)}><RefreshCw size={15} /> Retry</button> : <><span>{item.status === "indexing" ? "Indexing" : item.status === "checking" ? "Checking" : `${item.progress}%`}</span><button onClick={() => onCancel(item.id)} aria-label="Cancel upload"><X size={15} /></button></>}</div></div>)}</div>}</section>; }

function SmartBar({ smartAlbums }: { smartAlbums: ReturnType<typeof usePersistedGallery>["smartAlbums"] }) { return <div className="smart-library-bar">{smartAlbums.slice(1).map(view => <span key={view.id}><Sparkles size={13} /> {view.name}: {view.imageCount}</span>)}</div>; }

function ImageGrid({ images, selected, onToggle, list }: { images: PersistedGalleryImage[]; selected: number[]; onToggle: (id: number) => void; list: boolean }) { return <div className={list ? "uncategorized-list" : "uncategorized-grid"}>{images.map(image => <button className="admin-image-card" key={image.id} onClick={() => onToggle(image.recordId)}><div className="admin-image-frame"><img src={image.src} alt={image.alt} loading="lazy" /><i className={selected.includes(image.recordId) ? "select-box selected" : "select-box"}>{selected.includes(image.recordId) && <Check size={12} />}</i><span className={`smart-tag ${image.smartGroup}`}>{image.smartGroup}</span></div><div><b>{image.title}</b><span>{image.width ? `${image.width} × ${image.height}` : "Uploaded image"}</span></div></button>)}</div>; }

function AlbumEditor({ draft, images, onChange, onToggleImage, onClose, onSave, saving }: { draft: AlbumDraft; images: PersistedGalleryImage[]; onChange: React.Dispatch<React.SetStateAction<AlbumDraft | null>>; onToggleImage: (id: number) => void; onClose: () => void; onSave: () => void; saving: boolean }) { const patch = (value: Partial<AlbumDraft>) => onChange(current => current ? { ...current, ...value } : current); return <div className="album-editor-backdrop"><section className="album-editor" role="dialog" aria-modal="true" aria-label="Album editor"><div className="editor-heading"><div><p className="eyebrow">{draft.id ? "EDIT ALBUM" : "NEW ALBUM"}</p><h2>{draft.id ? "Shape this album" : "Create a custom album"}</h2></div><button onClick={onClose} aria-label="Close album editor"><X size={18} /></button></div><div className="editor-form"><label>Album name<input value={draft.name} onChange={event => patch({ name: event.target.value })} placeholder="e.g. Summer notes" autoFocus /></label><label>Description<textarea value={draft.description} onChange={event => patch({ description: event.target.value })} placeholder="What connects these images?" /></label><div className="editor-fields"><label>Visibility<select value={draft.visibility} onChange={event => patch({ visibility: event.target.value as AlbumDraft["visibility"] })}><option value="public">Public</option><option value="private">Private</option></select></label><label>Presentation<select value={draft.presentationMode} onChange={event => patch({ presentationMode: event.target.value as AlbumDraft["presentationMode"] })}><option value="immersive">Immersive</option><option value="standard">Standard</option><option value="kiosk">Kiosk</option></select></label><label>Accent<select value={draft.accent} onChange={event => patch({ accent: event.target.value })}><option value="indigo">Indigo</option><option value="sand">Sand</option><option value="moss">Moss</option><option value="rose">Rose</option><option value="stone">Stone</option></select></label></div><label>Cover image<select value={draft.coverImageId} onChange={event => patch({ coverImageId: event.target.value })}><option value="">Use first album image</option>{images.filter(image => draft.imageIds.includes(image.recordId)).map(image => <option value={image.recordId} key={image.id}>{image.title}</option>)}</select></label><div className="editor-members"><div><b>Album images</b><span>Select any library images. Originals remain in the Library.</span></div><div className="editor-image-grid">{images.map(image => <button type="button" key={image.id} className={draft.imageIds.includes(image.recordId) ? "is-selected" : ""} onClick={() => onToggleImage(image.recordId)}><img src={image.src} alt={image.alt} /><i>{draft.imageIds.includes(image.recordId) && <Check size={13} />}</i></button>)}</div></div></div><div className="editor-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="dark-button" disabled={!draft.name.trim() || saving} onClick={onSave}>{saving ? "Saving…" : draft.id ? "Save album" : "Create album"}</button></div></section></div>; }

function PresentationSettings({ settings, setSettings }: { settings: { autoplay: boolean; loop: boolean; interval: string; transition: string; showCaptions: boolean }; setSettings: React.Dispatch<React.SetStateAction<{ autoplay: boolean; loop: boolean; interval: string; transition: string; showCaptions: boolean }>> }) { const toggle = (key: "autoplay" | "loop" | "showCaptions", label: string) => <label className="settings-toggle"><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.checked }))} /></label>; return <section className="admin-full-page settings-page"><div className="admin-page-heading"><div><p className="eyebrow">PRESENTATION</p><h1>Album playback defaults.</h1><p>Every album can override these choices when it is edited.</p></div></div><div className="settings-grid"><section><h2>Playback</h2>{toggle("autoplay", "Autoplay")}{toggle("loop", "Loop continuously")}<label>Interval<select value={settings.interval} onChange={event => setSettings(current => ({ ...current, interval: event.target.value }))}>{[2,3,5,8,10,15,30].map(value => <option value={value} key={value}>{value} seconds</option>)}</select></label></section><section><h2>Appearance</h2>{toggle("showCaptions", "Show captions")}<label>Transition<select value={settings.transition} onChange={event => setSettings(current => ({ ...current, transition: event.target.value }))}><option value="crossfade">Crossfade</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="instant">Instant</option></select></label></section></div></section>; }

function ActivityFeed({ activity }: { activity: ActivityEvent[] }) { return <section className="admin-full-page activity-page"><div className="admin-page-heading"><div><p className="eyebrow">ACTIVITY</p><h1>Recent workspace changes.</h1><p>Uploads and album changes from this browser session appear here.</p></div></div>{activity.length ? <div className="activity-list">{activity.map(event => <article key={event.id}><span className="activity-marker"><Activity size={15} /></span><div><b>{event.title}</b><p>{event.detail}</p></div><time>{event.time}</time></article>)}</div> : <div className="admin-empty-state"><Activity size={23} /><h2>No activity yet.</h2><p>Upload images or create an album to begin.</p></div>}</section>; }
