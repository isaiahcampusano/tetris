import { isValidPosition } from "./board.js";

export const TETROMINO_TYPES = Object.freeze(["I", "O", "T", "S", "Z", "J", "L"]);

export const PIECE_COLORS = Object.freeze({
  I: "#22d3ee",
  O: "#facc15",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#fb7185",
  J: "#60a5fa",
  L: "#fb923c",
});

const BASE_SHAPES = Object.freeze({
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
});

export function rotateMatrixClockwise(matrix) {
  const size = matrix.length;
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (__, column) => matrix[size - 1 - column][row]),
  );
}

function buildRotationStates(baseShape) {
  const states = [];
  let shape = baseShape.map((row) => [...row]);

  for (let rotation = 0; rotation < 4; rotation += 1) {
    states.push(shape);
    shape = rotateMatrixClockwise(shape);
  }

  return states;
}

export const TETROMINOES = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_SHAPES).map(([type, baseShape]) => [type, buildRotationStates(baseShape)]),
  ),
);

let pieceBag = [];

function refillBag() {
  pieceBag = [...TETROMINO_TYPES];

  for (let index = pieceBag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pieceBag[index], pieceBag[swapIndex]] = [pieceBag[swapIndex], pieceBag[index]];
  }
}

export function resetPieceBag() {
  pieceBag = [];
}

export function createPiece(type) {
  if (!TETROMINO_TYPES.includes(type)) {
    throw new RangeError(`Unknown tetromino type: ${type}`);
  }

  return {
    type,
    shape: TETROMINOES[type][0].map((row) => [...row]),
    rotation: 0,
    x: 3,
    y: 0,
    color: PIECE_COLORS[type],
  };
}

/**
 * Return pieces from a shuffled seven-piece bag to avoid long random droughts.
 */
export function getRandomPiece() {
  if (pieceBag.length === 0) {
    refillBag();
  }

  return createPiece(pieceBag.pop());
}

/**
 * Rotate clockwise and try a compact set of wall/floor kicks before giving up.
 */
export function rotate(piece, board) {
  const nextRotation = (piece.rotation + 1) % TETROMINOES[piece.type].length;
  const rotatedShape = TETROMINOES[piece.type][nextRotation];
  const kicks = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: -1 },
  ];

  for (const kick of kicks) {
    const candidateX = piece.x + kick.x;
    const candidateY = piece.y + kick.y;

    if (isValidPosition(rotatedShape, candidateX, candidateY, board)) {
      return {
        ...piece,
        shape: rotatedShape.map((row) => [...row]),
        rotation: nextRotation,
        x: candidateX,
        y: candidateY,
      };
    }
  }

  return piece;
}
