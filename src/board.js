export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

/**
 * Create a new board whose cells are null until a tetromino is locked.
 */
export function createBoard(width = BOARD_WIDTH, height = BOARD_HEIGHT) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new RangeError("Board dimensions must be positive integers.");
  }

  return Array.from({ length: height }, () => Array(width).fill(null));
}

/**
 * Check whether every occupied cell in a shape fits at the requested position.
 * Occupied cells above the visible board are allowed so pieces can enter cleanly.
 */
export function isValidPosition(shape, x, y, board) {
  if (!Array.isArray(shape) || !Array.isArray(board) || board.length === 0) {
    return false;
  }

  const width = board[0].length;
  const height = board.length;

  for (let row = 0; row < shape.length; row += 1) {
    for (let column = 0; column < shape[row].length; column += 1) {
      if (!shape[row][column]) {
        continue;
      }

      const boardX = x + column;
      const boardY = y + row;

      if (boardX < 0 || boardX >= width || boardY >= height) {
        return false;
      }

      if (boardY >= 0 && board[boardY][boardX] !== null) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Merge a piece into a cloned board so callers never receive a partial mutation.
 */
export function lockPiece(piece, board) {
  const updatedBoard = board.map((row) => [...row]);

  for (let row = 0; row < piece.shape.length; row += 1) {
    for (let column = 0; column < piece.shape[row].length; column += 1) {
      if (!piece.shape[row][column]) {
        continue;
      }

      const boardX = piece.x + column;
      const boardY = piece.y + row;

      if (boardY >= 0 && boardY < updatedBoard.length && boardX >= 0 && boardX < updatedBoard[0].length) {
        updatedBoard[boardY][boardX] = piece.color;
      }
    }
  }

  return updatedBoard;
}

/**
 * Remove full rows and replace them with empty rows at the top of the board.
 */
export function clearFullRows(board) {
  if (!Array.isArray(board) || board.length === 0) {
    return { board: [], rowsCleared: 0, clearedRowIndices: [], clearedRows: [] };
  }

  const width = board[0].length;
  const clearedRowIndices = [];
  const clearedRows = [];

  board.forEach((row, index) => {
    if (row.every((cell) => cell !== null)) {
      clearedRowIndices.push(index);
      clearedRows.push([...row]);
    }
  });

  const remainingRows = board.filter((row) => row.some((cell) => cell === null));
  const rowsCleared = clearedRowIndices.length;
  const emptyRows = Array.from({ length: rowsCleared }, () => Array(width).fill(null));

  return {
    board: [...emptyRows, ...remainingRows.map((row) => [...row])],
    rowsCleared,
    clearedRowIndices,
    clearedRows,
  };
}
