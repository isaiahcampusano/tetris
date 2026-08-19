import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { HighScoreStore, MIN_SCORE } from "./highScoreStore.js";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDirectory, "..");

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

export function createApp({ store = new HighScoreStore(), staticRoot = projectRoot } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/scores", async (_request, response, next) => {
    try {
      response.json(await store.getLeaderboard());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/scores", async (request, response, next) => {
    const { gamertag, score, level, linesCleared } = request.body ?? {};

    if (!isNonNegativeInteger(score) || !isNonNegativeInteger(level) || !isNonNegativeInteger(linesCleared)) {
      response.status(400).json({ error: "Score, level, and linesCleared must be non-negative integers." });
      return;
    }

    if (score < MIN_SCORE) {
      response.status(422).json({ error: `A score of at least ${MIN_SCORE} is required.` });
      return;
    }

    try {
      response.status(201).json(await store.addScore({ gamertag, score, level, linesCleared }));
    } catch (error) {
      next(error);
    }
  });

  // This hobby-project endpoint is intentionally unauthenticated. Add auth
  // before exposing it in an environment where leaderboard abuse is a concern.
  app.delete("/api/scores", async (_request, response, next) => {
    try {
      await store.clearScores();
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.use("/src", express.static(path.join(staticRoot, "src")));
  app.get(["/", "/index.html"], (_request, response) => {
    response.sendFile(path.join(staticRoot, "index.html"));
  });
  app.get("/styles.css", (_request, response) => {
    response.sendFile(path.join(staticRoot, "styles.css"));
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: "The leaderboard is temporarily unavailable." });
  });

  return app;
}
