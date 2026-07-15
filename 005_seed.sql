-- Kizen Education CRM — Seed data

INSERT INTO courses (name, duration_hours, duration_days, total_fee) VALUES
('AI Foundations + Applications (Phase 2)', 60, 15, 45000),
('AI Applications Track (Phase 1)', 30, 8, 25000),
('Digital Marketing with AI', 30, 8, 20000),
('Vibe Coding (No Code)', 20, 5, 15000);

INSERT INTO system_settings (key, value) VALUES
('crm_name', 'Kizen Education CRM'),
('logo_url', '');

-- After creating Owner in Supabase Auth, run:
-- UPDATE users SET role = 'owner', is_owner = TRUE, name = 'Shivam'
-- WHERE email = 'your-owner-email@example.com';