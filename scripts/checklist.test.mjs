import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import { createChecklistHandler } from "../netlify/lib/checklist.mjs";
import catalog from "../mcuarchive/checklist.json" with { type: "json" };
import initialProgress from "../netlify/data/initial-progress.json" with { type: "json" };

const request = (body, method = body ? "PUT" : "GET") => new Request("https://example.test/.netlify/functions/checklist", {
  method,
  ...(body && { body: JSON.stringify(body), headers: { "content-type": "application/json" } })
});

test("Blobs preserves recovered progress, independent updates, and state after restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mcu-blobs-"));
  let server = new BlobsServer({ directory, token: "local-test-token" });
  let address = await server.start();
  const makeHandler = () => createChecklistHandler({ catalog, initialProgress, getProgressStore: () => getStore({
    name: "mcu-progress", siteID: "test-site", token: "local-test-token",
    apiURL: `http://localhost:${address.port}`, consistency: "strong"
  }) });
  try {
    let handler = makeHandler();
    const initial = await (await handler(request())).json();
    assert.equal(initial.items.length, 61);
    assert.equal(initial.items.filter(item => item.done).length, 24);
    assert.deepEqual(initial.items.map(({ done, ...item }) => item), catalog.items);
    const watched = initial.items.find(item => item.done).id;
    const unwatched = initial.items.find(item => !item.done).id;
    const saves = await Promise.all([
      handler(request({ id: watched, done: false })),
      handler(request({ id: unwatched, done: true }))
    ]);
    assert.deepEqual(saves.map(result => result.status), [200, 200]);
    await server.stop();
    server = new BlobsServer({ directory, token: "local-test-token" });
    address = await server.start();
    handler = makeHandler();
    const reopened = await (await handler(request())).json();
    assert.equal(reopened.items.find(item => item.id === watched).done, false);
    assert.equal(reopened.items.find(item => item.id === unwatched).done, true);
    assert.equal((await handler(request({ id: watched, done: "true" }))).status, 400);
    assert.equal((await handler(request({ id: watched, done: true, title: "changed" }))).status, 400);
    assert.equal((await handler(request({ id: "unknown", done: true }))).status, 404);
    assert.equal((await handler(request(null, "DELETE"))).status, 405);
    for (let i = 0; i < 27; i++) await handler(request({ id: "unknown", done: false }));
    assert.equal((await handler(request({ id: watched, done: true }))).status, 429);
  } finally {
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test("storage failures return an error rather than reporting a successful save", async () => {
  const handler = createChecklistHandler({ catalog, initialProgress, getProgressStore() { throw new Error("Offline"); } });
  assert.equal((await handler(request())).status, 502);
  const result = await handler(request({ id: catalog.items[0].id, done: true }));
  assert.equal(result.status, 502);
  assert.equal((await result.json()).error, "STORAGE_WRITE_FAILED");
});
