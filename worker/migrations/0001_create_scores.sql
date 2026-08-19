CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gamertag TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  lines_cleared INTEGER NOT NULL,
  date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS scores_ranking_index ON scores (score DESC, date ASC);
