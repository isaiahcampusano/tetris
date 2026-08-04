# Neon Stack

Neon Stack is a dependency-free, browser-based falling-block puzzle game built with semantic HTML, responsive CSS, Canvas, and vanilla JavaScript modules. It is ready to serve as a static site or deploy with GitHub Pages.

## Features

- 10 × 20 game board rendered on Canvas
- All seven standard tetrominoes using a shuffled seven-piece bag
- Clockwise rotation with basic wall and floor kicks
- Collision detection, piece locking, and multi-row clearing
- Standard line-clear scoring plus soft- and hard-drop bonuses
- Level progression every 10 lines and increasingly fast automatic drops
- Next-piece preview, game-over state, and full restart behavior
- Keyboard controls with page scrolling disabled during play
- Responsive desktop, tablet, and narrow-screen layout

## Controls

| Action | Keys |
| --- | --- |
| Move left | Left Arrow or `A` |
| Move right | Right Arrow or `D` |
| Soft drop | Down Arrow or `S` |
| Rotate clockwise | Up Arrow or `W` |
| Hard drop | Spacebar |
| Restart after game over | `R` |

The **Restart game** button can restart a game at any time.

## Project structure

```text
.
├── index.html
├── styles.css
├── src/
│   ├── board.js
│   ├── controls.js
│   ├── game.js
│   └── pieces.js
├── test/
│   ├── board.test.js
│   ├── controls.test.js
│   ├── game.test.js
│   └── pieces.test.js
├── package.json
└── README.md
```

## Run locally

ES modules need to be served over HTTP. From the repository directory, use any local static server, for example:

```sh
npx serve .
```

Then open the local URL printed in the terminal. VS Code's Live Server extension or `python -m http.server` work as well.

## Run tests

The automated logic tests use Node's built-in test runner and install no dependencies:

```sh
npm test
```

Node.js 20 or newer is recommended.

## Deploy with GitHub Pages

1. Open the repository's **Settings** on GitHub.
2. Select **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch to publish and the repository root (`/`).
5. Save and wait for GitHub to provide the site URL.

All paths are relative, so the game works from a GitHub Pages project subdirectory.

## Current limitations

- Rotation uses basic kicks rather than the complete Super Rotation System.
- There is no hold queue, ghost piece, touch input, sound, or saved high score.
- Gameplay pauses only when the page itself is suspended; there is no manual pause control.

## Possible next steps

- Add a hold-piece slot and ghost-piece projection.
- Add accessible touch controls for phones and tablets.
- Persist high scores in local storage.
- Add a pause state, sound effects, and configurable controls.
