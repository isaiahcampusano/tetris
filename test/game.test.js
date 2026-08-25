import test from "node:test";
import assert from "node:assert/strict";

import { createBoard } from "../src/board.js";
import { createPiece } from "../src/pieces.js";

import {
  HORIZONTAL_ARR_INTERVAL,
  HORIZONTAL_DAS_DELAY,
  LOCK_DELAY,
  SOFT_DROP_INTERVAL,
  advanceLockState,
  getDropInterval,
  getGhostPosition,
  getHoldResult,
  getLevel,
  getLineClearScore,
  hardDrop,
  isGameOver,
  processHeldInput,
  prepareHighScoreModal,
  isPaused,
  restart,
  setMoveLeftHeld,
  setMoveRightHeld,
  setSoftDropHeld,
  togglePause,
} from "../src/game.js";

test("restart starts unpaused and pause toggles only during an active game", () => {
  restart();
  assert.equal(isPaused(), false);

  togglePause();
  assert.equal(isPaused(), true);

  togglePause();
  assert.equal(isPaused(), false);

  restart();
  assert.equal(isPaused(), false);
});

test("pausing clears held input and cannot be enabled after game over", () => {
  const calls = [];
  restart();
  setMoveLeftHeld(true, () => {});

  togglePause();
  togglePause();
  processHeldInput(10_000, {
    moveLeft: () => calls.push("left"),
    moveRight: () => calls.push("right"),
    softDrop: () => calls.push("soft"),
  });
  assert.deepEqual(calls, []);

  for (let drops = 0; drops < 100 && !isGameOver(); drops += 1) {
    hardDrop();
  }
  assert.equal(isGameOver(), true);
  togglePause();
  assert.equal(isPaused(), false);

  restart();
});

test("qualifying-score modal is prefilled with the last gamertag", (t) => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => "LastPlayer" };
  t.after(() => { globalThis.localStorage = originalLocalStorage; });
  const calls = [];
  const domElements = {
    highScoreSummary: { textContent: "" },
    gamertagInput: {
      value: "",
      focus: () => calls.push("focus"),
      select: () => calls.push("select"),
    },
    highScoreError: { hidden: false, textContent: "old error" },
    highScoreModal: { showModal: () => calls.push("show") },
  };

  prepareHighScoreModal(domElements, 50_000, 4);

  assert.equal(domElements.highScoreSummary.textContent, "50,000 points · Level 4");
  assert.equal(domElements.gamertagInput.value, "LastPlayer");
  assert.equal(domElements.highScoreError.hidden, true);
  assert.deepEqual(calls, ["show", "focus", "select"]);
});

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

test("ghost position lands on the flat floor without mutating the piece", () => {
  const board = createBoard();
  const piece = createPiece("O");
  const originalPiece = structuredClone(piece);

  assert.equal(getGhostPosition(piece, board), 18);
  assert.deepEqual(piece, originalPiece);
});

test("ghost position lands on stacked blocks", () => {
  const board = createBoard();
  const piece = createPiece("O");
  board[17][piece.x] = "#fff";

  assert.equal(getGhostPosition(piece, board), 15);
});

test("ghost position stays put when the piece is already resting", () => {
  const board = createBoard();
  const piece = { ...createPiece("O"), y: 18 };

  assert.equal(getGhostPosition(piece, board), piece.y);
});

test("holding into an empty slot consumes next and stores the current type", () => {
  const currentPiece = createPiece("T");
  const nextPiece = createPiece("I");
  const result = getHoldResult(currentPiece, null, nextPiece);

  assert.equal(result.currentPiece, nextPiece);
  assert.equal(result.holdPieceType, "T");
  assert.equal(result.consumesNextPiece, true);
});

test("swapping with hold rebuilds the piece at its spawn position", () => {
  const currentPiece = { ...createPiece("T"), x: 7, y: 12, rotation: 2 };
  const result = getHoldResult(currentPiece, "L", createPiece("I"));

  assert.equal(result.holdPieceType, "T");
  assert.equal(result.currentPiece.type, "L");
  assert.equal(result.currentPiece.x, 3);
  assert.equal(result.currentPiece.y, 0);
  assert.equal(result.currentPiece.rotation, 0);
  assert.equal(result.consumesNextPiece, false);
});

test("hold is blocked after use until the next piece is allowed to hold", () => {
  const result = getHoldResult(createPiece("T"), "L", createPiece("I"), false);

  assert.equal(result, null);
});

test("hold is blocked once the piece has landed on the stack", () => {
  const result = getHoldResult(createPiece("T"), "L", createPiece("I"), true, true);

  assert.equal(result, null);
});

test("hold still works while the piece is falling, before it lands", () => {
  const result = getHoldResult(createPiece("T"), "L", createPiece("I"), true, false);

  assert.notEqual(result, null);
});

test("lock delay starts on landing and settles only after the grace period", () => {
  const landed = advanceLockState({
    isResting: true,
    isLanded: false,
    lockTimer: 0,
    elapsed: 16,
  });
  const almostLocked = advanceLockState({
    isResting: true,
    isLanded: landed.isLanded,
    lockTimer: landed.lockTimer,
    elapsed: LOCK_DELAY - 1,
  });
  const locked = advanceLockState({
    isResting: true,
    isLanded: almostLocked.isLanded,
    lockTimer: almostLocked.lockTimer,
    elapsed: 1,
  });

  assert.deepEqual(landed, { isLanded: true, lockTimer: 0, shouldLock: false });
  assert.equal(almostLocked.shouldLock, false);
  assert.equal(locked.shouldLock, true);
});

test("a landed move resets lock delay and leaving the surface clears it", () => {
  const reset = advanceLockState({
    isResting: true,
    isLanded: true,
    lockTimer: 420,
    elapsed: 16,
    resetRequested: true,
  });
  const unsupported = advanceLockState({
    isResting: false,
    isLanded: true,
    lockTimer: 420,
    elapsed: 16,
  });

  assert.deepEqual(reset, { isLanded: true, lockTimer: 0, shouldLock: false });
  assert.deepEqual(unsupported, { isLanded: false, lockTimer: 0, shouldLock: false });
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
