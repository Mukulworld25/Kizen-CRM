-- Kizen CRM - Migration 028: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE (auth_id = auth.uid() OR id = auth.uid()) AND (is_owner = true OR role = 'owner'))
  );

-- Allow authenticated users to insert notifications
CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE (auth_id = auth.uid() OR id = auth.uid()) AND (is_owner = true OR role = 'owner'))
  );
