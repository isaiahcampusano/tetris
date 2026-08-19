import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clearFullRows,
  createBoard,
  isValidPosition,
  lockPiece,
} from "./board.js";
import { createPiece, getRandomPiece, resetPieceBag, rotate as rotatePiece } from "./pieces.js";
import { setupControls } from "./controls.js";
import {
  renderParticles,
  spawnRowClearParticles,
  updateParticles,
} from "./particles.js";

export const LINE_CLEAR_POINTS = Object.freeze([0, 100, 300, 500, 800]);
export const SOFT_DROP_INTERVAL = 40;
export const HORIZONTAL_DAS_DELAY = 170;
export const HORIZONTAL_ARR_INTERVAL = 40;
export const LOCK_DELAY = 500;

export function getLineClearScore(rowsCleared, level) {
  return (LINE_CLEAR_POINTS[rowsCleared] ?? 0) * level;
}

export function getLevel(linesCleared) {
  return Math.floor(linesCleared / 10) + 1;
}

export function getDropInterval(level) {
  return Math.max(100, 1000 - (level - 1) * 75);
}

export function getGhostPosition(piece, board) {
  let ghostY = piece.y;

  while (isValidPosition(piece.shape, piece.x, ghostY + 1, board)) {
    ghostY += 1;
  }

  return ghostY;
}

export function isRestingOnSurface(piece, board) {
  return !isValidPosition(piece.shape, piece.x, piece.y + 1, board);
}

export function getHoldResult(currentPiece, holdPieceType, nextPiece, canHold = true) {
  if (!canHold || !currentPiece) {
    return null;
  }

  return {
    currentPiece: holdPieceType === null ? nextPiece : createPiece(holdPieceType),
    holdPieceType: currentPiece.type,
    consumesNextPiece: holdPieceType === null,
  };
}

export function advanceLockState({
  isResting,
  isLanded,
  lockTimer,
  elapsed,
  lockDelay = LOCK_DELAY,
  resetRequested = false,
}) {
  if (!isResting) {
    return { isLanded: false, lockTimer: 0, shouldLock: false };
  }

  if (!isLanded || resetRequested) {
    return { isLanded: true, lockTimer: 0, shouldLock: false };
  }

  const nextLockTimer = lockTimer + Math.max(0, elapsed);
  return {
    isLanded: true,
    lockTimer: nextLockTimer,
    shouldLock: nextLockTimer >= lockDelay,
  };
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
  softDropHeld: false,
  moveLeftHeld: false,
  moveRightHeld: false,
  horizontalMoveDirection: 0,
  horizontalMoveStartTime: null,
  lastHorizontalMoveTime: null,
  lastSoftDropTime: null,
  holdPieceType: null,
  canHold: true,
  lockTimer: 0,
  lockDelay: LOCK_DELAY,
  isLanded: false,
  lockResetRequested: false,
  lastFrameTime: null,
  animationFrameId: null,
  particles: [],
};

let elements = null;

function getElements() {
  return {
    board: document.getElementById("board"),
    score: document.getElementById("score-display"),
    level: document.getElementById("level-display"),
    lines: document.getElementById("lines-display"),
    nextPiece: document.getElementById("next-piece"),
    holdPiece: document.getElementById("hold-piece"),
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

function resetLockState() {
  state.lockTimer = 0;
  state.isLanded = false;
  state.lockResetRequested = false;
}

function resetLockAfterSuccessfulAction(wasLanded) {
  if (!wasLanded) {
    return;
  }

  state.lockTimer = 0;
  state.isLanded = isRestingOnSurface(state.currentPiece, state.board);
  state.lockResetRequested = state.isLanded;
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

  const wasLanded = state.isLanded;
  state.currentPiece.x = nextX;
  state.currentPiece.y = nextY;
  resetLockAfterSuccessfulAction(wasLanded);
  return true;
}

function spawnNextPiece() {
  state.currentPiece = state.nextPiece;
  state.nextPiece = getRandomPiece();
  state.lastDropTime = typeof performance === "undefined" ? 0 : performance.now();
  resetLockState();

  if (!isValidPosition(state.currentPiece.shape, state.currentPiece.x, state.currentPiece.y, state.board)) {
    finishGame();
  }
}

function settleCurrentPiece() {
  state.board = lockPiece(state.currentPiece, state.board);

  const result = clearFullRows(state.board);

  if (result.rowsCleared > 0 && elements?.board) {
    const cellSize = elements.board.width / BOARD_WIDTH;
    spawnRowClearParticles(
      result.clearedRowIndices,
      BOARD_WIDTH,
      BOARD_HEIGHT,
      cellSize,
      state.particles,
      result.clearedRows,
    );
  }

  state.board = result.board;
  state.score += getLineClearScore(result.rowsCleared, state.level);
  state.linesCleared += result.rowsCleared;
  state.level = getLevel(state.linesCleared);
  state.dropInterval = getDropInterval(state.level);
  state.canHold = true;

  spawnNextPiece();
  render();
}

function automaticDrop() {
  move(0, 1);
}

function finishGame() {
  state.gameOver = true;
  state.running = false;
  state.particles = [];

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
  state.softDropHeld = false;
  state.moveLeftHeld = false;
  state.moveRightHeld = false;
  state.horizontalMoveDirection = 0;
  state.horizontalMoveStartTime = null;
  state.lastHorizontalMoveTime = null;
  state.lastSoftDropTime = null;
  state.holdPieceType = null;
  state.canHold = true;
  state.lockDelay = LOCK_DELAY;
  state.lastFrameTime = null;
  resetLockState();
  state.animationFrameId = null;
  state.particles = [];

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
  }
}

export function setSoftDropHeld(isHeld, initialAction = softDrop) {
  if (state.softDropHeld === isHeld) {
    return;
  }

  state.softDropHeld = isHeld;
  state.lastSoftDropTime = null;

  if (isHeld) {
    initialAction();
  }
}

function setHorizontalMoveHeld(direction, isHeld, initialAction) {
  const heldKey = direction < 0 ? "moveLeftHeld" : "moveRightHeld";

  if (state[heldKey] === isHeld) {
    return;
  }

  state[heldKey] = isHeld;

  if (isHeld) {
    state.horizontalMoveDirection = direction;
    state.horizontalMoveStartTime = null;
    state.lastHorizontalMoveTime = null;
    initialAction();
    return;
  }

  if (state.horizontalMoveDirection !== direction) {
    return;
  }

  const fallbackDirection = state.moveLeftHeld ? -1 : state.moveRightHeld ? 1 : 0;
  state.horizontalMoveDirection = fallbackDirection;
  state.horizontalMoveStartTime = null;
  state.lastHorizontalMoveTime = null;
}

export function setMoveLeftHeld(isHeld, initialAction = moveLeft) {
  setHorizontalMoveHeld(-1, isHeld, initialAction);
}

export function setMoveRightHeld(isHeld, initialAction = moveRight) {
  setHorizontalMoveHeld(1, isHeld, initialAction);
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

export function hold() {
  const result = getHoldResult(
    state.currentPiece,
    state.holdPieceType,
    state.nextPiece,
    state.running && state.canHold,
  );

  if (!result) {
    return;
  }
  state.holdPieceType = result.holdPieceType;

  if (result.consumesNextPiece) {
    spawnNextPiece();
  } else {
    state.currentPiece = result.currentPiece;
    state.lastDropTime = typeof performance === "undefined" ? 0 : performance.now();
    resetLockState();

    if (!isValidPosition(
      state.currentPiece.shape,
      state.currentPiece.x,
      state.currentPiece.y,
      state.board,
    )) {
      finishGame();
    }
  }

  state.canHold = false;
  render();
}

export function rotate() {
  if (!state.running || !state.currentPiece) {
    return;
  }

  const previousPiece = state.currentPiece;
  const wasLanded = state.isLanded;
  state.currentPiece = rotatePiece(state.currentPiece, state.board);

  if (state.currentPiece !== previousPiece) {
    resetLockAfterSuccessfulAction(wasLanded);
  }
}

export function isGameOver() {
  return state.gameOver;
}

export const gameActions = Object.freeze({
  moveLeft,
  moveRight,
  softDrop,
  setMoveLeftHeld,
  setMoveRightHeld,
  setSoftDropHeld,
  hardDrop,
  hold,
  rotate,
  restart,
  isGameOver,
});

export function processHeldInput(timestamp, actions = { moveLeft, moveRight, softDrop }) {
  if (state.softDropHeld) {
    if (state.lastSoftDropTime === null) {
      state.lastSoftDropTime = timestamp;
    } else if (timestamp - state.lastSoftDropTime >= SOFT_DROP_INTERVAL) {
      actions.softDrop();
      state.lastSoftDropTime = timestamp;
    }
  }

  if (state.horizontalMoveDirection === 0) {
    return;
  }

  if (state.horizontalMoveStartTime === null) {
    state.horizontalMoveStartTime = timestamp;
    state.lastHorizontalMoveTime = timestamp;
    return;
  }

  if (timestamp - state.horizontalMoveStartTime < HORIZONTAL_DAS_DELAY) {
    return;
  }

  if (timestamp - state.lastHorizontalMoveTime < HORIZONTAL_ARR_INTERVAL) {
    return;
  }

  (state.horizontalMoveDirection < 0 ? actions.moveLeft : actions.moveRight)();
  state.lastHorizontalMoveTime = timestamp;
}

function processLockDelay(elapsed) {
  if (!state.currentPiece) {
    return;
  }

  const nextLockState = advanceLockState({
    isResting: isRestingOnSurface(state.currentPiece, state.board),
    isLanded: state.isLanded,
    lockTimer: state.lockTimer,
    elapsed,
    lockDelay: state.lockDelay,
    resetRequested: state.lockResetRequested,
  });

  state.isLanded = nextLockState.isLanded;
  state.lockTimer = nextLockState.lockTimer;
  state.lockResetRequested = false;

  if (nextLockState.shouldLock) {
    settleCurrentPiece();
  }
}

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

function drawGhostPiece(context, piece, ghostY, cellSize) {
  const inset = 3;
  context.save();
  context.globalAlpha = 0.45;
  context.strokeStyle = piece.color;
  context.lineWidth = 2;

  piece.shape.forEach((row, shapeY) => {
    row.forEach((occupied, shapeX) => {
      const y = ghostY + shapeY;
      if (occupied && y >= 0) {
        context.strokeRect(
          (piece.x + shapeX) * cellSize + inset,
          y * cellSize + inset,
          cellSize - inset * 2,
          cellSize - inset * 2,
        );
      }
    });
  });

  context.restore();
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

  if (state.running) {
    drawGhostPiece(
      context,
      state.currentPiece,
      getGhostPosition(state.currentPiece, state.board),
      cellSize,
    );
  }

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

  renderParticles(context, state.particles);
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

function drawPreviewPiece(canvas, piece) {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const previewCells = 5;
  const cellSize = canvas.width / previewCells;
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!piece) {
    return;
  }

  const bounds = getOccupiedBounds(piece.shape);
  const pieceWidth = bounds.maxX - bounds.minX + 1;
  const pieceHeight = bounds.maxY - bounds.minY + 1;
  const offsetX = (previewCells - pieceWidth) / 2 - bounds.minX;
  const offsetY = (previewCells - pieceHeight) / 2 - bounds.minY;

  piece.shape.forEach((row, y) => {
    row.forEach((occupied, x) => {
      if (occupied) {
        drawCell(context, x + offsetX, y + offsetY, piece.color, cellSize);
      }
    });
  });
}

function drawNextPiece() {
  drawPreviewPiece(elements?.nextPiece, state.nextPiece);
}

function drawHoldPiece() {
  const heldPiece = state.holdPieceType === null ? null : createPiece(state.holdPieceType);
  drawPreviewPiece(elements?.holdPiece, heldPiece);
}

function render() {
  if (!elements) {
    return;
  }

  drawBoard();
  drawNextPiece();
  drawHoldPiece();
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

  const elapsed = state.lastFrameTime === null ? 0 : timestamp - state.lastFrameTime;
  state.lastFrameTime = timestamp;

  updateParticles(state.particles, elapsed);

  processHeldInput(timestamp);

  if (timestamp - state.lastDropTime >= state.dropInterval) {
    automaticDrop();
    state.lastDropTime = timestamp;
  }

  processLockDelay(elapsed);

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
