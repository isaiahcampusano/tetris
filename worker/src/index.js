const MIN_SCORE = 50_000;
const MAX_SCORES = 20;
const ALLOWED_ORIGINS = new Set([
  "https://isaiahcampusano.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

async function getLeaderboard(database) {
  const result = await database.prepare(`
    SELECT gamertag, score, level, lines_cleared AS linesCleared, date
    FROM scores
    ORDER BY score DESC, date ASC
    LIMIT ?1
  `).bind(MAX_SCORES).all();

  return result.results.map((entry, index) => ({ rank: index + 1, ...entry }));
}

export async function handleRequest(request, environment) {
  const url = new URL(request.url);

  if (url.pathname !== "/api/scores") {
    return json(request, { error: "Not found" }, 404);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method === "GET") {
    return json(request, await getLeaderboard(environment.DB));
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const { gamertag, score, level, linesCleared } = body ?? {};

    if (!isNonNegativeInteger(score) || !isNonNegativeInteger(level) || !isNonNegativeInteger(linesCleared)) {
      return json(request, { error: "Score, level, and linesCleared must be non-negative integers." }, 400);
    }

    if (score < MIN_SCORE) {
      return json(request, { error: `A score of at least ${MIN_SCORE} is required.` }, 422);
    }

    const normalizedGamertag = typeof gamertag === "string" && gamertag.trim()
      ? gamertag.trim().slice(0, 20)
      : "Player";
    const date = new Date().toISOString();

    await environment.DB.batch([
      environment.DB.prepare(`
        INSERT INTO scores (gamertag, score, level, lines_cleared, date)
        VALUES (?1, ?2, ?3, ?4, ?5)
      `).bind(normalizedGamertag, score, level, linesCleared, date),
      environment.DB.prepare(`
        DELETE FROM scores
        WHERE id NOT IN (
          SELECT id FROM scores ORDER BY score DESC, date ASC LIMIT ?1
        )
      `).bind(MAX_SCORES),
    ]);

    return json(request, await getLeaderboard(environment.DB), 201);
  }

  if (request.method === "DELETE") {
    await environment.DB.prepare("DELETE FROM scores").run();
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  return json(request, { error: "Method not allowed" }, 405);
}

export default {
  async fetch(request, environment) {
    try {
      return await handleRequest(request, environment);
    } catch (error) {
      console.error(error);
      return json(request, { error: "The leaderboard is temporarily unavailable." }, 500);
    }
  },
};
