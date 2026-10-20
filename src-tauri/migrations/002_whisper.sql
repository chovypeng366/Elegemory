CREATE TABLE daily_feedback_stats (
  workday_key TEXT PRIMARY KEY,
  note_created_count INTEGER NOT NULL DEFAULT 0,
  todo_created_count INTEGER NOT NULL DEFAULT 0,
  daily_mood TEXT NOT NULL DEFAULT 'Warm',
  updated_at INTEGER NOT NULL
);

CREATE TABLE whisper_history (
  id TEXT PRIMARY KEY,
  phrase_id TEXT NOT NULL,
  category TEXT NOT NULL,
  note_type TEXT NOT NULL,
  shown_at INTEGER NOT NULL,
  workday_key TEXT NOT NULL
);

CREATE INDEX idx_whisper_history_shown_at ON whisper_history (shown_at DESC);
CREATE INDEX idx_whisper_history_workday ON whisper_history (workday_key);
