-- Add backup tracking table
CREATE TABLE IF NOT EXISTS backup_tracking (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_backup_time TEXT,
  backup_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Initialize backup tracking if not exists
INSERT OR IGNORE INTO backup_tracking (id, last_backup_time, backup_count, created_at, updated_at)
VALUES (1, NULL, 0, datetime('now'), datetime('now'));

UPDATE schema_migrations SET version = 6 WHERE version = 5;