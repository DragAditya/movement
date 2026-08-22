import { trpc } from "@/lib/trpc";

export type PersistedGalleryImage = {
  id: string;
  recordId: number;
  src: string;
  alt: string;
  title: string;
  caption: string;
  collection: string;
  collectionId: number | null;
  width: number;
  height: number;
  createdAt: string;
};

export type PersistedGalleryCollection = {
  id: number;
  slug: string;
  name: string;
  description: string;
  cover: string | null;
  mode: "standard" | "immersive" | "kiosk";
  imageCount: number;
};

function toImage(image: { id: number; originalUrl: string; filename: string; caption: string | null; collectionId: number | null; width: number | null; height: number | null; createdAt: Date }): PersistedGalleryImage {
  return {
    id: `image-${image.id}`,
    recordId: image.id,
    src: image.originalUrl,
    alt: image.filename,
    title: image.filename.replace(/\.[^/.]+$/, ""),
    caption: image.caption ?? "Uploaded gallery image.",
    collection: image.collectionId ? String(image.collectionId) : "uncategorized",
    collectionId: image.collectionId,
    width: image.width ?? 0,
    height: image.height ?? 0,
    createdAt: new Date(image.createdAt).toISOString(),
  };
}

export function usePersistedGallery() {
  const query = trpc.gallery.publicDashboard.useQuery();
  const dashboard = query.data;
  const images = dashboard ? [...dashboard.uncategorized, ...dashboard.assigned].map(toImage).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const collectionImages = (collectionId: number) => images.filter(image => image.collectionId === collectionId);
  const collections: PersistedGalleryCollection[] = dashboard?.collections.map(collection => {
    const assigned = collectionImages(collection.id);
    return {
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description ?? "",
      cover: collection.coverImageUrl ?? assigned[0]?.src ?? null,
      mode: collection.sharingMode,
      imageCount: assigned.length,
    };
  }) ?? [];

  return { ...query, images, collections, collectionImages };
}
