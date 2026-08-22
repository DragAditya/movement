export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  title: string;
  caption: string;
  collection: string;
  width: number;
  height: number;
  createdAt: string;
};

export type GalleryCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover: string;
  mode: "standard" | "immersive" | "kiosk";
};
