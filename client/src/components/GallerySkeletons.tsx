import React from "react";

type SkeletonProps = { count?: number };

const blocks = (count: number) => Array.from({ length: count }, (_, index) => index);

export function HeroMediaSkeleton() {
  return <div className="hero-loading-surface" aria-label="Loading your latest image" role="status"><span className="skeleton-block skeleton-media" /><span className="skeleton-block skeleton-caption" /></div>;
}

export function SmartCardsSkeleton({ count = 4 }: SkeletonProps) {
  return <div className="smart-row skeleton-smart-row" aria-label="Loading library views" role="status">{blocks(count).map(index => <div className="smart-card skeleton-card" key={index}><span className="skeleton-block skeleton-icon" /><span className="skeleton-copy"><i className="skeleton-block skeleton-line wide" /><i className="skeleton-block skeleton-line short" /></span></div>)}</div>;
}

export function AlbumCardsSkeleton({ count = 4 }: SkeletonProps) {
  return <div className="album-row skeleton-album-row" aria-label="Loading custom albums" role="status">{blocks(count).map(index => <div className="album-card skeleton-album-card" key={index}><span className="skeleton-block skeleton-cover" /><span className="skeleton-copy"><i className="skeleton-block skeleton-line wide" /><i className="skeleton-block skeleton-line short" /></span></div>)}</div>;
}

export function ImageGridSkeleton({ count = 6 }: SkeletonProps) {
  return <div className="latest-grid skeleton-image-grid" aria-label="Loading images" role="status">{blocks(count).map(index => <div className="skeleton-block skeleton-tile" key={index} />)}</div>;
}

export function SmartDirectorySkeleton({ count = 4 }: SkeletonProps) {
  return <div className="smart-directory-grid skeleton-smart-directory-grid" aria-label="Loading album views" role="status">{blocks(count).map(index => <div className="smart-directory-card skeleton-card" key={index}><span className="skeleton-block skeleton-icon" /><span className="skeleton-copy"><i className="skeleton-block skeleton-line wide" /><i className="skeleton-block skeleton-line medium" /><i className="skeleton-block skeleton-line short" /></span></div>)}</div>;
}

export function AlbumDirectorySkeleton({ count = 3 }: SkeletonProps) {
  return <div className="directory-grid album-directory-grid skeleton-directory-grid" aria-label="Loading custom albums" role="status">{blocks(count).map(index => <div className="directory-card skeleton-directory-card" key={index}><span className="skeleton-block skeleton-cover" /><span className="skeleton-copy"><i className="skeleton-block skeleton-line wide" /><i className="skeleton-block skeleton-line medium" /></span></div>)}</div>;
}

export function AdminImageGridSkeleton({ count = 8 }: SkeletonProps) {
  return <div className="uncategorized-grid skeleton-admin-image-grid" aria-label="Loading unassigned uploads" role="status">{blocks(count).map(index => <div className="skeleton-block skeleton-tile" key={index} />)}</div>;
}

export function AdminAlbumGridSkeleton({ count = 4 }: SkeletonProps) {
  return <div className="album-manager-grid skeleton-admin-album-grid" aria-label="Loading custom albums" role="status">{blocks(count).map(index => <div className="album-manager-card skeleton-card" key={index}><span className="skeleton-block skeleton-cover" /><span className="skeleton-copy"><i className="skeleton-block skeleton-line wide" /><i className="skeleton-block skeleton-line short" /></span></div>)}</div>;
}

export function AlbumDetailSkeleton() {
  return <><section className="detail-heading detail-skeleton" aria-label="Loading album" role="status"><span className="skeleton-block skeleton-back-link" /><span className="skeleton-block skeleton-eyebrow" /><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-description" /><span className="skeleton-block skeleton-action" /></section><section className="detail-grid skeleton-detail-grid">{blocks(6).map(index => <span className="skeleton-block skeleton-tile" key={index} />)}</section></>;
}

export function SlideshowLoadingScreen() {
  return <div className="slideshow-loading" aria-label="Loading slideshow" role="status"><span className="skeleton-block slideshow-loading-frame" /><span className="skeleton-block slideshow-loading-line" /></div>;
}
