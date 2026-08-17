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
  const heldActionsByKey = {
    ArrowLeft: gameActions.setMoveLeftHeld,
    a: gameActions.setMoveLeftHeld,
    ArrowRight: gameActions.setMoveRightHeld,
    d: gameActions.setMoveRightHeld,
    ArrowDown: gameActions.setSoftDropHeld,
    s: gameActions.setSoftDropHeld,
  };

  function handleKeydown(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const isSpace = event.code === "Space" || key === " " || key === "Spacebar";

    if (!GAME_KEYS.has(key) && !isSpace) {
      return;
    }

    event.preventDefault();

    if (event.repeat) {
      return;
    }

    if (heldActionsByKey[key]) {
      heldActionsByKey[key](true);
      return;
    }

    if (isSpace) {
      gameActions.hardDrop();
      return;
    }

    const actionsByKey = {
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

  function handleKeyup(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const action = heldActionsByKey[key];

    if (!action) {
      return;
    }

    event.preventDefault();
    action(false);
  }

  target.addEventListener("keydown", handleKeydown);
  target.addEventListener("keyup", handleKeyup);

  return () => {
    target.removeEventListener("keydown", handleKeydown);
    target.removeEventListener("keyup", handleKeyup);
    gameActions.setMoveLeftHeld(false);
    gameActions.setMoveRightHeld(false);
    gameActions.setSoftDropHeld(false);
  };
}
