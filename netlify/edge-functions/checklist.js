const requests = new Map();

function response(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function storageUrl(authenticated = false) {
  const rawUrl = Netlify.env.get("JSONSTORAGE_URL");
  const key = Netlify.env.get("JSONSTORAGE_API_KEY");
  if (!rawUrl || (authenticated && !key)) return null;
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete("apiKey");
    if (authenticated) url.searchParams.set("apiKey", key);
    return url;
  } catch {
    return null;
  }
}

function rateLimited(request, limit) {
  const now = Date.now();
  const key = `${request.method}:${request.headers.get("x-nf-client-connection-ip") || "unknown"}`;
  const recent = (requests.get(key) || []).filter(time => now - time < 60_000);
  if (recent.length >= limit) return true;
  recent.push(now);
  requests.set(key, recent);
  return false;
}

function validateChecklist(checklist) {
  if (!checklist || !Array.isArray(checklist.items)) return false;
  const ids = new Set();
  return checklist.items.every(item => item && typeof item.id === "string" && item.id && !ids.has(item.id) && (ids.add(item.id) || true));
}

async function readChecklist() {
  for (const authenticated of [false, true]) {
    const url = storageUrl(authenticated);
    if (!url) break;
    const result = await fetch(url, { headers: { accept: "application/json" } });
    if (result.ok) {
      const checklist = await result.json();
      if (!validateChecklist(checklist)) throw new Error("INVALID_CHECKLIST");
      return checklist;
    }
    if (result.status !== 401 && result.status !== 403) throw new Error("STORAGE_READ_FAILED");
  }
  throw new Error("STORAGE_READ_FAILED");
}

export default async function (request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "GET, PUT, OPTIONS" } });
  if (request.method !== "GET" && request.method !== "PUT") return response(405, { ok: false, error: "METHOD_NOT_ALLOWED" }, { allow: "GET, PUT, OPTIONS" });
  if (rateLimited(request, request.method === "GET" ? 60 : 30)) return response(429, { ok: false, error: "RATE_LIMITED" });
  if (!storageUrl()) return response(500, { ok: false, error: "SERVER_CONFIGURATION_ERROR" });

  try {
    const checklist = await readChecklist();
    if (request.method === "GET") return response(200, checklist);

    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== "string" || !body.id.trim() || typeof body.done !== "boolean" || Object.keys(body).length !== 2) return response(400, { ok: false, error: "INVALID_REQUEST" });
    const item = checklist.items.find(entry => entry.id === body.id.trim());
    if (!item) return response(404, { ok: false, error: "ITEM_NOT_FOUND" });

    item.done = body.done;
    const url = storageUrl(true);
    const saved = await fetch(url, { method: "PUT", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(checklist) });
    if (!saved.ok) throw new Error("STORAGE_WRITE_FAILED");
    return response(200, { ok: true, item: { id: item.id, done: item.done } });
  } catch (error) {
    console.error("[checklist]", error.message);
    return response(502, { ok: false, error: request.method === "GET" ? "STORAGE_READ_FAILED" : "STORAGE_WRITE_FAILED" });
  }
}

export const config = { path: "/.netlify/functions/checklist" };
