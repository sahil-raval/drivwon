import { useQuery } from "@tanstack/react-query";
import { sanityFetch } from "@shared/cms/config";
import { SETTINGS_QUERY, routeQuery } from "@shared/cms/queries";
import { matchRoute } from "@shared/cms/routes";

export { imageUrl, imageSrcSet, imageDimensions, hasImage, fileUrl } from "@shared/cms/image";

/** Thin wrapper kept for older imports (e.g. the chatbot). */
export const sanityClient = {
  fetch: <T,>(query: string, params: Record<string, unknown> = {}) => sanityFetch<T>(query, params),
};

declare global {
  interface Window { __DRIVWON_SETTINGS__?: any }
}

/** Loads the CMS document for a URL path. Results are cached between navigations. */
export function useCmsRoute(path: string) {
  const match = matchRoute(path);
  const spec = routeQuery(match);
  const query = useQuery({
    queryKey: ["cms-route", path],
    queryFn: () => (spec ? sanityFetch<any>(spec.query, spec.params) : Promise.resolve(null)),
    enabled: Boolean(spec),
    staleTime: 60_000,
    retry: 1,
  });
  return { match, data: query.data ?? null, loading: query.isLoading && Boolean(spec), error: query.error };
}

let settingsPromise: Promise<any> | null = null;
export function getSettings() {
  if (typeof window !== "undefined" && window.__DRIVWON_SETTINGS__) return Promise.resolve(window.__DRIVWON_SETTINGS__);
  settingsPromise ??= sanityFetch<any>(SETTINGS_QUERY).catch((error) => { settingsPromise = null; throw error; });
  return settingsPromise;
}
