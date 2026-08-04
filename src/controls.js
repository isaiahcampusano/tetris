const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "a",
  "d",
  "s",
  "w",
  "r",
  " ",
  "Spacebar",
]);

/**
 * Connect keyboard controls to a game controller without putting game rules here.
 * Returns a cleanup function, which is useful if the game is embedded elsewhere.
 */
export function setupControls(gameActions, target = document) {
  function handleKeydown(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const isSpace = event.code === "Space" || key === " " || key === "Spacebar";

    if (!GAME_KEYS.has(key) && !isSpace) {
      return;
    }

    event.preventDefault();

    if (isSpace) {
      gameActions.hardDrop();
      return;
    }

    const actionsByKey = {
      ArrowLeft: gameActions.moveLeft,
      a: gameActions.moveLeft,
      ArrowRight: gameActions.moveRight,
      d: gameActions.moveRight,
      ArrowDown: gameActions.softDrop,
      s: gameActions.softDrop,
      ArrowUp: gameActions.rotate,
      w: gameActions.rotate,
    };

    if (key === "r") {
      if (gameActions.isGameOver()) {
        gameActions.restart();
      }
      return;
    }

    actionsByKey[key]?.();
  }

  target.addEventListener("keydown", handleKeydown);
  return () => target.removeEventListener("keydown", handleKeydown);
}
