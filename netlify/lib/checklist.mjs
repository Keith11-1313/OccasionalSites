function response(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

export function createChecklistHandler({ catalog, initialProgress, getProgressStore, today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()) }) {
  const requests = new Map();
  const items = new Map(catalog.items.map(item => [item.id, item]));
  const episodes = new Map(catalog.items.flatMap(item => (item.episodes || []).map(episode => [episode.id, episode])));
  return async (request, context) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "GET, PUT, OPTIONS" } });
    if (!["GET", "PUT"].includes(request.method)) return response(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

    const now = Date.now();
    for (const [key, times] of requests) {
      if (times.at(-1) <= now - 60_000) requests.delete(key);
    }
    const key = `${request.method}:${request.headers.get("x-nf-client-connection-ip") || "unknown"}`;
    const recent = (requests.get(key) || []).filter(time => now - time < 60_000);
    if (recent.length >= (request.method === "GET" ? 60 : 30)) return response(429, { ok: false, error: "RATE_LIMITED" });
    requests.set(key, [...recent, now]);

    try {
      if (request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.id !== "string" || !body.id.trim() || typeof body.done !== "boolean" || Object.keys(body).length !== 2) return response(400, { ok: false, error: "INVALID_REQUEST" });
        const id = body.id.trim();
        const target = items.get(id) || episodes.get(id);
        if (!target) return response(404, { ok: false, error: "ITEM_NOT_FOUND" });
        if (target.episodes) return response(400, { ok: false, error: "USE_EPISODE_CHECKLIST" });
        if (target.upcoming || (target.releaseDate && target.releaseDate > today())) return response(400, { ok: false, error: "NOT_RELEASED" });
        await getProgressStore(context).setJSON(`progress/${id}`, body.done);
        return response(200, { ok: true, item: { id, done: body.done } });
      }

      const store = getProgressStore(context);
      const savedItems = await Promise.all(catalog.items.map(async item => {
        const saved = await store.get(`progress/${item.id}`, { type: "json" });
        if (saved !== null && typeof saved !== "boolean") throw new Error("INVALID_PROGRESS");
        // Missing entries inherit the recovered snapshot; explicit false must win.
        const done = saved ?? initialProgress[item.id] ?? false;
        if (!item.episodes) return { ...item, done };
        const savedEpisodes = await Promise.all(item.episodes.map(async episode => {
          const episodeSaved = await store.get(`progress/${episode.id}`, { type: "json" });
          if (episodeSaved !== null && typeof episodeSaved !== "boolean") throw new Error("INVALID_PROGRESS");
          return { ...episode, done: episodeSaved ?? done };
        }));
        return { ...item, episodes: savedEpisodes, done: savedEpisodes.every(episode => episode.done) };
      }));
      return response(200, { ...catalog, items: savedItems });
    } catch (error) {
      console.error("[checklist]", error.name);
      return response(502, { ok: false, error: request.method === "GET" ? "STORAGE_READ_FAILED" : "STORAGE_WRITE_FAILED" });
    }
  };
}
