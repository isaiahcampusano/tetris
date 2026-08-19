import test from "node:test";
import assert from "node:assert/strict";

import { handleRequest } from "../worker/src/index.js";

test("worker rejects unknown paths", async () => {
  const response = await handleRequest(new Request("https://example.workers.dev/nope"), {});
  assert.equal(response.status, 404);
});

test("worker serves CORS preflight for the GitHub Pages frontend", async () => {
  const response = await handleRequest(new Request("https://example.workers.dev/api/scores", {
    method: "OPTIONS",
    headers: { Origin: "https://isaiahcampusano.github.io" },
  }), {});

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://isaiahcampusano.github.io");
});

test("worker validates score payloads before accessing D1", async () => {
  const response = await handleRequest(new Request("https://example.workers.dev/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gamertag: "Rookie", score: 49_999, level: 2, linesCleared: 8 }),
  }), {});

  assert.equal(response.status, 422);
});
