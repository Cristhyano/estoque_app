ALTER TABLE processed_events ADD COLUMN status TEXT NOT NULL DEFAULT 'processing';
ALTER TABLE processed_events ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_processed_events_status ON processed_events (status);
