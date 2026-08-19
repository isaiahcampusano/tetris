export const MIN_SCORE = 50_000;
export const LAST_GAMERTAG_KEY = "tetris_last_gamertag";

function getApiUrl() {
  return `${globalThis.NEON_STACK_API_URL ?? ""}/api/scores`;
}

async function parseLeaderboardResponse(response, fallbackMessage) {
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error ?? fallbackMessage);
  }
  return response.json();
}

export async function getHighScores() {
  const response = await fetch(getApiUrl());
  return parseLeaderboardResponse(response, "Failed to load leaderboard");
}

export function qualifiesForLeaderboard(score) {
  return score >= MIN_SCORE;
}

export async function addHighScore(gamertag, score, level, linesCleared) {
  const normalizedGamertag = gamertag.trim() || "Player";
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gamertag: normalizedGamertag, score, level, linesCleared }),
  });
  const leaderboard = await parseLeaderboardResponse(response, "Failed to save score");
  saveLastGamertag(normalizedGamertag);
  return leaderboard;
}

export async function clearAllScores() {
  const response = await fetch(getApiUrl(), { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to clear scores");
  }
}

export function getLastGamertag() {
  try {
    return localStorage.getItem(LAST_GAMERTAG_KEY) || "";
  } catch {
    return "";
  }
}

export function saveLastGamertag(gamertag) {
  try {
    localStorage.setItem(LAST_GAMERTAG_KEY, gamertag.trim());
  } catch {
    // Remembering the name is optional when browser storage is unavailable.
  }
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
