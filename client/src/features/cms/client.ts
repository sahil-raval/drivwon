import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: "v6luawxh",
  dataset: "production",
  apiVersion: "2026-10-12",
  useCdn: true,
  perspective: "published",
});

export const imageUrl = (source: unknown, width = 1600) => {
  if (!source || typeof source !== "object") return undefined;
  const ref = (source as { asset?: { _ref?: string } }).asset?._ref;
  if (!ref) return undefined;
  const [, id, dimensions, format] = ref.split("-");
  if (!id || !dimensions || !format) return undefined;
  return `https://cdn.sanity.io/images/v6luawxh/production/${id}-${dimensions}.${format}?w=${width}&auto=format`;
};
