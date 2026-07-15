-- Kizen Education CRM — Auth sync trigger

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'counselor'),
    TRUE
  )
  ON CONFLICT (email) DO UPDATE SET auth_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY avatars_select ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY avatars_insert ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid() IS NOT NULL
);
CREATE POLICY avatars_update ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY documents_select ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND get_user_role() IS NOT NULL
);
CREATE POLICY documents_insert ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND get_user_role() IN ('owner','admin','counselor','faculty','accounts')
);
CREATE POLICY documents_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'documents' AND get_user_role() IN ('owner','admin')
);