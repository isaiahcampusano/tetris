const DEFAULT_COLOR = "#ffffff";
const PARTICLES_PER_CELL = 6;

export class Particle {
  constructor({ x, y, velocityX, velocityY, color, size, lifetime, gravity }) {
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.lifetime = lifetime;
    this.remainingLifetime = lifetime;
    this.gravity = gravity;
  }

  update(deltaTime) {
    const elapsed = Math.max(0, deltaTime);
    const seconds = elapsed / 1000;

    this.x += this.velocityX * seconds;
    this.y += this.velocityY * seconds;
    this.velocityY += this.gravity * seconds;
    this.remainingLifetime = Math.max(0, this.remainingLifetime - elapsed);
    this.size = this.initialSize * (this.remainingLifetime / this.lifetime);
  }

  get isAlive() {
    return this.remainingLifetime > 0;
  }
}

/**
 * Burst colored shards from every cell in each cleared row. The optional final
 * argument contains the cleared cell colors and keeps the public five-argument
 * API useful for callers that only know the affected row indices.
 */
export function spawnRowClearParticles(
  rowIndices,
  boardWidth,
  boardHeight,
  cellSize,
  particlesArray,
  clearedRows = [],
) {
  if (!Array.isArray(rowIndices) || !Array.isArray(particlesArray) || cellSize <= 0) {
    return;
  }

  rowIndices.forEach((rowIndex, clearedRowIndex) => {
    if (rowIndex < 0 || rowIndex >= boardHeight) {
      return;
    }

    const rowColors = clearedRows[clearedRowIndex] ?? [];
    const centerX = (boardWidth * cellSize) / 2;

    for (let column = 0; column < boardWidth; column += 1) {
      const color = rowColors[column] ?? DEFAULT_COLOR;

      for (let count = 0; count < PARTICLES_PER_CELL; count += 1) {
        const x = (column + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.6;
        const y = (rowIndex + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.5;
        const direction = Math.sign(x - centerX) || (Math.random() < 0.5 ? -1 : 1);
        const horizontalSpeed = 90 + Math.random() * 180;

        particlesArray.push(new Particle({
          x,
          y,
          velocityX: direction * horizontalSpeed + (Math.random() - 0.5) * 80,
          velocityY: -80 - Math.random() * 220,
          color,
          size: cellSize * (0.12 + Math.random() * 0.16),
          lifetime: 300 + Math.random() * 200,
          gravity: 520,
        }));
      }
    }
  });
}

export function updateParticles(particlesArray, deltaTime) {
  if (!Array.isArray(particlesArray)) {
    return false;
  }

  for (let index = particlesArray.length - 1; index >= 0; index -= 1) {
    particlesArray[index].update(deltaTime);

    if (!particlesArray[index].isAlive) {
      particlesArray.splice(index, 1);
    }
  }

  return particlesArray.length > 0;
}

export function renderParticles(context, particlesArray) {
  if (!context || !Array.isArray(particlesArray) || particlesArray.length === 0) {
    return;
  }

  context.save();
  context.globalCompositeOperation = "lighter";

  particlesArray.forEach((particle) => {
    const opacity = particle.remainingLifetime / particle.lifetime;
    context.globalAlpha = opacity;
    context.fillStyle = particle.color;
    context.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size,
    );
  });

  context.restore();
}
