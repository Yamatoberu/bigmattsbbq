CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, owner TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  issue INTEGER NOT NULL,
  issue_url TEXT NOT NULL,
  branch TEXT NOT NULL,
  worktree TEXT NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL,
  session TEXT,
  progress TEXT NOT NULL DEFAULT '',
  heartbeat INTEGER,
  started INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  retries INTEGER NOT NULL DEFAULT 0,
  retry_at INTEGER,
  error_kind TEXT,
  blocker TEXT,
  question TEXT,
  answer TEXT,
  pr INTEGER,
  pr_url TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_unfinished_execution ON executions ((1))
WHERE status NOT IN ('completed', 'awaiting_review', 'failed', 'waiting_business', 'waiting_technical');
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  execution TEXT,
  event TEXT NOT NULL,
  details TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution TEXT NOT NULL,
  kind TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  source TEXT,
  created INTEGER NOT NULL
);
