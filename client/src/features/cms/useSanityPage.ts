import { useEffect, useState } from "react";
import { sanityClient } from "./client";
import type { SanityPage } from "./types";

export function useSanityPage(slug: string) {
  const [page, setPage] = useState<SanityPage | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    sanityClient
      .fetch<SanityPage | null>(
        `*[_type == "page" && slug.current == $slug][0]{_id,title,slug,seo,sections[]{...,image{...,asset->{_id,url,metadata{dimensions}}},items[]{...,image{...,asset->{_id,url}}}}}`,
        { slug },
      )
      .then((result) => {
        if (active) setPage(result ?? null);
      })
      .catch((error) => {
        console.error("Sanity page query failed", error);
        if (active) setPage(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  return { page, loading };
}
