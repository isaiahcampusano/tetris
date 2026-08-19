import test from "node:test";
import assert from "node:assert/strict";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clearFullRows,
  createBoard,
  isValidPosition,
  lockPiece,
} from "../src/board.js";

test("createBoard creates an empty 10 by 20 board", () => {
  const board = createBoard();
  assert.equal(board.length, BOARD_HEIGHT);
  assert.ok(board.every((row) => row.length === BOARD_WIDTH));
  assert.ok(board.flat().every((cell) => cell === null));
});

test("isValidPosition enforces walls, floor, and locked cells", () => {
  const board = createBoard();
  const square = [
    [1, 1],
    [1, 1],
  ];

  assert.equal(isValidPosition(square, 0, 0, board), true);
  assert.equal(isValidPosition(square, -1, 0, board), false);
  assert.equal(isValidPosition(square, 9, 0, board), false);
  assert.equal(isValidPosition(square, 0, 19, board), false);
  assert.equal(isValidPosition(square, 0, -1, board), true);

  board[2][2] = "#fff";
  assert.equal(isValidPosition(square, 1, 1, board), false);
});

test("lockPiece returns a board with the piece merged", () => {
  const board = createBoard();
  const piece = {
    shape: [
      [1, 1],
      [1, 1],
    ],
    x: 4,
    y: 18,
    color: "#facc15",
  };

  const locked = lockPiece(piece, board);
  assert.equal(locked[18][4], piece.color);
  assert.equal(locked[19][5], piece.color);
  assert.equal(board[18][4], null, "the input board remains unchanged");
});

test("clearFullRows removes complete rows and shifts remaining cells down", () => {
  const board = createBoard();
  board[17][0] = "marker";
  board[18] = Array(BOARD_WIDTH).fill("filled");
  board[19] = Array(BOARD_WIDTH).fill("filled");

  const result = clearFullRows(board);
  assert.equal(result.rowsCleared, 2);
  assert.deepEqual(result.clearedRowIndices, [18, 19]);
  assert.deepEqual(result.clearedRows, [board[18], board[19]]);
  assert.equal(result.board.length, BOARD_HEIGHT);
  assert.equal(result.board[19][0], "marker");
  assert.ok(result.board[0].every((cell) => cell === null));
  assert.ok(result.board[1].every((cell) => cell === null));
});
