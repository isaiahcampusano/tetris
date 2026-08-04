import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clearFullRows,
  createBoard,
  isValidPosition,
  lockPiece,
} from "./board.js";
import { getRandomPiece, resetPieceBag, rotate as rotatePiece } from "./pieces.js";
import { setupControls } from "./controls.js";

export const LINE_CLEAR_POINTS = Object.freeze([0, 100, 300, 500, 800]);

export function getLineClearScore(rowsCleared, level) {
  return (LINE_CLEAR_POINTS[rowsCleared] ?? 0) * level;
}

export function getLevel(linesCleared) {
  return Math.floor(linesCleared / 10) + 1;
}

export function getDropInterval(level) {
  return Math.max(100, 1000 - (level - 1) * 75);
}

const state = {
  board: createBoard(),
  currentPiece: null,
  nextPiece: null,
  score: 0,
  level: 1,
  linesCleared: 0,
  gameOver: false,
  running: false,
  dropInterval: getDropInterval(1),
  lastDropTime: 0,
  animationFrameId: null,
};

let elements = null;

function getElements() {
  return {
    board: document.getElementById("board"),
    score: document.getElementById("score-display"),
    level: document.getElementById("level-display"),
    lines: document.getElementById("lines-display"),
    nextPiece: document.getElementById("next-piece"),
    restartButton: document.getElementById("restart-button"),
    gameOver: document.getElementById("game-over"),
  };
}

function assertRequiredElements(domElements) {
  for (const [name, element] of Object.entries(domElements)) {
    if (!element) {
      throw new Error(`Missing required game element: ${name}`);
    }
  }
}

function move(dx, dy) {
  if (!state.running || !state.currentPiece) {
    return false;
  }

  const nextX = state.currentPiece.x + dx;
  const nextY = state.currentPiece.y + dy;

  if (!isValidPosition(state.currentPiece.shape, nextX, nextY, state.board)) {
    return false;
  }

  state.currentPiece.x = nextX;
  state.currentPiece.y = nextY;
  return true;
}

function spawnNextPiece() {
  state.currentPiece = state.nextPiece;
  state.nextPiece = getRandomPiece();
  state.lastDropTime = typeof performance === "undefined" ? 0 : performance.now();

  if (!isValidPosition(state.currentPiece.shape, state.currentPiece.x, state.currentPiece.y, state.board)) {
    finishGame();
  }
}

function settleCurrentPiece() {
  state.board = lockPiece(state.currentPiece, state.board);

  const result = clearFullRows(state.board);
  state.board = result.board;
  state.score += getLineClearScore(result.rowsCleared, state.level);
  state.linesCleared += result.rowsCleared;
  state.level = getLevel(state.linesCleared);
  state.dropInterval = getDropInterval(state.level);

  spawnNextPiece();
  render();
}

function automaticDrop() {
  if (!move(0, 1)) {
    settleCurrentPiece();
  }
}

function finishGame() {
  state.gameOver = true;
  state.running = false;

  if (elements) {
    elements.gameOver.hidden = false;
    elements.gameOver.setAttribute("aria-hidden", "false");
  }
}

export function restart() {
  if (state.animationFrameId !== null && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(state.animationFrameId);
  }

  resetPieceBag();
  state.board = createBoard();
  state.currentPiece = getRandomPiece();
  state.nextPiece = getRandomPiece();
  state.score = 0;
  state.level = 1;
  state.linesCleared = 0;
  state.gameOver = false;
  state.running = true;
  state.dropInterval = getDropInterval(1);
  state.lastDropTime = 0;
  state.animationFrameId = null;

  if (elements) {
    elements.gameOver.hidden = true;
    elements.gameOver.setAttribute("aria-hidden", "true");
  }

  render();

  if (typeof requestAnimationFrame !== "undefined") {
    state.animationFrameId = requestAnimationFrame(gameLoop);
  }
}

export function moveLeft() {
  move(-1, 0);
}

export function moveRight() {
  move(1, 0);
}

export function softDrop() {
  if (!state.running) {
    return;
  }

  if (move(0, 1)) {
    state.score += 1;
  } else {
    settleCurrentPiece();
  }
}

export function hardDrop() {
  if (!state.running) {
    return;
  }

  let distance = 0;
  while (move(0, 1)) {
    distance += 1;
  }

  state.score += distance * 2;
  settleCurrentPiece();
}

export function rotate() {
  if (!state.running || !state.currentPiece) {
    return;
  }

  state.currentPiece = rotatePiece(state.currentPiece, state.board);
}

export function isGameOver() {
  return state.gameOver;
}

export const gameActions = Object.freeze({
  moveLeft,
  moveRight,
  softDrop,
  hardDrop,
  rotate,
  restart,
  isGameOver,
});

function drawCell(context, x, y, color, cellSize) {
  const inset = 1;
  context.fillStyle = color;
  context.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);

  const highlight = context.createLinearGradient(
    x * cellSize,
    y * cellSize,
    (x + 1) * cellSize,
    (y + 1) * cellSize,
  );
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  highlight.addColorStop(0.45, "rgba(255, 255, 255, 0)");
  highlight.addColorStop(1, "rgba(0, 0, 0, 0.28)");
  context.fillStyle = highlight;
  context.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
}

function drawGrid(context, width, height, cellSize) {
  context.fillStyle = "#090d1a";
  context.fillRect(0, 0, width * cellSize, height * cellSize);
  context.strokeStyle = "rgba(148, 163, 184, 0.1)";
  context.lineWidth = 1;

  for (let column = 0; column <= width; column += 1) {
    context.beginPath();
    context.moveTo(column * cellSize + 0.5, 0);
    context.lineTo(column * cellSize + 0.5, height * cellSize);
    context.stroke();
  }

  for (let row = 0; row <= height; row += 1) {
    context.beginPath();
    context.moveTo(0, row * cellSize + 0.5);
    context.lineTo(width * cellSize, row * cellSize + 0.5);
    context.stroke();
  }
}

function drawBoard() {
  if (!elements?.board || !state.currentPiece) {
    return;
  }

  const canvas = elements.board;
  const context = canvas.getContext("2d");
  const cellSize = canvas.width / BOARD_WIDTH;
  drawGrid(context, BOARD_WIDTH, BOARD_HEIGHT, cellSize);

  state.board.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color) {
        drawCell(context, x, y, color, cellSize);
      }
    });
  });

  state.currentPiece.shape.forEach((row, shapeY) => {
    row.forEach((occupied, shapeX) => {
      const y = state.currentPiece.y + shapeY;
      if (occupied && y >= 0) {
        drawCell(
          context,
          state.currentPiece.x + shapeX,
          y,
          state.currentPiece.color,
          cellSize,
        );
      }
    });
  });
}

function getOccupiedBounds(shape) {
  const cells = [];
  shape.forEach((row, y) => {
    row.forEach((occupied, x) => {
      if (occupied) {
        cells.push({ x, y });
      }
    });
  });

  return {
    minX: Math.min(...cells.map((cell) => cell.x)),
    maxX: Math.max(...cells.map((cell) => cell.x)),
    minY: Math.min(...cells.map((cell) => cell.y)),
    maxY: Math.max(...cells.map((cell) => cell.y)),
  };
}

function drawNextPiece() {
  if (!elements?.nextPiece || !state.nextPiece) {
    return;
  }

  const canvas = elements.nextPiece;
  const context = canvas.getContext("2d");
  const previewCells = 5;
  const cellSize = canvas.width / previewCells;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const bounds = getOccupiedBounds(state.nextPiece.shape);
  const pieceWidth = bounds.maxX - bounds.minX + 1;
  const pieceHeight = bounds.maxY - bounds.minY + 1;
  const offsetX = (previewCells - pieceWidth) / 2 - bounds.minX;
  const offsetY = (previewCells - pieceHeight) / 2 - bounds.minY;

  state.nextPiece.shape.forEach((row, y) => {
    row.forEach((occupied, x) => {
      if (occupied) {
        drawCell(context, x + offsetX, y + offsetY, state.nextPiece.color, cellSize);
      }
    });
  });
}

function render() {
  if (!elements) {
    return;
  }

  drawBoard();
  drawNextPiece();
  elements.score.textContent = String(state.score);
  elements.level.textContent = String(state.level);
  elements.lines.textContent = String(state.linesCleared);
}

function gameLoop(timestamp) {
  if (!state.running) {
    state.animationFrameId = null;
    render();
    return;
  }

  if (state.lastDropTime === 0) {
    state.lastDropTime = timestamp;
  }

  if (timestamp - state.lastDropTime >= state.dropInterval) {
    automaticDrop();
    state.lastDropTime = timestamp;
  }

  render();
  state.animationFrameId = requestAnimationFrame(gameLoop);
}

function initialize() {
  elements = getElements();
  assertRequiredElements(elements);
  setupControls(gameActions);
  elements.restartButton.addEventListener("click", restart);
  restart();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
}
