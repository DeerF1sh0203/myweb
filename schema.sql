-- Cloudflare D1 · 鹿鱼集公开留言板
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  is_visible INTEGER NOT NULL DEFAULT 1,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_visible_created
  ON messages (is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_ip_created
  ON messages (ip_hash, created_at DESC);
