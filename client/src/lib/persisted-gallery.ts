import { trpc } from "@/lib/trpc";
import { unassignedImageIds } from "@/lib/album-membership";
import { resolvePreviewSource, resolveThumbnailSource, warmGalleryImages } from "@/lib/image-preload";
import { useEffect, useMemo } from "react";

export type SmartGroup = "personal" | "screens" | "projects";

export type PersistedGalleryImage = {
  id: string;
  recordId: number;
  src: string;
  thumbnailSrc: string;
  previewSrc: string;
  alt: string;
  title: string;
  caption: string;
  collection: string;
  smartGroup: SmartGroup;
  width: number;
  height: number;
  createdAt: string;
  aiStatus: "off" | "queued" | "analyzing" | "ready" | "approved" | "dismissed" | "failed";
  aiName: string | null;
  aiDescription: string | null;
  aiSuggestedAlbumId: number | null;
  aiSuggestedNewAlbum: string | null;
  aiError: string | null;
};

export type PersistedAlbum = {
  id: number;
  slug: string;
  kind: "system" | "custom";
  name: string;
  description: string;
  cover: string | null;
  coverImageId: number | null;
  visibility: "public" | "private";
  mode: "standard" | "immersive" | "kiosk";
  accent: string;
  imageCount: number;
};

export type SmartAlbum = {
  id: SmartGroup;
  name: string;
  description: string;
  imageCount: number;
};

type GalleryImageCopyInput = Pick<PersistedGalleryImage, "aiStatus" | "aiName" | "aiDescription"> & {
  filename: string;
  caption: string | null;
};

export function resolveVisibleImageCopy(image: GalleryImageCopyInput) {
  const hasReadyAiName = image.aiStatus === "approved" && Boolean(image.aiName);
  return {
    title: hasReadyAiName ? image.aiName! : image.filename.replace(/\.[^/.]+$/, ""),
    caption: hasReadyAiName && image.aiDescription ? image.aiDescription : image.caption ?? "Uploaded gallery image.",
  };
}

function toImage(image: { id: number; originalUrl: string; thumbnailUrl: string | null; previewUrl: string | null; filename: string; caption: string | null; smartGroup: SmartGroup; width: number | null; height: number | null; createdAt: Date; aiStatus: PersistedGalleryImage["aiStatus"]; aiName: string | null; aiDescription: string | null; aiSuggestedAlbumId: number | null; aiSuggestedNewAlbum: string | null; aiError: string | null }): PersistedGalleryImage {
  const copy = resolveVisibleImageCopy(image);
  return {
    id: `image-${image.id}`,
    recordId: image.id,
    src: image.originalUrl,
    thumbnailSrc: resolveThumbnailSource(image.thumbnailUrl, image.originalUrl),
    previewSrc: resolvePreviewSource(image.previewUrl, image.thumbnailUrl, image.originalUrl),
    alt: image.filename,
    title: copy.title,
    caption: copy.caption,
    collection: image.smartGroup,
    smartGroup: image.smartGroup,
    width: image.width ?? 0,
    height: image.height ?? 0,
    createdAt: new Date(image.createdAt).toISOString(),
    aiStatus: image.aiStatus,
    aiName: image.aiName,
    aiDescription: image.aiDescription,
    aiSuggestedAlbumId: image.aiSuggestedAlbumId,
    aiSuggestedNewAlbum: image.aiSuggestedNewAlbum,
    aiError: image.aiError,
  };
}

export function usePersistedGallery() {
  const query = trpc.gallery.publicDashboard.useQuery();
  const previewLoading = typeof window !== "undefined" && import.meta.env.DEV && window.sessionStorage.getItem("gallery-preview-loading") === "1";
  const dashboard = query.data;
  const imageSources = useMemo(() => dashboard?.images.map(image => resolvePreviewSource(image.previewUrl, image.thumbnailUrl, image.originalUrl)) ?? [], [dashboard?.images]);
  const imageSourceKey = imageSources.join("|");
  useEffect(() => {
    if (!imageSources.length || typeof window === "undefined") return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const warm = () => warmGalleryImages(imageSources);
    const idle = window.requestIdleCallback?.(warm, { timeout: 900 });
    const timeout = idle === undefined ? window.setTimeout(warm, 120) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [imageSourceKey]);
  const images = dashboard?.images.map(toImage).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ?? [];
  const byImageId = new Map(images.map(image => [image.recordId, image]));
  const membershipByAlbum = new Map<number, number[]>();
  dashboard?.memberships.forEach(membership => membershipByAlbum.set(membership.albumId, [...(membershipByAlbum.get(membership.albumId) ?? []), membership.imageId]));
  const unassignedIds = unassignedImageIds(images.map(image => image.recordId), dashboard?.memberships ?? []);
  const unassignedImages = images.filter(image => unassignedIds.includes(image.recordId));
  const systemAlbumId = dashboard?.albums.find(album => album.kind === "system")?.id;
  const albumImages = (albumId: number) => albumId === systemAlbumId ? images : (membershipByAlbum.get(albumId) ?? []).map(imageId => byImageId.get(imageId)).filter((image): image is PersistedGalleryImage => Boolean(image));
  const albums: PersistedAlbum[] = dashboard?.albums.map(album => {
    const members = albumImages(album.id);
    return {
      id: album.id,
      slug: album.slug,
      kind: album.kind,
      name: album.name,
      description: album.description ?? "",
      coverImageId: album.coverImageId,
      cover: album.coverImageId ? byImageId.get(album.coverImageId)?.previewSrc ?? members[0]?.previewSrc ?? null : members[0]?.previewSrc ?? null,
      visibility: album.visibility,
      mode: album.presentationMode,
      accent: album.accent,
      imageCount: members.length,
    };
  }) ?? [];
  const smartAlbums: SmartAlbum[] = [
    { id: "screens", name: "Captured screens", description: "Images classified from screen-related filenames.", imageCount: images.filter(image => image.smartGroup === "screens").length },
    { id: "projects", name: "Project visuals", description: "App, design, mockup, and interface images.", imageCount: images.filter(image => image.smartGroup === "projects").length },
    { id: "personal", name: "Personal images", description: "All other uploaded images.", imageCount: images.filter(image => image.smartGroup === "personal").length },
  ];
  const smartImages = (group: SmartAlbum["id"]) => images.filter(image => image.smartGroup === group);
  const systemAlbum = albums.find(album => album.kind === "system") ?? null;
  const customAlbums = albums.filter(album => album.kind === "custom");

  return { ...query, isLoading: query.isLoading || previewLoading, images, albums, customAlbums, systemAlbum, unassignedImages, smartAlbums, albumImages, smartImages, aiSettings: dashboard?.aiSettings ?? { enabled: false, autoAnalyzeNew: false, provider: "builtin" as const, model: "gemini-3-flash-preview" as const, batchSize: 8 } };
}
