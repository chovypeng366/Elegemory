ALTER TABLE notes ADD COLUMN last_opened_at INTEGER;

CREATE TABLE note_links (
  id TEXT PRIMARY KEY,
  note_a_id TEXT NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
  note_b_id TEXT NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'manual'
    CHECK (created_by IN ('manual', 'suggested')),
  UNIQUE (note_a_id, note_b_id),
  CHECK (note_a_id < note_b_id)
);

CREATE INDEX idx_note_links_a ON note_links (note_a_id);
CREATE INDEX idx_note_links_b ON note_links (note_b_id);
