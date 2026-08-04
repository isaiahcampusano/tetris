import test from "node:test";
import assert from "node:assert/strict";

import { setupControls } from "../src/controls.js";

class FakeEventTarget {
  listener = null;

  addEventListener(type, listener) {
    assert.equal(type, "keydown");
    this.listener = listener;
  }

  removeEventListener(type, listener) {
    assert.equal(type, "keydown");
    if (this.listener === listener) {
      this.listener = null;
    }
  }

  press(key, code = "") {
    let prevented = false;
    this.listener({
      key,
      code,
      preventDefault() {
        prevented = true;
      },
    });
    return prevented;
  }
}

test("game keys prevent browser defaults and call their matching actions", () => {
  const calls = [];
  const target = new FakeEventTarget();
  const actions = {
    moveLeft: () => calls.push("left"),
    moveRight: () => calls.push("right"),
    softDrop: () => calls.push("soft"),
    hardDrop: () => calls.push("hard"),
    rotate: () => calls.push("rotate"),
    restart: () => calls.push("restart"),
    isGameOver: () => true,
  };
  const cleanup = setupControls(actions, target);

  assert.equal(target.press("ArrowLeft"), true);
  assert.equal(target.press("D"), true);
  assert.equal(target.press("s"), true);
  assert.equal(target.press("w"), true);
  assert.equal(target.press(" ", "Space"), true);
  assert.equal(target.press("r"), true);
  assert.deepEqual(calls, ["left", "right", "soft", "rotate", "hard", "restart"]);

  cleanup();
  assert.equal(target.listener, null);
});

test("unmapped keys pass through and restart is ignored during play", () => {
  const calls = [];
  const target = new FakeEventTarget();
  setupControls(
    {
      moveLeft: () => calls.push("left"),
      moveRight: () => calls.push("right"),
      softDrop: () => calls.push("soft"),
      hardDrop: () => calls.push("hard"),
      rotate: () => calls.push("rotate"),
      restart: () => calls.push("restart"),
      isGameOver: () => false,
    },
    target,
  );

  assert.equal(target.press("x"), false);
  assert.equal(target.press("r"), true);
  assert.deepEqual(calls, []);
});
