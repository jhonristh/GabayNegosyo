/** Parse only full YouTube IDs on recognized HTTPS hosts. */
export function youtubeEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    else if (["youtube.com", "www.youtube.com", "www.youtube-nocookie.com"].includes(host)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1] ?? null;
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const params = new URLSearchParams({playsinline: "1", rel: "0"});
    const time = url.searchParams.get("start") ?? url.searchParams.get("t");
    if (time && /^\d+s?$/.test(time)) params.set("start", String(parseInt(time, 10)));
    return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  } catch { return null; }
}
