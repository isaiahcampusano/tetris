import test from "node:test";
import assert from "node:assert/strict";

import { createBoard } from "../src/board.js";
import {
  PIECE_COLORS,
  TETROMINOES,
  TETROMINO_TYPES,
  createPiece,
  getRandomPiece,
  resetPieceBag,
  rotate,
} from "../src/pieces.js";

test("all seven tetrominoes can be created with four rotation states", () => {
  assert.deepEqual(TETROMINO_TYPES, ["I", "O", "T", "S", "Z", "J", "L"]);

  for (const type of TETROMINO_TYPES) {
    const piece = createPiece(type);
    assert.equal(piece.type, type);
    assert.equal(piece.color, PIECE_COLORS[type]);
    assert.equal(piece.x, 3);
    assert.equal(piece.y, 0);
    assert.equal(TETROMINOES[type].length, 4);
    assert.equal(piece.shape.flat().filter(Boolean).length, 4);
  }
});

test("the random generator produces every type once per seven-piece bag", () => {
  resetPieceBag();
  const types = Array.from({ length: 7 }, () => getRandomPiece().type);
  assert.deepEqual([...types].sort(), [...TETROMINO_TYPES].sort());
});

test("pieces rotate clockwise on an empty board", () => {
  const board = createBoard();

  for (const type of TETROMINO_TYPES) {
    let piece = createPiece(type);
    for (let turn = 0; turn < 4; turn += 1) {
      piece = rotate(piece, board);
      assert.equal(piece.rotation, (turn + 1) % 4);
    }
  }
});

test("rotation applies a wall kick when the rotated shape crosses the right wall", () => {
  const board = createBoard();
  const verticalPiece = rotate(createPiece("I"), board);
  verticalPiece.x = 7;

  const kickedPiece = rotate(verticalPiece, board);
  assert.equal(kickedPiece.rotation, 2);
  assert.equal(kickedPiece.x, 6);
});

test("rotation is rejected when every kick position is blocked", () => {
  const board = createBoard().map((row) => row.map(() => "occupied"));
  const piece = createPiece("T");
  const result = rotate(piece, board);
  assert.equal(result, piece);
});
