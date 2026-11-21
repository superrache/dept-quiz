-- Meilleurs scores par jeu
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game       TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  score      INTEGER NOT NULL CHECK (score >= 0),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores (game, score DESC);

-- Limitation de débit des envois de scores.
-- `client` = empreinte SHA-256 de l'IP ; lignes purgées après la fenêtre (10 min).
CREATE TABLE IF NOT EXISTS submissions (
  client     TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_client ON submissions (client, created_at);
