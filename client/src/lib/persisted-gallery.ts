import { trpc } from "@/lib/trpc";

export type SmartGroup = "personal" | "screens" | "projects";

export type PersistedGalleryImage = {
  id: string;
  recordId: number;
  src: string;
  alt: string;
  title: string;
  caption: string;
  collection: string;
  smartGroup: SmartGroup;
  width: number;
  height: number;
  createdAt: string;
};

export type PersistedAlbum = {
  id: number;
  slug: string;
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
  id: "library" | SmartGroup;
  name: string;
  description: string;
  imageCount: number;
};

function toImage(image: { id: number; originalUrl: string; filename: string; caption: string | null; smartGroup: SmartGroup; width: number | null; height: number | null; createdAt: Date }): PersistedGalleryImage {
  return {
    id: `image-${image.id}`,
    recordId: image.id,
    src: image.originalUrl,
    alt: image.filename,
    title: image.filename.replace(/\.[^/.]+$/, ""),
    caption: image.caption ?? "Uploaded gallery image.",
    collection: image.smartGroup,
    smartGroup: image.smartGroup,
    width: image.width ?? 0,
    height: image.height ?? 0,
    createdAt: new Date(image.createdAt).toISOString(),
  };
}

export function usePersistedGallery() {
  const query = trpc.gallery.publicDashboard.useQuery();
  const dashboard = query.data;
  const images = dashboard?.images.map(toImage).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ?? [];
  const byImageId = new Map(images.map(image => [image.recordId, image]));
  const membershipByAlbum = new Map<number, number[]>();
  dashboard?.memberships.forEach(membership => membershipByAlbum.set(membership.albumId, [...(membershipByAlbum.get(membership.albumId) ?? []), membership.imageId]));
  const albumImages = (albumId: number) => (membershipByAlbum.get(albumId) ?? []).map(imageId => byImageId.get(imageId)).filter((image): image is PersistedGalleryImage => Boolean(image));
  const albums: PersistedAlbum[] = dashboard?.albums.map(album => {
    const members = albumImages(album.id);
    return {
      id: album.id,
      slug: album.slug,
      name: album.name,
      description: album.description ?? "",
      coverImageId: album.coverImageId,
      cover: album.coverImageId ? byImageId.get(album.coverImageId)?.src ?? members[0]?.src ?? null : members[0]?.src ?? null,
      visibility: album.visibility,
      mode: album.presentationMode,
      accent: album.accent,
      imageCount: members.length,
    };
  }) ?? [];
  const smartAlbums: SmartAlbum[] = [
    { id: "library", name: "Library", description: "Every image you have uploaded.", imageCount: images.length },
    { id: "screens", name: "Captured screens", description: "Images classified from screen-related filenames.", imageCount: images.filter(image => image.smartGroup === "screens").length },
    { id: "projects", name: "Project visuals", description: "App, design, mockup, and interface images.", imageCount: images.filter(image => image.smartGroup === "projects").length },
    { id: "personal", name: "Personal images", description: "All other uploaded images.", imageCount: images.filter(image => image.smartGroup === "personal").length },
  ];
  const smartImages = (group: SmartAlbum["id"]) => group === "library" ? images : images.filter(image => image.smartGroup === group);

  return { ...query, images, albums, smartAlbums, albumImages, smartImages };
}
