function response(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

export function createChecklistHandler({ catalog, initialProgress, getProgressStore }) {
  const requests = new Map();
  const items = new Map(catalog.items.map(item => [item.id, item]));
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
        if (!items.has(id)) return response(404, { ok: false, error: "ITEM_NOT_FOUND" });
        await getProgressStore(context).setJSON(`progress/${id}`, body.done);
        return response(200, { ok: true, item: { id, done: body.done } });
      }

      const store = getProgressStore(context);
      const savedItems = await Promise.all(catalog.items.map(async item => {
        const saved = await store.get(`progress/${item.id}`, { type: "json" });
        if (saved !== null && typeof saved !== "boolean") throw new Error("INVALID_PROGRESS");
        // Missing entries inherit the recovered snapshot; explicit false must win.
        return { ...item, done: saved ?? initialProgress[item.id] ?? false };
      }));
      return response(200, { ...catalog, items: savedItems });
    } catch (error) {
      console.error("[checklist]", error.name);
      return response(502, { ok: false, error: request.method === "GET" ? "STORAGE_READ_FAILED" : "STORAGE_WRITE_FAILED" });
    }
  };
}
