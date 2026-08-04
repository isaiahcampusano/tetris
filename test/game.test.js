import test from "node:test";
import assert from "node:assert/strict";

import { getDropInterval, getLevel, getLineClearScore } from "../src/game.js";

test("line clear scoring uses the standard values at the current level", () => {
  assert.equal(getLineClearScore(1, 1), 100);
  assert.equal(getLineClearScore(2, 2), 600);
  assert.equal(getLineClearScore(3, 3), 1500);
  assert.equal(getLineClearScore(4, 4), 3200);
});

test("level increases every ten lines", () => {
  assert.equal(getLevel(0), 1);
  assert.equal(getLevel(9), 1);
  assert.equal(getLevel(10), 2);
  assert.equal(getLevel(29), 3);
});

test("drop interval accelerates by level and never drops below 100ms", () => {
  assert.equal(getDropInterval(1), 1000);
  assert.equal(getDropInterval(10), 325);
  assert.equal(getDropInterval(13), 100);
  assert.equal(getDropInterval(99), 100);
});
