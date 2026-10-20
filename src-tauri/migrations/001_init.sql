CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'mixed', 'todo')),
  title TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX idx_notes_archived ON notes (is_archived);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  relative_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE note_blocks (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'todo')),
  content TEXT NOT NULL DEFAULT '',
  asset_id TEXT REFERENCES assets (id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_note_blocks_note ON note_blocks (note_id, sort_order);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
