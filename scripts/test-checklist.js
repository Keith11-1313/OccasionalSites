const assert = require("assert");

process.env.JSONSTORAGE_URL = "https://storage.test/checklist";
process.env.JSONSTORAGE_API_KEY = "test-key";

let data = {
  title: "MCU Watch Checklist",
  items: [
    { id: "p1-01", phase: 1, title: "Iron Man", year: "2008", optional: false, done: false, poster: "https://cdn.marvel.com/iron-man.jpg" },
    { id: "p2-05", phase: 2, title: "Test", year: "December 18, 2026", optional: true, done: false, poster: "https://cdn.marvel.com/test.jpg" },
    { id: "p4-17", phase: 4, title: "Test Two", year: "2025", optional: false, done: false, poster: "https://cdn.marvel.com/two.jpg" },
    { id: "p5-13", phase: 5, title: "Test Three", year: "2025", optional: false, done: false, poster: "" },
    { id: "p6-08", phase: 6, title: "Test Four", year: "2026", optional: false, done: false, poster: "" }
  ]
};

global.fetch = async (url, options = {}) => {
  if ((options.method || "GET") === "GET") return { ok: true, json: async () => structuredClone(data) };
  data = JSON.parse(options.body);
  return { ok: true };
};

const { handler } = require("../netlify/functions/checklist.js");
const base = { headers: { "x-forwarded-for": "test" } };

async function call(body, event = base) {
  return handler({ ...event, httpMethod: "PUT", body: JSON.stringify(body) });
}

(async () => {
  assert.equal((await handler({ httpMethod: "GET", headers: {} })).statusCode, 200);
  assert.equal((await call({}, base)).statusCode, 400);
  assert.equal((await call({ id: "", done: true }, base)).statusCode, 400);
  assert.equal((await call({ id: "p2-05", done: "true" }, base)).statusCode, 400);
  assert.equal((await call({ id: "p99-99", done: true }, base)).statusCode, 404);
  const before = structuredClone(data.items[1]);
  assert.equal((await call({ id: "p2-05", done: true, title: "Changed" }, base)).statusCode, 400);
  const response = await call({ id: "p2-05", done: true }, base);
  assert.equal(response.statusCode, 200);
  assert.equal(data.items[1].done, true);
  assert.deepEqual({ ...data.items[1], done: false }, before);
  await call({ id: "p4-17", done: true }, base);
  assert.equal(data.items[1].done, true);
  assert.equal(data.items[2].done, true);
  console.log("checklist function tests passed");
})();
