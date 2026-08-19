import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HighScoreStore } from "../server/highScoreStore.js";

test("high score store persists, sorts, ranks, and trims shared scores", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "neon-stack-scores-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dataFile = path.join(directory, "scores.json");
  const store = new HighScoreStore(dataFile, 2);

  await store.addScore({ gamertag: " Second ", score: 60_000, level: 5, linesCleared: 40 });
  await store.addScore({ gamertag: "First", score: 80_000, level: 7, linesCleared: 61 });
  const leaderboard = await store.addScore({ gamertag: "Trimmed", score: 50_000, level: 4, linesCleared: 33 });

  assert.equal(leaderboard.length, 2);
  assert.deepEqual(leaderboard.map(({ rank, gamertag, score }) => ({ rank, gamertag, score })), [
    { rank: 1, gamertag: "First", score: 80_000 },
    { rank: 2, gamertag: "Second", score: 60_000 },
  ]);

  const secondStore = new HighScoreStore(dataFile, 2);
  assert.deepEqual(await secondStore.getLeaderboard(), leaderboard);

  await secondStore.clearScores();
  assert.deepEqual(await store.getLeaderboard(), []);
});
