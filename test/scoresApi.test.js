import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createApp } from "../server/app.js";
import { HighScoreStore } from "../server/highScoreStore.js";

async function startTestServer(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "neon-stack-api-"));
  const store = new HighScoreStore(path.join(directory, "scores.json"));
  const server = createApp({ store }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test("scores API enforces the threshold and shares ranked entries", async (t) => {
  const baseUrl = await startTestServer(t);

  const rejected = await fetch(`${baseUrl}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gamertag: "Rookie", score: 49_999, level: 2, linesCleared: 8 }),
  });
  assert.equal(rejected.status, 422);

  const saved = await fetch(`${baseUrl}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gamertag: "Ace", score: 75_000, level: 6, linesCleared: 52 }),
  });
  assert.equal(saved.status, 201);
  assert.equal((await saved.json())[0].gamertag, "Ace");

  const loaded = await fetch(`${baseUrl}/api/scores`);
  assert.deepEqual((await loaded.json()).map(({ rank, gamertag, score }) => ({ rank, gamertag, score })), [
    { rank: 1, gamertag: "Ace", score: 75_000 },
  ]);

  const cleared = await fetch(`${baseUrl}/api/scores`, { method: "DELETE" });
  assert.equal(cleared.status, 204);
  assert.deepEqual(await (await fetch(`${baseUrl}/api/scores`)).json(), []);
});

test("scores API rejects malformed numeric fields", async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gamertag: "Cheater", score: "999999", level: 1, linesCleared: 1 }),
  });

  assert.equal(response.status, 400);
});

test("server hosts the game without exposing backend data files", async (t) => {
  const baseUrl = await startTestServer(t);
  const game = await fetch(`${baseUrl}/`);
  const privateData = await fetch(`${baseUrl}/server/data/high-scores.json`);

  assert.equal(game.status, 200);
  assert.match(await game.text(), /Neon Stack/);
  assert.equal(privateData.status, 404);
});
