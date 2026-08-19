import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_SCORE = 50_000;
export const MAX_SCORES = 20;

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDataFile = path.join(moduleDirectory, "data", "high-scores.json");
const configuredDataFile = process.env.HIGH_SCORE_DATA_FILE || defaultDataFile;

function rankScores(scores) {
  return scores.map((entry, index) => ({ rank: index + 1, ...entry }));
}

export class HighScoreStore {
  constructor(dataFile = configuredDataFile, maxScores = MAX_SCORES) {
    this.dataFile = dataFile;
    this.maxScores = maxScores;
  }

  async readScores() {
    try {
      const contents = await readFile(this.dataFile, "utf8");
      const scores = JSON.parse(contents);
      return Array.isArray(scores) ? scores : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async writeScores(scores) {
    await mkdir(path.dirname(this.dataFile), { recursive: true });
    await writeFile(this.dataFile, `${JSON.stringify(scores, null, 2)}\n`, "utf8");
  }

  async getLeaderboard() {
    const scores = await this.readScores();
    scores.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
    return rankScores(scores.slice(0, this.maxScores));
  }

  async addScore({ gamertag, score, level, linesCleared }) {
    const entry = {
      gamertag: typeof gamertag === "string" && gamertag.trim() ? gamertag.trim().slice(0, 20) : "Player",
      score,
      level,
      linesCleared,
      date: new Date().toISOString(),
    };
    const scores = await this.readScores();
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
    const trimmedScores = scores.slice(0, this.maxScores);
    await this.writeScores(trimmedScores);
    return rankScores(trimmedScores);
  }

  async clearScores() {
    await this.writeScores([]);
  }
}
