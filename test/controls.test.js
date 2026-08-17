import test from "node:test";
import assert from "node:assert/strict";

import { setupControls } from "../src/controls.js";

class FakeEventTarget {
  listeners = new Map();

  addEventListener(type, listener) {
    assert.ok(["keydown", "keyup"].includes(type));
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    assert.ok(["keydown", "keyup"].includes(type));
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  dispatch(type, key, code = "", repeat = false) {
    let prevented = false;
    this.listeners.get(type)({
      key,
      code,
      repeat,
      preventDefault() {
        prevented = true;
      },
    });
    return prevented;
  }

  press(key, code = "", repeat = false) {
    return this.dispatch("keydown", key, code, repeat);
  }

  release(key, code = "") {
    return this.dispatch("keyup", key, code);
  }
}

function createActions(calls, isGameOver = () => true) {
  return {
    setMoveLeftHeld: (held) => calls.push(["left", held]),
    setMoveRightHeld: (held) => calls.push(["right", held]),
    setSoftDropHeld: (held) => calls.push(["soft", held]),
    hardDrop: () => calls.push(["hard"]),
    rotate: () => calls.push(["rotate"]),
    hold: () => calls.push(["hold"]),
    restart: () => calls.push(["restart"]),
    isGameOver,
  };
}

test("game keys prevent browser defaults and call their matching actions", () => {
  const calls = [];
  const target = new FakeEventTarget();
  const actions = createActions(calls);
  const cleanup = setupControls(actions, target);

  assert.equal(target.press("ArrowLeft"), true);
  assert.equal(target.press("D"), true);
  assert.equal(target.press("s"), true);
  assert.equal(target.press("w"), true);
  assert.equal(target.press("c"), true);
  assert.equal(target.press(" ", "Space"), true);
  assert.equal(target.press("r"), true);
  assert.deepEqual(calls, [
    ["left", true],
    ["right", true],
    ["soft", true],
    ["rotate"],
    ["hold"],
    ["hard"],
    ["restart"],
  ]);

  cleanup();
  assert.equal(target.listeners.size, 0);
  assert.deepEqual(calls.slice(-3), [["left", false], ["right", false], ["soft", false]]);
});

test("unmapped keys pass through and restart is ignored during play", () => {
  const calls = [];
  const target = new FakeEventTarget();
  setupControls(
    createActions(calls, () => false),
    target,
  );

  assert.equal(target.press("x"), false);
  assert.equal(target.press("r"), true);
  assert.deepEqual(calls, []);
});

test("repeatable keys set held state once and clear it on release", () => {
  const calls = [];
  const target = new FakeEventTarget();
  setupControls(createActions(calls), target);

  assert.equal(target.press("ArrowLeft"), true);
  assert.equal(target.press("ArrowLeft", "", true), true);
  assert.equal(target.release("ArrowLeft"), true);
  assert.deepEqual(calls, [["left", true], ["left", false]]);
});

test("single-shot actions ignore native key repeat", () => {
  const calls = [];
  const target = new FakeEventTarget();
  setupControls(createActions(calls), target);

  target.press("w");
  target.press("w", "", true);
  target.press("c");
  target.press("c", "", true);
  target.press(" ", "Space");
  target.press(" ", "Space", true);
  assert.deepEqual(calls, [["rotate"], ["hold"], ["hard"]]);
});
