export const sanityConfig = {
  projectId: "v6luawxh",
  dataset: "production",
  apiVersion: "2026-10-12",
};

export const DEFAULT_SITE_URL = "https://drivwon.com";

/** Minimal fetch-based GROQ client. Works in the browser, Node 18+ and Vercel functions. */
export async function sanityFetch<T>(query: string, params: Record<string, unknown> = {}, options: { cdn?: boolean; token?: string; timeoutMs?: number } = {}): Promise<T> {
  const host = options.cdn === false || options.token ? "api.sanity.io" : "apicdn.sanity.io";
  const url = new URL(`https://${sanityConfig.projectId}.${host}/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`);
  url.searchParams.set("query", query);
  url.searchParams.set("perspective", "published");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(`$${key}`, JSON.stringify(value));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(options.timeoutMs ?? 4000) });
  if (!response.ok) throw new Error(`Sanity query failed with ${response.status}`);
  const body = (await response.json()) as { result: T };
  return body.result;
}
