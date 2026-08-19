import test from "node:test";
import assert from "node:assert/strict";

import {
  MIN_SCORE,
  addHighScore,
  formatDate,
  getLastGamertag,
  getHighScores,
  qualifiesForLeaderboard,
} from "../src/highScores.js";

test("leaderboard qualification starts at 50,000", () => {
  assert.equal(qualifiesForLeaderboard(MIN_SCORE - 1), false);
  assert.equal(qualifiesForLeaderboard(MIN_SCORE), true);
});

test("high score helpers use the shared API", async (t) => {
  const requests = [];
  const storedValues = new Map();
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) { return storedValues.get(key) ?? null; },
    setItem(key, value) { storedValues.set(key, value); },
  };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    return new Response(JSON.stringify([{ rank: 1, gamertag: "Ace", score: 60_000 }]), {
      status: options.method === "POST" ? 201 : 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  });

  await getHighScores();
  await addHighScore(" Ace ", 60_000, 5, 42);

  assert.equal(requests[0].url, "/api/scores");
  assert.equal(requests[1].options.method, "POST");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    gamertag: "Ace",
    score: 60_000,
    level: 5,
    linesCleared: 42,
  });
  assert.equal(getLastGamertag(), "Ace");
});

test("formatDate returns a compact friendly date", () => {
  assert.match(formatDate("2026-08-19T12:00:00.000Z"), /Aug 19/);
  assert.equal(formatDate("not-a-date"), "—");
});
