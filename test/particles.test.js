import test from "node:test";
import assert from "node:assert/strict";

import {
  Particle,
  spawnRowClearParticles,
  updateParticles,
} from "../src/particles.js";

test("row clear particles use the colors of the cleared cells", () => {
  const particles = [];
  const colors = Array.from({ length: 10 }, (_, index) => `color-${index}`);

  spawnRowClearParticles([19], 10, 20, 30, particles, [colors]);

  assert.equal(particles.length, 60);
  assert.deepEqual(new Set(particles.map((particle) => particle.color)), new Set(colors));
  assert.ok(particles.every((particle) => particle.y > 570 && particle.y < 600));
});

test("particles move, shrink, and expire in place", () => {
  const particles = [new Particle({
    x: 10,
    y: 10,
    velocityX: 100,
    velocityY: -100,
    color: "#fff",
    size: 10,
    lifetime: 400,
    gravity: 500,
  })];

  assert.equal(updateParticles(particles, 100), true);
  assert.equal(particles[0].x, 20);
  assert.ok(particles[0].y < 10);
  assert.equal(particles[0].size, 7.5);

  assert.equal(updateParticles(particles, 300), false);
  assert.deepEqual(particles, []);
});
