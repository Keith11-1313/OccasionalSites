const JSONSTORAGE_URL = process.env.JSONSTORAGE_URL;
const JSONSTORAGE_API_KEY = process.env.JSONSTORAGE_API_KEY;
const requests = new Map();

function jsonResponse(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    },
    body: JSON.stringify(data)
  };
}

function storageUrl() {
  if (!JSONSTORAGE_URL || !JSONSTORAGE_API_KEY) return null;
  const separator = JSONSTORAGE_URL.includes("?") ? "&" : "?";
  return `${JSONSTORAGE_URL}${separator}apiKey=${encodeURIComponent(JSONSTORAGE_API_KEY)}`;
}

function rateLimited(event, limit) {
  const now = Date.now();
  const key = `${event.httpMethod}:${event.headers?.["x-nf-client-connection-ip"] || event.headers?.["x-forwarded-for"] || "unknown"}`;
  const recent = (requests.get(key) || []).filter(time => now - time < 60_000);
  if (recent.length >= limit) return true;
  recent.push(now);
  requests.set(key, recent);
  return false;
}

function validateUpdate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (Object.keys(body).length !== 2 || !("id" in body) || !("done" in body)) return null;
  if (typeof body.id !== "string" || !body.id.trim() || typeof body.done !== "boolean") return null;
  return { id: body.id, done: body.done };
}

function validateChecklist(checklist) {
  if (!checklist || !Array.isArray(checklist.items)) throw new Error("Invalid stored checklist");
  const ids = new Set();
  for (const item of checklist.items) {
    if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id)) {
      throw new Error("Invalid stored checklist");
    }
    ids.add(item.id);
  }
}

async function readChecklist(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("Storage read failed");
  const checklist = await response.json();
  validateChecklist(checklist);
  return checklist;
}

async function writeChecklist(url, checklist) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(checklist)
  });
  if (!response.ok) throw new Error("Storage write failed");
}

exports.handler = async function (event) {
  const method = event.httpMethod;
  if (method === "OPTIONS") return { statusCode: 204, headers: { Allow: "GET, PUT, OPTIONS" }, body: "" };
  if (method !== "GET" && method !== "PUT") return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" }, { Allow: "GET, PUT, OPTIONS" });
  if (rateLimited(event, method === "GET" ? 60 : 30)) return jsonResponse(429, { ok: false, error: "RATE_LIMITED" });

  const url = storageUrl();
  if (!url) return jsonResponse(500, { ok: false, error: "SERVER_CONFIGURATION_ERROR" });

  try {
    if (method === "GET") return jsonResponse(200, await readChecklist(url));

    let body;
    try {
      body = JSON.parse(event.body || "");
    } catch {
      return jsonResponse(400, { ok: false, error: "INVALID_REQUEST" });
    }
    const update = validateUpdate(body);
    if (!update) return jsonResponse(400, { ok: false, error: "INVALID_REQUEST" });

    const checklist = await readChecklist(url);
    const item = checklist.items.find(entry => entry.id === update.id);
    if (!item) return jsonResponse(404, { ok: false, error: "ITEM_NOT_FOUND" });

    item.done = update.done;
    await writeChecklist(url, checklist);
    return jsonResponse(200, { ok: true, item: { id: item.id, done: item.done } });
  } catch (error) {
    console.error(error.message);
    return jsonResponse(500, { ok: false, error: method === "GET" ? "STORAGE_READ_FAILED" : "STORAGE_WRITE_FAILED" });
  }
};
