-- Dashboard Preferences for Owner Customizable Dashboard
-- Each owner can configure which widgets appear and their order

CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  widget_key TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, widget_key)
);

-- Enable RLS
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Owner can only see/edit their own preferences
CREATE POLICY "own_dashboard_prefs" ON dashboard_preferences
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_dashboard_prefs_user ON dashboard_preferences(user_id);