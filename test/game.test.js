import test from "node:test";
import assert from "node:assert/strict";

import {
  HORIZONTAL_ARR_INTERVAL,
  HORIZONTAL_DAS_DELAY,
  SOFT_DROP_INTERVAL,
  getDropInterval,
  getLevel,
  getLineClearScore,
  processHeldInput,
  setMoveLeftHeld,
  setMoveRightHeld,
  setSoftDropHeld,
} from "../src/game.js";

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

test("held soft drop repeats on the game clock at a fixed cadence", () => {
  const calls = [];
  const actions = {
    moveLeft: () => calls.push("left"),
    moveRight: () => calls.push("right"),
    softDrop: () => calls.push("soft"),
  };

  setSoftDropHeld(true);
  processHeldInput(100, actions);
  processHeldInput(100 + SOFT_DROP_INTERVAL - 1, actions);
  processHeldInput(100 + SOFT_DROP_INTERVAL, actions);
  processHeldInput(100 + SOFT_DROP_INTERVAL * 2, actions);
  setSoftDropHeld(false);

  assert.deepEqual(calls, ["soft", "soft"]);
});

test("a quick press and release produces exactly one immediate move", () => {
  const calls = [];

  setMoveRightHeld(true, () => calls.push("right"));
  setMoveRightHeld(false);
  processHeldInput(1000, {
    moveLeft: () => calls.push("left"),
    moveRight: () => calls.push("right"),
    softDrop: () => calls.push("soft"),
  });

  assert.deepEqual(calls, ["right"]);
});

test("held horizontal movement observes DAS before repeating at ARR cadence", () => {
  const calls = [];
  const actions = {
    moveLeft: () => calls.push("left"),
    moveRight: () => calls.push("right"),
    softDrop: () => calls.push("soft"),
  };

  setMoveLeftHeld(true);
  processHeldInput(200, actions);
  processHeldInput(200 + HORIZONTAL_DAS_DELAY - 1, actions);
  processHeldInput(200 + HORIZONTAL_DAS_DELAY, actions);
  processHeldInput(200 + HORIZONTAL_DAS_DELAY + HORIZONTAL_ARR_INTERVAL - 1, actions);
  processHeldInput(200 + HORIZONTAL_DAS_DELAY + HORIZONTAL_ARR_INTERVAL, actions);
  setMoveLeftHeld(false);

  assert.deepEqual(calls, ["left", "left"]);
});

test("releasing a held key stops loop-driven movement", () => {
  const calls = [];
  const actions = {
    moveLeft: () => calls.push("left"),
    moveRight: () => calls.push("right"),
    softDrop: () => calls.push("soft"),
  };

  setMoveRightHeld(true);
  processHeldInput(300, actions);
  setMoveRightHeld(false);
  processHeldInput(300 + HORIZONTAL_DAS_DELAY + HORIZONTAL_ARR_INTERVAL, actions);
  assert.deepEqual(calls, []);
});
