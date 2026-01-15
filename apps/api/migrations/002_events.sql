CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
