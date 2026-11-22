import { createImageUrlBuilder } from "@sanity/image-url";
import { sanityConfig } from "./config";

const builder = createImageUrlBuilder({ projectId: sanityConfig.projectId, dataset: sanityConfig.dataset });

export type SanityImage = { asset?: { _ref?: string; _id?: string; url?: string }; alt?: string; caption?: string; decorative?: boolean; crop?: unknown; hotspot?: unknown };

function assetId(source: unknown) {
  const asset = (source as SanityImage | undefined)?.asset;
  return asset?._ref || asset?._id;
}

export function hasImage(source: unknown): source is SanityImage {
  return Boolean(assetId(source));
}

/** Builds a CDN URL that respects crop and hotspot, auto-converts to WebP/AVIF. */
export function imageUrl(source: unknown, width = 1600, height?: number) {
  if (!hasImage(source)) return undefined;
  let image = builder.image(source as any).width(width).auto("format").quality(80).fit("max");
  if (height) image = image.height(height).fit("crop");
  return image.url();
}

/** Width and height from the asset id (image-<hash>-1200x800-jpg) — prevents layout shift (CLS). */
export function imageDimensions(source: unknown): { width: number; height: number } | undefined {
  const id = assetId(source);
  const match = id?.match(/-(\d+)x(\d+)-[a-z]+$/);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : undefined;
}

export function imageSrcSet(source: unknown, widths = [480, 768, 1080, 1440, 1920]) {
  if (!hasImage(source)) return undefined;
  const natural = imageDimensions(source)?.width ?? 4000;
  return widths.filter((width) => width <= natural || width === widths[0]).map((width) => `${imageUrl(source, width)} ${width}w`).join(", ");
}

export function fileUrl(source: unknown) {
  const ref = (source as { asset?: { _ref?: string; url?: string } } | undefined)?.asset;
  if (ref?.url) return ref.url;
  const match = ref?._ref?.match(/^file-([a-zA-Z0-9]+)-([a-z0-9]+)$/);
  return match ? `https://cdn.sanity.io/files/${sanityConfig.projectId}/${sanityConfig.dataset}/${match[1]}.${match[2]}` : undefined;
}
