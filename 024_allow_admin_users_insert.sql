-- Allow admins to insert and update users (necessary for adding faculty records)
DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin')
);

DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users FOR UPDATE USING (
  get_user_role() IN ('owner', 'admin') OR auth_id = auth.uid()
);
