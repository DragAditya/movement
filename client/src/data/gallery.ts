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

export const galleryImages: GalleryImage[] = [
  {
    id: "quiet-vessel",
    src: "/manus-storage/iiFVbgnAPYj4_d8523e24.jpg",
    alt: "Quiet white ceramic vessel against a pale background",
    title: "Quiet Vessel",
    caption: "A study in form, balance and stillness.",
    collection: "form-light",
    width: 3000,
    height: 2400,
    createdAt: "2026-08-20",
  },
  {
    id: "gathered-light",
    src: "/manus-storage/QASMGAtx7tIV_3c7b7d30.jpg",
    alt: "A green leaf in a clear vase on a white table",
    title: "Gathered Light",
    caption: "Natural lines held within a generous field of white.",
    collection: "form-light",
    width: 3000,
    height: 4500,
    createdAt: "2026-08-19",
  },
  {
    id: "soft-interval",
    src: "/manus-storage/XCL50Raitzr0_98af3896.jpg",
    alt: "A white flower in a soft-focus white vase",
    title: "Soft Interval",
    caption: "An almost weightless conversation of petal and shadow.",
    collection: "balanced-space",
    width: 3000,
    height: 3750,
    createdAt: "2026-08-18",
  },
  {
    id: "green-still",
    src: "/manus-storage/NFGxBrOWxwRD_ef62523e.jpg",
    alt: "A single leafy stem in a small vase",
    title: "Green Still",
    caption: "A small gesture of life in a calibrated interior.",
    collection: "organic-studies",
    width: 3000,
    height: 2043,
    createdAt: "2026-08-17",
  },
  {
    id: "familiar-form",
    src: "/manus-storage/Tj5cd2EL3Hjr_44e72e80.jpg",
    alt: "Tall plant in warm-toned vessels against white",
    title: "Familiar Form",
    caption: "Everyday geometry, softened by daylight.",
    collection: "organic-studies",
    width: 3000,
    height: 4500,
    createdAt: "2026-08-16",
  },
  {
    id: "studio-quiet",
    src: "/manus-storage/PvRmOub9tbxS_4efe6848.jpg",
    alt: "White vase and framed art in a restrained interior",
    title: "Studio Quiet",
    caption: "A vase becomes a focal point through scale and restraint.",
    collection: "shadow-objects",
    width: 3000,
    height: 4499,
    createdAt: "2026-08-15",
  },
  {
    id: "after-image",
    src: "/manus-storage/ctS15HvgX68r_94402b8f.jpg",
    alt: "Moody still life with sculptural objects",
    title: "After Image",
    caption: "Objects retain the memory of a room after the light moves on.",
    collection: "white-forms",
    width: 3000,
    height: 3935,
    createdAt: "2026-08-14",
  },
];

export const galleryCollections: GalleryCollection[] = [
  {
    id: "all",
    slug: "all-images",
    name: "All Images",
    description: "The complete gallery of studies and still lifes.",
    cover: galleryImages[0].src,
    mode: "immersive",
  },
  {
    id: "form",
    slug: "form-light",
    name: "Form & Light",
    description: "Quiet ceramic studies observed in clear natural light.",
    cover: galleryImages[0].src,
    mode: "standard",
  },
  {
    id: "space",
    slug: "balanced-space",
    name: "Balanced Space",
    description: "Compositions shaped by proportion and pause.",
    cover: galleryImages[2].src,
    mode: "immersive",
  },
  {
    id: "organic",
    slug: "organic-studies",
    name: "Organic Studies",
    description: "Botanical gestures and vessels in conversation.",
    cover: galleryImages[4].src,
    mode: "standard",
  },
  {
    id: "shadow",
    slug: "shadow-objects",
    name: "Shadow Objects",
    description: "Objects at rest, held by tone and architecture.",
    cover: galleryImages[5].src,
    mode: "kiosk",
  },
  {
    id: "white",
    slug: "white-forms",
    name: "White Forms",
    description: "A compact meditation on silhouette and surface.",
    cover: galleryImages[6].src,
    mode: "standard",
  },
];

export function collectionImages(slug: string) {
  return slug === "all-images" ? galleryImages : galleryImages.filter(image => image.collection === slug);
}

export function collectionCount(slug: string) {
  return collectionImages(slug).length;
}
