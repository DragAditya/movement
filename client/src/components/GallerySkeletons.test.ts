import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminAlbumGridSkeleton, AlbumDetailSkeleton, HeroMediaSkeleton, SlideshowLoadingScreen, SmartCardsSkeleton } from "./GallerySkeletons";

describe("Gallery loading skeletons", () => {
  it("renders labelled, layout-preserving public and admin placeholders", () => {
    const hero = renderToStaticMarkup(createElement(HeroMediaSkeleton));
    const views = renderToStaticMarkup(createElement(SmartCardsSkeleton, { count: 3 }));
    const albums = renderToStaticMarkup(createElement(AdminAlbumGridSkeleton, { count: 2 }));

    expect(hero).toContain('aria-label="Loading your latest image"');
    expect(views.match(/skeleton-card/g) ?? []).toHaveLength(3);
    expect(albums.match(/album-manager-card/g) ?? []).toHaveLength(2);
  });

  it("renders dedicated loading surfaces for album detail and slideshow entry", () => {
    expect(renderToStaticMarkup(createElement(AlbumDetailSkeleton))).toContain('aria-label="Loading album"');
    expect(renderToStaticMarkup(createElement(SlideshowLoadingScreen))).toContain('aria-label="Loading slideshow"');
  });
});
