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

function storageUrl({ authenticated = false } = {}) {
  if (!JSONSTORAGE_URL) return null;

  let url;

  try {
    url = new URL(JSONSTORAGE_URL);
  } catch {
    return null;
  }

  // Prevent duplicate/old apiKey values from being used.
  url.searchParams.delete("apiKey");

  if (authenticated) {
    if (!JSONSTORAGE_API_KEY) return null;
    url.searchParams.set("apiKey", JSONSTORAGE_API_KEY);
  }

  return url.toString();
}

function rateLimited(event, limit) {
  const now = Date.now();

  const key =
    `${event.httpMethod}:` +
    (
      event.headers?.["x-nf-client-connection-ip"] ||
      event.headers?.["x-forwarded-for"] ||
      "unknown"
    );

  const recent = (requests.get(key) || []).filter(
    time => now - time < 60_000
  );

  if (recent.length >= limit) {
    return true;
  }

  recent.push(now);
  requests.set(key, recent);

  return false;
}

function validateUpdate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  if (
    Object.keys(body).length !== 2 ||
    !("id" in body) ||
    !("done" in body)
  ) {
    return null;
  }

  if (
    typeof body.id !== "string" ||
    !body.id.trim() ||
    typeof body.done !== "boolean"
  ) {
    return null;
  }

  return {
    id: body.id.trim(),
    done: body.done
  };
}

function validateChecklist(checklist) {
  if (!checklist || !Array.isArray(checklist.items)) {
    throw new Error("Invalid stored checklist");
  }

  const ids = new Set();

  for (const item of checklist.items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      ids.has(item.id)
    ) {
      throw new Error("Invalid stored checklist");
    }

    ids.add(item.id);
  }
}

async function parseChecklistResponse(response) {
  if (!response.ok) {
    const error = new Error(
      `Storage read failed with HTTP ${response.status}`
    );

    error.upstreamStatus = response.status;

    throw error;
  }

  let checklist;

  try {
    checklist = await response.json();
  } catch {
    const error = new Error(
      "JSONStorage returned something that is not valid JSON"
    );

    error.upstreamStatus = response.status;

    throw error;
  }

  validateChecklist(checklist);

  return checklist;
}

async function readChecklist() {
  const publicUrl = storageUrl();

  if (!publicUrl) {
    const error = new Error("JSONSTORAGE_URL is missing or invalid");
    error.configurationError = true;
    throw error;
  }

  /*
   * JSONStorage allows GET without authentication for public items.
   * Try that first.
   */
  let response = await fetch(publicUrl, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  /*
   * If the item is private, retry using the API key.
   */
  if (
    (response.status === 401 || response.status === 403) &&
    JSONSTORAGE_API_KEY
  ) {
    const authenticatedUrl = storageUrl({
      authenticated: true
    });

    response = await fetch(authenticatedUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });
  }

  return parseChecklistResponse(response);
}

async function writeChecklist(checklist) {
  const url = storageUrl({
    authenticated: true
  });

  if (!url) {
    const error = new Error(
      "JSONSTORAGE_API_KEY is missing or JSONSTORAGE_URL is invalid"
    );

    error.configurationError = true;

    throw error;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(checklist)
  });

  if (!response.ok) {
    const error = new Error(
      `Storage write failed with HTTP ${response.status}`
    );

    error.upstreamStatus = response.status;

    throw error;
  }
}

exports.handler = async function (event) {
  const method = event.httpMethod;

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        Allow: "GET, PUT, OPTIONS"
      },
      body: ""
    };
  }

  if (method !== "GET" && method !== "PUT") {
    return jsonResponse(
      405,
      {
        ok: false,
        error: "METHOD_NOT_ALLOWED"
      },
      {
        Allow: "GET, PUT, OPTIONS"
      }
    );
  }

  if (
    rateLimited(
      event,
      method === "GET" ? 60 : 30
    )
  ) {
    return jsonResponse(429, {
      ok: false,
      error: "RATE_LIMITED"
    });
  }

  if (!storageUrl()) {
    return jsonResponse(500, {
      ok: false,
      error: "SERVER_CONFIGURATION_ERROR"
    });
  }

  try {
    /*
     * GET
     */
    if (method === "GET") {
      const checklist = await readChecklist();

      return jsonResponse(
        200,
        checklist
      );
    }

    /*
     * PUT
     */
    let body;

    try {
      body = JSON.parse(event.body || "");
    } catch {
      return jsonResponse(400, {
        ok: false,
        error: "INVALID_REQUEST"
      });
    }

    const update = validateUpdate(body);

    if (!update) {
      return jsonResponse(400, {
        ok: false,
        error: "INVALID_REQUEST"
      });
    }

    const checklist = await readChecklist();

    const item = checklist.items.find(
      entry => entry.id === update.id
    );

    if (!item) {
      return jsonResponse(404, {
        ok: false,
        error: "ITEM_NOT_FOUND"
      });
    }

    item.done = update.done;

    await writeChecklist(checklist);

    return jsonResponse(200, {
      ok: true,
      item: {
        id: item.id,
        done: item.done
      }
    });

  } catch (error) {
    console.error(
      "[checklist]",
      error.message
    );

    if (error.configurationError) {
      return jsonResponse(500, {
        ok: false,
        error: "SERVER_CONFIGURATION_ERROR"
      });
    }

    const result = {
      ok: false,
      error:
        method === "GET"
          ? "STORAGE_READ_FAILED"
          : "STORAGE_WRITE_FAILED"
    };

    /*
     * This makes debugging much easier.
     *
     * Example:
     * {
     *   "ok": false,
     *   "error": "STORAGE_READ_FAILED",
     *   "upstreamStatus": 404
     * }
     */
    if (Number.isInteger(error.upstreamStatus)) {
      result.upstreamStatus = error.upstreamStatus;
    }

    return jsonResponse(
      502,
      result
    );
  }
};
